import type { CardInfo } from 's-otk-js/out/cardsList'
import Decimal from 'decimal.js'
import type SOTKAPI from 's-otk-js'

export default async function getBalance(SOTK: SOTKAPI, cardID: string): Promise<
  { success: true, balance: Decimal } 
  | { success: false, error: 'CARD_FETCH_ERROR' | 'BALANCE_INVALID' }
> {
  let cardInfo: CardInfo
  try {
    cardInfo = await SOTK.getCardInfo(cardID)
  } catch(e) {
    return { success: false, error: 'CARD_FETCH_ERROR' }
  }

  const cardBalance = Number(cardInfo.balance)
  if(typeof cardInfo.balance === 'string' && Number.isFinite(cardBalance)) {
    return { success: true, balance: new Decimal(cardInfo.balance) }
  } else {
    return { success: false, error: 'BALANCE_INVALID' }
  }
}