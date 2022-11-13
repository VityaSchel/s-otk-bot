import type { WithId } from 'mongodb'
import '../.env'
import getDB from '../db/init'
import type { Card } from '../db/schemas/Card'
import SOTKAPI from 's-otk-js'
import type { CardInfo } from 's-otk-js/out/cardsList'
import Decimal from 'decimal.js'

if(!process.env.SOTK_USERNAME || !process.env.SOTK_PASSWORD) throw new Error('Set SOTK_USERNAME and SOTK_PASSWORD env variables!')

const SOTK = new SOTKAPI()
await SOTK.login({ 
  username: process.env.SOTK_USERNAME,
  password: process.env.SOTK_PASSWORD
})

const db = await getDB()
const cursor = db.collection<Card>('cards').find({})
// TODO: Batch send results if encountered two same cardIDs in DB, without getting balance twice
while(await cursor.hasNext()) {
  const card = await cursor.next() as WithId<Card>
  
  const result = await getBalance(card.number)
  if(result.success) {
    Decimal.set({ precision: 2 })
    const threshold = new Decimal(16.6).times(4)
    new Decimal() threshold
  } else {
    switch(result.error) {
      case 'BALANCE_INVALID':
        sendResult(card.userID, 'Ошибка во время получения баланса: сервер s-otk.ru вернул некорректный формат боту. Попробуйте пополнить карту или привязать другую.')
        break

      case 'CARD_FETCH_ERROR':
        sendResult(card.userID, 'Ошибка во время получения баланса: сервер s-otk.ru вернул некорректный ответ боту. Попробуйте привязать карту заново.')
        break
    }
  }
}

async function getBalance(cardID: string): Promise<{ success: true, balance: number } | { success: false, error: 'CARD_FETCH_ERROR' | 'BALANCE_INVALID' }> {
  let cardInfo: CardInfo
  try {
    cardInfo = await SOTK.getCardInfo(cardID)
  } catch(e) {
    return { success: false, error: 'CARD_FETCH_ERROR' }
  }

  const cardBalance = Number(cardInfo.balance)
  if(typeof cardInfo.balance === 'string' && Number.isFinite(cardBalance)) {
    return { success: true, balance: cardBalance }
  } else {
    return { success: false, error: 'BALANCE_INVALID' }
  }
}