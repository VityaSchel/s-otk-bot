import './.env'
import TelegramBot from 'node-telegram-bot-api'
import sendGreetings from './greetings'
import sendMyCards from './myCardsList'
import { fallbackToCardNumber, unlinkCard } from './cardsList'
import SOTKAPI from 's-otk-js'
import fs from 'fs/promises'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'

if(!process.env.TELEGRAM_BOT_API_TOKEN) throw new Error('Set TELEGRAM_BOT_API_TOKEN env variable!')
export const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_TOKEN, { polling: true })

if(!process.env.SOTK_USERNAME || !process.env.SOTK_PASSWORD) throw new Error('Set SOTK_USERNAME and SOTK_PASSWORD env variables!')
export const SOTK = new SOTKAPI()
await SOTK.login({ 
  username: process.env.SOTK_USERNAME,
  password: process.env.SOTK_PASSWORD
})
await fs.writeFile(__dirname + '../../session.json', JSON.stringify(SOTK.credentials), 'utf-8')

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

bot.on('callback_query', event => {
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
      }
    }
  }
})