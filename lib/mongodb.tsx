import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

// ⬇ global 타입 확장 (TypeScript 전용)
declare global {
  // eslint-disable-next-line no-var
  var mongoClientPromise: Promise<MongoClient> | undefined
}

if (!global.mongoClientPromise) {
  client = new MongoClient(uri, options)
  global.mongoClientPromise = client.connect()
}

clientPromise = global.mongoClientPromise

export default clientPromise
