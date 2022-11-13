import type { WithId } from 'mongodb'
import '../.env'
import getDB from '../db/init'
import type { Card } from '../db/schemas/Card'
import SOTKAPI from 's-otk-js'
import type { CardInfo } from 's-otk-js/out/cardsList'
import Decimal from 'decimal.js'
import TelegramBot from 'node-telegram-bot-api'

if(!process.env.SOTK_USERNAME || !process.env.SOTK_PASSWORD) throw new Error('Set SOTK_USERNAME and SOTK_PASSWORD env variables!')
if(!process.env.TELEGRAM_BOT_API_TOKEN) throw new Error('Set TELEGRAM_BOT_API_TOKEN env variable!')

const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_TOKEN)

const SOTK = new SOTKAPI()
await SOTK.login({ 
  username: process.env.SOTK_USERNAME,
  password: process.env.SOTK_PASSWORD
})

const db = await getDB()
const cursor = db.collection<Card>('cards').find({})
// TODO: Batch send results if encountered two same cardIDs in DB, without getting balance twice
let success = 0, errors = 0
while(await cursor.hasNext()) {
  const card = await cursor.next() as WithId<Card>
  
  const result = await getBalance(card.number)
  if(result.success) {
    success++
    Decimal.set({ precision: 2 })
    const threshold = new Decimal(16.6).times(4)
    if(result.balance.lessThanOrEqualTo(threshold)) {
      sendResult(card.userID, `Заканчиваются средства на карте ${card.number}! Остаток: ${card.balance.toString()}₽`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Пополнить на 50₽', callback_data: `invoice ${card.number} 50` }],
            [{ text: 'Пополнить на 100₽', callback_data: `invoice ${card.number} 100` }],
            [{ text: 'Пополнить на 200₽', callback_data: `invoice ${card.number} 200` }],
            [{ text: 'Отвязать карту', callback_data: `unlink ${card.number}` }]
          ]
        }
      })
    }
  } else {
    errors++
    switch(result.error) {
      case 'BALANCE_INVALID':
        sendResult(card.userID, 'Ошибка во время получения баланса: сервер s-otk.ru вернул некорректный формат боту. Попробуйте пополнить карту или привязать другую.')
        break

      case 'CARD_FETCH_ERROR':
        sendResult(card.userID, 'Ошибка во время получения баланса: сервер s-otk.ru вернул некорректный ответ боту. Попробуйте привязать карту заново.')
        break
    }
  }

  console.log('Checked card №', card.number, 'for id', card.userID, 'cardholder.')
}

console.log('Checked', success+errors, 'cards. Successfully:', success, 'Errors:', errors)

async function sendResult(userID: TelegramBot.User['id'], text: string, options?: TelegramBot.SendMessageOptions) {
  try {
    const result = await bot.sendMessage(userID, text, options)
  } catch(e) {
    const BOT_WAS_BLOCKED = 'ETELEGRAM: 403 Forbidden: bot was blocked by the user'
    const USER_IS_DEAD = 'ETELEGRAM: 403 Forbidden: user is deactivated'
    if(e?.message === BOT_WAS_BLOCKED || e?.message === USER_IS_DEAD) {
      console.log('User', userID, 'died, deleting their cards')
      await db.collection<Card>('cards').deleteMany({ userID })
    } else {
      console.error('Error while sending message to', userID, e?.message ?? e)
    }
  }
}

async function getBalance(cardID: string): Promise<{ success: true, balance: Decimal } | { success: false, error: 'CARD_FETCH_ERROR' | 'BALANCE_INVALID' }> {
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