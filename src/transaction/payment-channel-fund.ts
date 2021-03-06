import * as utils from './utils'
import {validate, iso8601ToRippleTime, xlaToDrops} from '../common'
import {Instructions, Prepare, TransactionJSON} from './types'
import {RippleAlphaAPI} from '..'

export type PaymentChannelFund = {
  channel: string,
  amount: string,
  expiration?: string
}

function createPaymentChannelFundTransaction(account: string,
  fund: PaymentChannelFund
): TransactionJSON {
  const txJSON: TransactionJSON = {
    Account: account,
    TransactionType: 'PaymentChannelFund',
    Channel: fund.channel,
    Amount: xlaToDrops(fund.amount)
  }

  if (fund.expiration !== undefined) {
    txJSON.Expiration = iso8601ToRippleTime(fund.expiration)
  }

  return txJSON
}

function preparePaymentChannelFund(this: RippleAlphaAPI, address: string,
  paymentChannelFund: PaymentChannelFund,
  instructions: Instructions = {}
): Promise<Prepare> {
  try {
    validate.preparePaymentChannelFund(
      {address, paymentChannelFund, instructions})
    const txJSON = createPaymentChannelFundTransaction(
      address, paymentChannelFund)
    return utils.prepareTransaction(txJSON, this, instructions)
  } catch (e) {
    return Promise.reject(e)
  }
}

export default preparePaymentChannelFund
