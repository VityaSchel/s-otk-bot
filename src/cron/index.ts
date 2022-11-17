import type { WithId } from 'mongodb'
import '../.env'
import getDB, { dbConnection } from '../db/init'
import type { Card } from '../db/schemas/Card'
import SOTKAPI from 's-otk-js'
import Decimal from 'decimal.js'
Decimal.set({ precision: 1 })
import TelegramBot from 'node-telegram-bot-api'
import fs from 'fs/promises'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import getBalance from '../getCardBalance'
import { addRefetchUtil, SOTKAPIExtended } from '../utils'

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'

if(!process.env.TELEGRAM_BOT_API_TOKEN) throw new Error('Set TELEGRAM_BOT_API_TOKEN env variable!')

const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_TOKEN)

console.log('Worker started!')

const SOTK = new SOTKAPI() as SOTKAPIExtended
addRefetchUtil(SOTK, __dirname + '../../session.json')
const sessionRaw = await fs.readFile(__dirname + '../../session.json', 'utf-8')
const session = JSON.parse(sessionRaw) as typeof SOTK.credentials
SOTK.credentials = session

console.log('Logged in as', process.env.SOTK_USERNAME)

for(const card of await SOTK.getCards()) {
  await card.delete()
}

const db = await getDB()
const cursor = db.collection<Card>('cards').find({})
// TODO: Batch send results if encountered two same cardIDs in DB, without getting balance twice
// Attempt to fix this issue
const balances: { [key: Card['number']]: Decimal } = {}
let success = 0, errors = 0
while(await cursor.hasNext()) {
  const card = await cursor.next() as WithId<Card>
  
  const successBalanceReceived = async (balance: Decimal) => {
    success++
    balances[card.number] = balance
    const threshold = new Decimal(16.6).times(4)
    if(balance.lessThanOrEqualTo(threshold)) {
      await sendResult(card.userID, `Заканчиваются средства на карте ${card.number}! Остаток: ${card.balance.toString()}₽`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Пополнить на 50₽', callback_data: `invoice ${card.number} 50` },
              { text: 'Пополнить на 100₽', callback_data: `invoice ${card.number} 100` }
            ],
            [
              { text: 'Пополнить на 200₽', callback_data: `invoice ${card.number} 200` },
              { text: 'Отвязать карту', callback_data: `unlink ${card.number}` }
            ]
          ]
        }
      })
    }
  }

  if(balances[card.number]) {
    successBalanceReceived(balances[card.number])
  } else {
    const result = await getBalance(SOTK, card.number)
    if(result.success) {
      successBalanceReceived(result.balance)
      await db.collection<Card>('cards').updateMany({
        number: card.number
      }, {
        $set: {
          lastChecked: new Date(),
          balance: result.balance.toString()
        }
      })
    } else {
      errors++
      switch(result.error) {
        case 'BALANCE_INVALID':
          await sendResult(card.userID, 'Ошибка во время получения баланса: сервер s-otk.ru вернул некорректный формат боту. Попробуйте пополнить карту или привязать другую.')
          break
  
        case 'CARD_FETCH_ERROR':
          await sendResult(card.userID, 'Ошибка во время получения баланса: сервер s-otk.ru вернул некорректный ответ боту. Попробуйте привязать карту заново.')
          break
      }
    }
  }

  console.log('Checked card №', card.number, 'for id', card.userID, 'cardholder.')
}

console.log('Checked', success+errors, 'cards. Successfully:', success, 'Errors:', errors)
await dbConnection.close()
// await bot.close()
process.exit(0)

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

