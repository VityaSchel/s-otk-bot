import TelegramBot from 'node-telegram-bot-api'

const keyboard: TelegramBot.ReplyKeyboardMarkup = {
  keyboard: [
    [{ text: 'Начать' }, { text: 'Мои карты' }, { text: 'Настройки оповещений' }]
  ],
  resize_keyboard: true
}

export default keyboard