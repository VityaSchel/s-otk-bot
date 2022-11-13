import TelegramBot from 'node-telegram-bot-api'
import { bot } from './index'

export async function unlinkCard(user: TelegramBot.User, messageID: number, cardID: string) {
  bot.editMessageText('Карта успешно отвязана от бота!', { 
    chat_id: user.id, 
    message_id: messageID, 
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Назад', callback_data: 'cards_list' }],
      ]
    }
  })
}