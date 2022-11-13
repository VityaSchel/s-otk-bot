import TelegramBot from 'node-telegram-bot-api'

export type Card = {
  userID: TelegramBot.User['id']
  number: string
  lastChecked: Date
  balance: string
}