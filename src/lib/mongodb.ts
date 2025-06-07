import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  // 타입스크립트에서 Node.js의 글로벌 객체 확장
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options)
  global._mongoClientPromise = client.connect()
}

clientPromise = global._mongoClientPromise

export default clientPromise
