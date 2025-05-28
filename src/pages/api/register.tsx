// src/pages/api/register.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '../../../lib/mongodb'
import bcrypt from 'bcryptjs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: '허용되지 않는 메서드입니다' })

  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호는 필수입니다' })
  }

  const normalizedEmail = email.toLowerCase()

  try {
    const client = await clientPromise
    const db = client.db('taeyeon_01')

    const existingUser = await db
      .collection('users')
      .findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(409).json({ error: '이미 존재하는 이메일입니다' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await db.collection('users').insertOne({
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date(),
    })

    return res.status(201).json({ message: '회원가입 성공' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: '서버 오류 발생' })
  }
}
