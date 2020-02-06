import * as _ from 'lodash'
import * as utils from './utils'
const validate = utils.common.validate
const toRippledAmount = utils.common.toRippledAmount
const paymentFlags = utils.common.txFlags.Payment
const ValidationError = utils.common.errors.ValidationError
import {Instructions, Prepare, TransactionJSON} from './types'
import {Amount, Adjustment, MaxAdjustment,
  MinAdjustment, Memo} from '../common/types/objects'
import {xlaToDrops} from '../common'
import {RippleAlphaAPI} from '..'
import {getClassicAccountAndTag, ClassicAccountAndTag} from './utils'


export interface Payment {
  source: Adjustment | MaxAdjustment,
  destination: Adjustment | MinAdjustment,
  paths?: string,
  memos?: Array<Memo>,
  // A 256-bit hash that can be used to identify a particular payment
  invoiceID?: string,
  // A boolean that, if set to true, indicates that this payment should go
  // through even if the whole amount cannot be delivered because of a lack of
  // liquidity or funds in the source_account account
  allowPartialPayment?: boolean,
  // A boolean that can be set to true if paths are specified and the sender
  // would like the Ripple Network to disregard any direct paths from
  // the source_account to the destination_account. This may be used to take
  // advantage of an arbitrage opportunity or by gateways wishing to issue
  // balances from a hot wallet to a user who has mistakenly set a trustline
  // directly to the hot wallet
  noDirectRipple?: boolean,
  limitQuality?: boolean
}

function isMaxAdjustment(
  source: Adjustment | MaxAdjustment): source is MaxAdjustment {
    return (source as MaxAdjustment).maxAmount !== undefined
}

function isMinAdjustment(
  destination: Adjustment | MinAdjustment): destination is MinAdjustment {
    return (destination as MinAdjustment).minAmount !== undefined
}

function isXRPToXRPPayment(payment: Payment): boolean {
  const {source, destination} = payment
  const sourceCurrency = isMaxAdjustment(source)
      ? source.maxAmount.currency : source.amount.currency
  const destinationCurrency = isMinAdjustment(destination)
      ? destination.minAmount.currency : destination.amount.currency
  return (sourceCurrency === 'XLA' || sourceCurrency === 'drops') &&
         (destinationCurrency === 'XLA' || destinationCurrency === 'drops')
}

function isIOUWithoutCounterparty(amount: Amount): boolean {
  return amount && amount.currency !== 'XLA' && amount.currency !== 'drops'
    && amount.counterparty === undefined
}

function applyAnyCounterpartyEncoding(payment: Payment): void {
  // Convert blank counterparty to sender or receiver's address
  //   (Ripple convention for 'any counterparty')
  // https://developers.ripple.com/payment.html#special-issuer-values-for-sendmax-and-amount
  _.forEach([payment.source, payment.destination], adjustment => {
    _.forEach(['amount', 'minAmount', 'maxAmount'], key => {
      if (isIOUWithoutCounterparty(adjustment[key])) {
        adjustment[key].counterparty = adjustment.address
      }
    })
  })
}

function createMaximalAmount(amount: Amount): Amount {
  const maxXRPValue = '5000000000'
  const maxIOUValue = '9999999999999999e80'
  let maxValue
  if (amount.currency === 'XLA') {
    maxValue = maxXRPValue
  } else if (amount.currency === 'drops') {
    maxValue = xlaToDrops(maxXRPValue)
  } else {
    maxValue = maxIOUValue
  }
  return _.assign({}, amount, {value: maxValue})
}

/**
 * Given an address and tag:
 * 1. Get the classic account and tag;
 * 2. If a tag is provided:
 *    2a. If the address was an X-address, validate that the X-address has the expected tag;
 *    2b. If the address was a classic address, return `expectedTag` as the tag.
 * 3. If we do not want to use a tag in this case,
 *    set the tag in the return value to `undefined`.
 *
 * @param address The address to parse.
 * @param expectedTag If provided, and the `Account` is an X-address,
 *                    this method throws an error if `expectedTag`
 *                    does not match the tag of the X-address.
 * @returns {ClassicAccountAndTag}
 *          The classic account and tag.
 */
function validateAndNormalizeAddress(address: string, expectedTag: number | undefined): ClassicAccountAndTag {
  const classicAddress = getClassicAccountAndTag(address, expectedTag)
  classicAddress.tag = classicAddress.tag === false ? undefined : classicAddress.tag
  return classicAddress
}

function createPaymentTransaction(address: string, paymentArgument: Payment
): TransactionJSON {
  const payment = _.cloneDeep(paymentArgument)
  applyAnyCounterpartyEncoding(payment)

  const sourceAddressAndTag = validateAndNormalizeAddress(payment.source.address, payment.source.tag)
  const addressToVerifyAgainst = validateAndNormalizeAddress(address, undefined)

  if (addressToVerifyAgainst.classicAccount !== sourceAddressAndTag.classicAccount) {
    throw new ValidationError('address must match payment.source.address')
  }

  if (addressToVerifyAgainst.tag !== undefined &&
      sourceAddressAndTag.tag !== undefined &&
      addressToVerifyAgainst.tag !== sourceAddressAndTag.tag) {
    throw new ValidationError(
      'address includes a tag that does not match payment.source.tag')
  }

  const destinationAddressAndTag = validateAndNormalizeAddress(payment.destination.address, payment.destination.tag)

  if (
    (isMaxAdjustment(payment.source) && isMinAdjustment(payment.destination))
    ||
    (!isMaxAdjustment(payment.source) && !isMinAdjustment(payment.destination))
  ) {
    throw new ValidationError('payment must specify either (source.maxAmount '
      + 'and destination.amount) or (source.amount and destination.minAmount)')
  }

  const destinationAmount = isMinAdjustment(payment.destination)
    ? payment.destination.minAmount : payment.destination.amount
  const sourceAmount = isMaxAdjustment(payment.source)
    ? payment.source.maxAmount : payment.source.amount

  // when using destination.minAmount, ripple-alpha-core still requires that we set
  // a destination amount in addition to DeliverMin. the destination amount
  // is interpreted as the maximum amount to send. we want to be sure to
  // send the whole source amount, so we set the destination amount to the
  // maximum possible amount. otherwise it's possible that the destination
  // cap could be hit before the source cap.
  const amount =
    (isMinAdjustment(payment.destination) && !isXRPToXRPPayment(payment))
    ? createMaximalAmount(destinationAmount) : destinationAmount

  const txJSON: any = {
    TransactionType: 'Payment',
    Account: sourceAddressAndTag.classicAccount,
    Destination: destinationAddressAndTag.classicAccount,
    Amount: toRippledAmount(amount),
    Flags: 0
  }

  if (payment.invoiceID !== undefined) {
    txJSON.InvoiceID = payment.invoiceID
  }
  if (sourceAddressAndTag.tag !== undefined) {
    txJSON.SourceTag = sourceAddressAndTag.tag
  }
  if (destinationAddressAndTag.tag !== undefined) {
    txJSON.DestinationTag = destinationAddressAndTag.tag
  }
  if (payment.memos !== undefined) {
    txJSON.Memos = _.map(payment.memos, utils.convertMemo)
  }
  if (payment.noDirectRipple === true) {
    txJSON.Flags |= paymentFlags.NoRippleDirect
  }
  if (payment.limitQuality === true) {
    txJSON.Flags |= paymentFlags.LimitQuality
  }
  if (!isXRPToXRPPayment(payment)) {
    // Don't set SendMax for XLA->XLA payment
    // temREDUNDANT_SEND_MAX removed 

    if (payment.allowPartialPayment || isMinAdjustment(payment.destination)) {
      txJSON.Flags |= paymentFlags.PartialPayment
    }

    txJSON.SendMax = toRippledAmount(sourceAmount)

    if (isMinAdjustment(payment.destination)) {
      txJSON.DeliverMin = toRippledAmount(destinationAmount)
    }

    if (payment.paths !== undefined) {
      txJSON.Paths = JSON.parse(payment.paths)
    }
  } else if (payment.allowPartialPayment === true) {
    throw new ValidationError('XLA to XLA payments cannot be partial payments')
  }

  return txJSON
}

function preparePayment(this: RippleAlphaAPI, address: string, payment: Payment,
  instructions: Instructions = {}
): Promise<Prepare> {
  try {
    validate.preparePayment({address, payment, instructions})
    const txJSON = createPaymentTransaction(address, payment)
    return utils.prepareTransaction(txJSON, this, instructions)
  } catch (e) {
    return Promise.reject(e)
  }
}

export default preparePayment
