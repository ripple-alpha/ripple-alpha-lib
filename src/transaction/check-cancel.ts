import {prepareTransaction} from './utils'
import {validate} from '../common'
import {Instructions, Prepare, TransactionJSON} from './types'
import {RippleAPI} from '..'

export type CheckCancelParameters = {
  checkID: string
}

function createCheckCancelTransaction(account: string,
  cancel: CheckCancelParameters
): TransactionJSON {
  const txJSON = {
    Account: account,
    TransactionType: 'CheckCancel',
    CheckID: cancel.checkID
  }

  return txJSON
}

function prepareCheckCancel(this: RippleAPI, address: string,
  checkCancel: CheckCancelParameters,
  instructions: Instructions = {}
): Promise<Prepare> {
  try {
    validate.prepareCheckCancel(
      {address, checkCancel, instructions})
    const txJSON = createCheckCancelTransaction(
      address, checkCancel)
    return prepareTransaction(txJSON, this, instructions)
  } catch (e) {
    return Promise.reject(e)
  }
}

export default prepareCheckCancel
