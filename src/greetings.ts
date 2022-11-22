import TelegramBot from 'node-telegram-bot-api'
import { bot } from './index'
import dedent from 'dedent'
import keyboard from './keyboardButtons'
import getDB from './db/init'

export default async function sendGreetings(user: TelegramBot.User, callbackMessageID?: number) {
  const text = dedent`Привет! Пришли мне номер своей карты от ОТК — и я буду отслеживать баланс на ней и присылать тебе уведомления, когда баланс приближается к нулю. Пришли мне номер карты еще раз — и я перестану отслеживать ее.
    
    Код бота: https://github.com/VityaSchel/s-otk-bot/
    Автор: @hlothdev`
  const options = { reply_markup: keyboard, disable_web_page_preview: true }

  const db = await getDB()
  await db.collection('users').updateOne({ userID: user.id }, { $set: { blocked: false }}, { upsert: true })

  if(callbackMessageID) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore-line
    bot.editMessageText(text, { chat_id: user.id, message_id: callbackMessageID, ...options })
  } else {
    bot.sendMessage(user.id, text, options)
  }
}