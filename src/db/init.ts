import mongodb, { MongoClient } from 'mongodb'

const mongodbPort = 27017
const ip = process.env.NODE_ENV === 'development' ? 'localhost': '127.0.0.1'
export let db: mongodb.Db
export let dbConnection: mongodb.MongoClient
export default async function getDB(dbName = 's-otk-bot'): Promise<mongodb.Db> {
  if(global.db || db) return global.db ?? db
  // --------------------v <- ${user}:${password}@
  const url = `mongodb://${ip}:${mongodbPort}`
  const client = new MongoClient(url)
  const connection = await client.connect()
  dbConnection = connection
  db = connection.db(dbName)
  global.db = db
  return db
}
