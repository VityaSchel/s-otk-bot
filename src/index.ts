import './.env'
import TelegramBot from 'node-telegram-bot-api'
import sendGreetings from './greetings'
import sendMyCards from './myCardsList'
import { unlinkCard } from './cardsList'

export const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_TOKEN as string, { polling: true })
bot.on('message', event => {
  if(event.chat.type !== 'private') return
  const user = event.from
  if(!user || user?.is_bot) return
  
  if(event.text === 'Мои карты' || event.text === '/settings') {
    sendMyCards(user)
  } else {
    sendGreetings(user)
  }
})
bot.on('callback_query', event => {
  bot.answerCallbackQuery(event.id)

  if(event.message && event.data) {
    if(event.data === 'cards_list') {
      sendMyCards(event.from, event.message.message_id)
    } else {
      const unlinkCardRegex = /^unlink (\d+)$/
      if(unlinkCardRegex.test(event.data)) {
        const cardID = event.data.match(unlinkCardRegex)?.[1]
        if(!cardID || !Number.isInteger(cardID)) return
        unlinkCard(event.from, event.message.message_id, cardID)
      }
    }
  }
})