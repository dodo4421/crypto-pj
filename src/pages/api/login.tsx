import { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import clientPromise from '../../../lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body
  const client = await clientPromise
  const db = client.db('taeyeon_01')

  const user = await db.collection('users').findOne({ email })
  if (!user)
    return res.status(401).json({ message: '이메일 또는 비밀번호가 틀립니다.' })

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch)
    return res.status(401).json({ message: '이메일 또는 비밀번호가 틀립니다.' })

  let privateKey = process.env.PRIVATE_KEY

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  } else {
    const fs = require('fs')
    const path = require('path')
    privateKey = fs.readFileSync(path.resolve('private.pem'), 'utf8')
  }

  const accessToken = jwt.sign(
    {
      email: user.email,
      userId: user.nickname,
    },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '3000s',
    }
  )

  res.status(200).json({ token: accessToken, userId: user.nickname })
}
