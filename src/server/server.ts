import * as common from '../common'
import {RippleAlphaAPI} from '..'

function isConnected(this: RippleAlphaAPI): boolean {
  return this.connection.isConnected()
}

function getLedgerVersion(this: RippleAlphaAPI): Promise<number> {
  return this.connection.getLedgerVersion()
}

function connect(this: RippleAlphaAPI): Promise<void> {
  return this.connection.connect()
}

function disconnect(this: RippleAlphaAPI): Promise<void> {
  return this.connection.disconnect()
}

function formatLedgerClose(ledgerClose: any): object {
  return {
    baseFeeXLA: common.dropsToXla(ledgerClose.fee_base),
    ledgerHash: ledgerClose.ledger_hash,
    ledgerVersion: ledgerClose.ledger_index,
    ledgerTimestamp: common.rippleTimeToISO8601(ledgerClose.ledger_time),
    reserveBaseXLA: common.dropsToXla(ledgerClose.reserve_base),
    reserveIncrementXLA: common.dropsToXla(ledgerClose.reserve_inc),
    transactionCount: ledgerClose.txn_count,
    validatedLedgerVersions: ledgerClose.validated_ledgers
  }
}

export {
  connect,
  disconnect,
  isConnected,
  getLedgerVersion,
  formatLedgerClose
}
