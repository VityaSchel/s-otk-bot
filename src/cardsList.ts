import TelegramBot from 'node-telegram-bot-api'
import getDB from './db/init'
import type { Card } from './db/schemas/Card'
import { bot } from './index'

export async function unlinkCard(user: TelegramBot.User, messageID: number, cardID: string) {
  if(await isCardLinked(user, cardID)) {
    const db = await getDB()
    await db.collection<Card>('cards').deleteOne({ userID: user.id, number: cardID })
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
  const db = await getDB()
  const cardExists = await db.collection<Card>('cards').findOne({ userID: user.id, number: cardID })
  return Boolean(cardExists)
}

export async function getLinkedCards(user: TelegramBot.User): Promise<Card[]> {
  const db = await getDB()
  return db.collection<Card>('cards').find({ userID: user.id }).toArray()
}

const MAX_LINKED_CARDS = 5
export async function fallbackToCardNumber(user: TelegramBot.User, cardID: string) {
  if(await isCardLinked(user, cardID)) {
    const db = await getDB()
    await db.collection<Card>('cards').deleteOne({ userID: user.id, number: cardID })
    await bot.sendMessage(user.id, `Карта ${cardID} была отвязана от бота, вы больше не получите уведомлений.`)
  } else {
    const cards = await getLinkedCards(user)
    if(cards.length >= MAX_LINKED_CARDS) {
      await bot.sendMessage(
        user.id, 
        'Вы привязали уже слишком много карт. Отвяжите одну из них в разделе «Мои карты», чтобы продолжить.'
      )
    } else {
      const card = { balance: '200.0' }
      const db = await getDB()
      await db.collection<Card>('cards').insertOne({ 
        userID: user.id, 
        number: cardID,
        lastChecked: new Date(),
        balance: card.balance
      })
      await bot.sendMessage(user.id, `Карта ${cardID} успешно привязана, теперь вы получаете уведомления! Чтобы отвязать ее, зайдите в раздел «Мои карты».`)
    }
  }
}