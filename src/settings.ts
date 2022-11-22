import TelegramBot from 'node-telegram-bot-api'
import { bot } from './index'
import dedent from 'dedent'
import keyboard from './keyboardButtons'

export default async function sendSettings(user: TelegramBot.User, callbackMessageID?: number) {
  const text = dedent`Вы в разделе «Настройки оповещений».
    
  Выберете ниже порог остатка на карте для уведомления (в рублях):`
  // Введите порог остатка на карте для уведомления (в рублях) или выберете ниже:

  const options = { 
    reply_markup: {
      inline_keyboard: [
        [
          { text: '66.4 (16.6₽*2*2)', callback_data: 'set_notification_threshold 66.4' },
          { text: '132.8 (16.6₽*4*2)', callback_data: 'set_notification_threshold 132.8' },
        ],
        [
          { text: '68 (17₽*2*2)', callback_data: 'set_notification_threshold 68' },
          { text: '136 (17₽*4*2)', callback_data: 'set_notification_threshold 136' },
        ],
        [
          { text: 'Отмена', callback_data: 'start' }
        ]
      ]
    }
  }

  if(callbackMessageID) {
    bot.editMessageText(text, { chat_id: user.id, message_id: callbackMessageID, ...options })
  } else {
    bot.sendMessage(user.id, text, options)
  }
}