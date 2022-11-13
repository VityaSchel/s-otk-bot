import TelegramBot, { InlineKeyboardMarkup } from 'node-telegram-bot-api'
import { bot } from './index'
import dedent from 'dedent'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { ru as ruLocale } from 'date-fns/locale/index.js'
import { getLinkedCards } from './cardsList'
import type { Card } from './db/schemas/Card'

export default async function sendMyCards(user: TelegramBot.User, callbackMessageID?: number) {
  const cardsList: Card[] = await getLinkedCards(user)
  
  const cardsListText = cardsList.length ? cardsList
    .map(card => dedent`• <b>Карта <pre>${card.number}</pre></b>
      <b>Последняя проверка:</b> <pre>${formatDistanceToNowStrict(card.lastChecked, { locale: ruLocale, addSuffix: true })}</pre>
      <b>Баланс:</b> <pre>${card.balance}₽</pre>
    `)
    .join('\n\n')
    : '<i>Не привязано еще ни одной карты</i>'

  const cardsListButtons: InlineKeyboardMarkup = {
    inline_keyboard: cardsList
      .map(card => [
        {
          text: `Отвязать ${card.number}`,
          callback_data: `unlink ${card.number}`
        },
        {
          text: 'Пополнить на 100₽',
          callback_data: `invoice ${card.number} 100`
        },
      ])
  }

  const text = `Привязанные карты:\n\n${cardsListText}`
  const options: { reply_markup?: TelegramBot.InlineKeyboardMarkup, parse_mode: 'HTML' } = { 
    reply_markup: cardsList.length ? cardsListButtons : undefined, 
    parse_mode: 'HTML' 
  }

  if(callbackMessageID) {
    bot.editMessageText(text, { chat_id: user.id, message_id: callbackMessageID, ...options })
  } else {
    bot.sendMessage(user.id, text, options)
  }
}