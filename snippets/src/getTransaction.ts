import {RippleAlphaAPI} from '../../dist/npm'

const api = new RippleAlphaAPI({
  server: 'wss://s1.ripplealpha.com:6005'
})

getTransaction()

async function getTransaction() {
  await api.connect()
  const ledger = await api.getLedger({includeTransactions: true})
  console.log(ledger)
  const tx = await api.getTransaction(ledger.transactionHashes[0])
  console.log(tx)
  console.log('deliveredAmount:', tx.outcome.deliveredAmount)
  process.exit(0)
}
