import * as _ from 'lodash'
import binary from 'ripple-binary-codec';
import {computeTransactionHash} from '../common/hashes'
import * as utils from './utils'
import parseTransaction from './parse/transaction'
import getTransaction from './transaction'
import {validate, errors, Connection, ensureClassicAddress} from '../common'
import {FormattedTransactionType} from '../transaction/types'
import {RippleAPI} from '..'

export type TransactionsOptions = {
  start?: string,
  limit?: number,
  minLedgerVersion?: number,
  maxLedgerVersion?: number,
  earliestFirst?: boolean,
  excludeFailures?: boolean,
  initiated?: boolean,
  counterparty?: string,
  types?: Array<string>,
  includeRawTransactions?: boolean,
  binary?: boolean,
  startTx?: FormattedTransactionType
}

export type GetTransactionsResponse = Array<FormattedTransactionType>

function parseBinaryTransaction(transaction) {
  const tx = binary.decode(transaction.tx_blob)
  tx.hash = computeTransactionHash(tx)
  tx.ledger_index = transaction.ledger_index
  return {
    tx: tx,
    meta: binary.decode(transaction.meta),
    validated: transaction.validated
  }
}

function parseAccountTxTransaction(tx, includeRawTransaction: boolean) {
  const _tx = tx.tx_blob ? parseBinaryTransaction(tx) : tx
  // rippled uses a different response format for 'account_tx' than 'tx'
  return parseTransaction(_.assign({}, _tx.tx,
    {meta: _tx.meta, validated: _tx.validated}), includeRawTransaction)
}

function counterpartyFilter(filters, tx: FormattedTransactionType) {
  if (tx.address === filters.counterparty) {
    return true
  }
  const specification: any = tx.specification
  if (specification && ((specification.destination &&
        specification.destination.address === filters.counterparty) ||
      (specification.counterparty === filters.counterparty))) {
        return true
  }
  return false
}

function transactionFilter(address: string, filters: TransactionsOptions,
  tx: FormattedTransactionType
) {
  if (filters.excludeFailures && tx.outcome.result !== 'tesSUCCESS') {
    return false
  }
  if (filters.types && !_.includes(filters.types, tx.type)) {
    return false
  }
  if (filters.initiated === true && tx.address !== address) {
    return false
  }
  if (filters.initiated === false && tx.address === address) {
    return false
  }
  if (filters.counterparty && !counterpartyFilter(filters, tx)) {
    return false
  }
  return true
}

function orderFilter(
  options: TransactionsOptions, tx: FormattedTransactionType
) {
  return !options.startTx || (options.earliestFirst ?
    utils.compareTransactions(tx, options.startTx) > 0 :
    utils.compareTransactions(tx, options.startTx) < 0)
}

function formatPartialResponse(address: string,
  options: TransactionsOptions, data
) {
  const parse = tx =>
    parseAccountTxTransaction(tx, options.includeRawTransactions)
  return {
    marker: data.marker,
    results: data.transactions
      .filter(tx => tx.validated)
      .map(parse)
      .filter(_.partial(transactionFilter, address, options))
      .filter(_.partial(orderFilter, options))
  }
}

function getAccountTx(connection: Connection, address: string,
  options: TransactionsOptions, marker: string, limit: number
) {
  const request = {
    command: 'account_tx',
    account: address,
    // -1 is equivalent to earliest available validated ledger
    ledger_index_min: options.minLedgerVersion || -1,
    // -1 is equivalent to most recent available validated ledger
    ledger_index_max: options.maxLedgerVersion || -1,
    forward: options.earliestFirst,
    binary: options.binary,
    limit: utils.clamp(limit, 10, 400),
    marker: marker
  }

  return connection.request(request).then(response =>
    formatPartialResponse(address, options, response))
}

function checkForLedgerGaps(connection: Connection,
  options: TransactionsOptions, transactions: GetTransactionsResponse
) {
  let {minLedgerVersion, maxLedgerVersion} = options

  // if we reached the limit on number of transactions, then we can shrink
  // the required ledger range to only guarantee that there are no gaps in
  // the range of ledgers spanned by those transactions
  if (options.limit && transactions.length === options.limit) {
    if (options.earliestFirst) {
      maxLedgerVersion = _.last(transactions)!.outcome.ledgerVersion
    } else {
      minLedgerVersion = _.last(transactions)!.outcome.ledgerVersion
    }
  }

  return utils.hasCompleteLedgerRange(connection, minLedgerVersion,
    maxLedgerVersion).then(hasCompleteLedgerRange => {
    if (!hasCompleteLedgerRange) {
      throw new errors.MissingLedgerHistoryError()
    }
  })
}

function formatResponse(connection: Connection, options: TransactionsOptions,
  transactions: GetTransactionsResponse
) {
  const compare = options.earliestFirst ? utils.compareTransactions :
    _.rearg(utils.compareTransactions, 1, 0)
  const sortedTransactions = transactions.sort(compare)
  return checkForLedgerGaps(connection, options, sortedTransactions).then(
    () => sortedTransactions)
}

function getTransactionsInternal(connection: Connection, address: string,
  options: TransactionsOptions
): Promise<GetTransactionsResponse> {
  const getter = _.partial(getAccountTx, connection, address, options)
  const format = _.partial(formatResponse, connection, options)
  return utils.getRecursive(getter, options.limit).then(format)
}

function getTransactions(this: RippleAPI, address: string, options: TransactionsOptions = {}
): Promise<GetTransactionsResponse> {
  validate.getTransactions({address, options})

  // Only support retrieving transactions without a tag,
  // since we currently do not filter transactions based
  // on tag. Apps must interpret and use tags
  // independently, filtering transactions if needed.
  address = ensureClassicAddress(address)

  const defaults = {maxLedgerVersion: -1}
  if (options.start) {
    return getTransaction.call(this, options.start).then(tx => {
      const ledgerVersion = tx.outcome.ledgerVersion
      const bound = options.earliestFirst ?
        {minLedgerVersion: ledgerVersion} : {maxLedgerVersion: ledgerVersion}
      const startOptions = _.assign({}, defaults, options, {startTx: tx}, bound)
      return getTransactionsInternal(this.connection, address, startOptions)
    })
  }
  const newOptions = _.assign({}, defaults, options)
  return getTransactionsInternal(this.connection, address, newOptions)
}

export default getTransactions
