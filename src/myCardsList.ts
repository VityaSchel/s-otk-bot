import TelegramBot, { InlineKeyboardMarkup } from 'node-telegram-bot-api'
import { bot } from './index'
import dedent from 'dedent'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { ru as ruLocale } from 'date-fns/locale/index.js'

type Card = {
  number: string
  lastChecked: Date
  balance: string
}
export default function sendMyCards(user: TelegramBot.User, callbackMessageID?: number) {
  const cardsList: Card[] = [{ number: '123456789', lastChecked: new Date(Date.now() - 1000*60*60), balance: '100' }]
  
  const cardsListText = cardsList
    .map(card => dedent`• <b>Карта <pre>${card.number}</pre></b>
      <b>Последняя проверка:</b> <pre>${formatDistanceToNowStrict(card.lastChecked, { locale: ruLocale, addSuffix: true })}</pre>
      <b>Баланс:</b> <pre>${card.balance}</pre>
    `)

  const cardsListButtons: InlineKeyboardMarkup = {
    inline_keyboard: cardsList
      .map(card => [{
        text: card.number,
        callback_data: `unlink ${card.number}`
      }])
  }

  const text = `Привязанные карты:\n\n${cardsListText}\n\nВыбери карту ниже, чтобы отвязать её:`
  const options: { reply_markup: TelegramBot.InlineKeyboardMarkup, parse_mode: 'HTML' } = { reply_markup: cardsListButtons, parse_mode: 'HTML' }

  if(callbackMessageID) {
    bot.editMessageText(text, { chat_id: user.id, message_id: callbackMessageID, ...options })
  } else {
    bot.sendMessage(user.id, text, options)
  }
}