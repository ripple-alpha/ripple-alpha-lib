import keypairs from 'ripple-alpha-keypairs'
import binary from 'ripple-binary-codec'
import {validate, xlaToDrops} from '../common'

function verifyPaymentChannelClaim(channel: string, amount: string,
  signature: string, publicKey: string
): boolean {
  validate.verifyPaymentChannelClaim({channel, amount, signature, publicKey})

  const signingData = binary.encodeForSigningClaim({
    channel: channel,
    amount: xlaToDrops(amount)
  })
  return keypairs.verify(signingData, signature, publicKey)
}

export default verifyPaymentChannelClaim
