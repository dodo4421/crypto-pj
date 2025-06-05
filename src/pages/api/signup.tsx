// pages/api/signup.ts
import { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import clientPromise from '../../lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, nickname } = req.body
  const client = await clientPromise
  const db = client.db('taeyeon_01')

  const existing = await db
    .collection('users')
    .findOne({ $or: [{ email }, { nickname }] })
  if (existing)
    return res
      .status(409)
      .json({ message: '이미 사용 중인 이메일 또는 닉네임' })

  const hashed = await bcrypt.hash(password, 10)
  await db.collection('users').insertOne({ email, password: hashed, nickname })

  return res.status(201).json({ message: '회원가입 성공' })
}
