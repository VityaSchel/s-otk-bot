import TelegramBot from 'node-telegram-bot-api'
import { bot } from './index'

export async function unlinkCard(user: TelegramBot.User, messageID: number, cardID: string) {
  if(await isCardLinked(user, cardID)) {
    // MOCK
    bot.editMessageText('Карта успешно отвязана от бота!', { 
      chat_id: user.id, 
      message_id: messageID, 
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Назад', callback_data: 'cards_list' }],
        ]
      }
    })
  } else {
    bot.editMessageText('Карта не привязана к боту', { 
      chat_id: user.id, 
      message_id: messageID, 
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Назад', callback_data: 'cards_list' }],
        ]
      }
    })
  }
}

export async function isCardLinked(user: TelegramBot.User, cardID: string): Promise<boolean> {
  return cardID === '123456789' // MOCK
}

export async function fallbackToCardNumber(user: TelegramBot.User, cardID: string) {
  if(await isCardLinked(user, cardID)) {
    // MOCK
    await bot.sendMessage(user.id, `Карта ${cardID} была отвязана от бота, вы больше не получите уведомлений.`)
  } else {
    // MOCK
    await bot.sendMessage(user.id, `Карта ${cardID} успешно привязана, теперь вы получаете уведомления! Чтобы отвязать ее, зайдите в раздел «Мои карты».`)
  }
}