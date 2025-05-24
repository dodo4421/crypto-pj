// src/pages/api/login.ts
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

    const user = await db
      .collection('users')
      .findOne({ email: normalizedEmail })

    if (!user) {
      return res.status(401).json({ error: '존재하지 않는 사용자입니다' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ error: '비밀번호가 틀렸습니다' })
    }

    return res.status(200).json({ message: '로그인 성공', email: user.email })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: '서버 오류' })
  }
}
