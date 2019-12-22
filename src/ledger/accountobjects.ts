import {removeUndefined} from '../common'
import {RippleAPI} from '..'
import {
  GetAccountObjectsOptions,
  AccountObjectsResponse
} from '../common/types/commands/account_objects'

export default async function getAccountObjects(
  this: RippleAPI,
  address: string,
  options: GetAccountObjectsOptions = {}
): Promise<AccountObjectsResponse> {
  // Don't validate the options so that new types can be passed
  // through to rippled. rippled validates requests.

  // Make Request
  const response = await this.request('account_objects', removeUndefined({
    account: address,
    type: options.type,
    ledger_hash: options.ledgerHash,
    ledger_index: options.ledgerIndex,
    limit: options.limit,
    marker: options.marker
  }))
  // Return Response
  return response
}
