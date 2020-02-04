
import BigNumber from 'bignumber.js'
import {dropsToXrp} from '../../common'

function parseFeeUpdate(tx: any) {
  const baseFeeDrops = (new BigNumber(tx.BaseFee, 16)).toString()
  return {
    baseFeeXLA: dropsToXrp(baseFeeDrops),
    referenceFeeUnits: tx.ReferenceFeeUnits,
    reserveBaseXLA: dropsToXrp(tx.ReserveBase),
    reserveIncrementXLA: dropsToXrp(tx.ReserveIncrement)
  }
}

export default parseFeeUpdate
