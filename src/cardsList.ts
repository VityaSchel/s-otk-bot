import TelegramBot from 'node-telegram-bot-api'
import getDB from './db/init'
import type { Card } from './db/schemas/Card'
import getBalance from './getCardBalance'
import { bot, SOTK } from './index'

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
    await bot.sendMessage(user.id, `Карта ${cardID} была отвязана от бота, ты больше не получишь уведомлений о ней.`)
  } else {
    const cards = await getLinkedCards(user)
    if(cards.length >= MAX_LINKED_CARDS) {
      await bot.sendMessage(
        user.id, 
        'Ты уже привязал слишком много карт. Отвяжи одну из них в разделе «Мои карты», чтобы продолжить.'
      )
    } else {
      const db = await getDB()
      const existing = await db.collection<Card>('cards').findOne({ number: cardID })
      // if(existing) {
      //   await bot.sendMessage(user.id, `Кто-то другой уже привязал карту ${cardID}. Следи за обновлениями бота, чтобы не пропустить момент, когда станет доступна возможность отслеживания одной карты несколькими людьми!`)
      //   return
      // }

      const message = await bot.sendMessage(user.id, `⌛️ Добавляю карту ${cardID}...`)
      let card: Awaited<ReturnType<typeof getBalance>>
      try {
        card = await getBalance(SOTK, cardID)
        if(!card.success) throw card.error
      } catch(e) {
        console.error('Unable to link card', cardID, user.id, e?.message ?? e)
        await bot.editMessageText(`Не удалось привязать карту ${cardID}. Проверь правильность написания номера карты.`, { chat_id: user.id, message_id: message.message_id })
        return
      }

      await db.collection<Card>('cards').insertOne({ 
        userID: user.id, 
        number: cardID,
        lastChecked: new Date(),
        balance: card.balance.toString()
      })
      await bot.editMessageText(`Карта ${cardID} успешно привязана, теперь ты получаешь уведомления! Чтобы отвязать ее, зайди в раздел «Мои карты».`, { chat_id: user.id, message_id: message.message_id })
    }
  }
}