import './.env'
import TelegramBot from 'node-telegram-bot-api'
import sendGreetings from './greetings'
import sendMyCards from './myCardsList'
import { fallbackToCardNumber, unlinkCard } from './cardsList'
import SOTKAPI from 's-otk-js'
import fs from 'fs/promises'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { addRefetchUtil, SOTKAPIExtended } from './utils'

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'

if(!process.env.BOT_SOTK_USERNAME || !process.env.BOT_SOTK_PASSWORD) throw new Error('Set SOTK_USERNAME and SOTK_PASSWORD env variables!')
export const SOTK = new SOTKAPI() as SOTKAPIExtended
await SOTK.login({ 
  username: process.env.BOT_SOTK_USERNAME,
  password: process.env.BOT_SOTK_PASSWORD
})
addRefetchUtil(SOTK, __dirname + '../session.json', { username: process.env.BOT_SOTK_USERNAME, password: process.env.BOT_SOTK_PASSWORD })
await fs.writeFile(__dirname + '../session.json', JSON.stringify(SOTK.credentials), 'utf-8')
console.log('Logged into SOTK as', process.env.BOT_SOTK_USERNAME)

if(!process.env.TELEGRAM_BOT_API_TOKEN) throw new Error('Set TELEGRAM_BOT_API_TOKEN env variable!')
export const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_TOKEN, { polling: true })
console.log('Telegram bot started working!')

bot.on('message', event => {
  if(event.chat.type !== 'private') return
  const user = event.from
  if(!user || user?.is_bot) return
  if(!event.text) return
  
  if(event.text === 'Мои карты' || event.text === '/settings') {
    sendMyCards(user)
  } else if(event.text === 'Начать' || event.text.startsWith('/start')) {
    sendGreetings(user)
  } else if(/^(\d{9}|\d{19})$/.test(event.text)) {
    fallbackToCardNumber(user, event.text)
  } else {
    bot.sendMessage(user.id, 'Неправильный формат номера карты. Отправь цифры (9 или 19-значный номер) для привязки/отвязки карты.')
  }
})

bot.on('callback_query', async event => {
  bot.answerCallbackQuery(event.id)
  if(event.message && event.data) {
    if(event.data === 'cards_list') {
      sendMyCards(event.from, event.message.message_id)
    } else {
      const unlinkCardRegex = /^unlink (\d{9}|\d{19})$/
      if(unlinkCardRegex.test(event.data)) {
        const cardID = event.data.match(unlinkCardRegex)?.[1]
        if(!cardID) return
        unlinkCard(event.from, event.message.message_id, cardID)
      } else {
        const createInvoiceRegex = /^invoice (\d{9}|\d{19}) (50|100|200)$/
        if(createInvoiceRegex.test(event.data)) {
          const cardID = event.data.match(createInvoiceRegex)?.[1]
          const sum = event.data.match(createInvoiceRegex)?.[2]
          if(!cardID || !sum) return
          const message = await bot.sendMessage(event.from.id, `⌛️ Генерирую счет на ${sum}₽...`)
          try {
            const invoice = await SOTK.createInvoice(cardID, Number(sum) * 100)
            if(invoice.formUrl) {
              await bot.editMessageText(`Счет для оплаты карты ${cardID} на сумму ${sum}₽ сгенерирован!`, {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Оплатить на SberPay', url: invoice.formUrl }]
                  ]
                },
                chat_id: event.from.id, 
                message_id: message.message_id
              })
            } else {
              throw 'no_url'
            }
          } catch(e) {
            if(e !== 'no_url') console.error('Error while creating invoice for', event.from.id, e?.message ?? e)
            await bot.editMessageText('Не удалось создать счет :(', { chat_id: event.from.id, message_id: message.message_id })
          }
        }
      }
    }
  }
})