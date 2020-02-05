
import BigNumber from 'bignumber.js'
import {dropsToXla} from '../../common'

function parseFeeUpdate(tx: any) {
  const baseFeeDrops = (new BigNumber(tx.BaseFee, 16)).toString()
  return {
    baseFeeXLA: dropsToXla(baseFeeDrops),
    referenceFeeUnits: tx.ReferenceFeeUnits,
    reserveBaseXLA: dropsToXla(tx.ReserveBase),
    reserveIncrementXLA: dropsToXla(tx.ReserveIncrement)
  }
}

export default parseFeeUpdate
