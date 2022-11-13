import TelegramBot from 'node-telegram-bot-api'
import { bot } from './index'
import dedent from 'dedent'
import keyboard from './keyboardButtons'

export default async function sendGreetings(user: TelegramBot.User) {
  bot.sendMessage(
    user.id, 
    dedent`Привет! Пришли мне номер своей карты от ОТК — и я буду отслеживать баланс на ней и присылать тебе уведомления, когда баланс приближается к нулю. Пришли мне номер карты еще раз — и я перестану отслеживать ее.
    
    Код бота: https://github.com/VityaSchel/s-otk-bot/
    Автор: @hlothdev`,
    { reply_markup: keyboard, disable_web_page_preview: true }
  )
}