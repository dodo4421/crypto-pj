import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import clientPromise from '../../../../lib/mongodb'
import fs from 'fs'
import path from 'path'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: '토큰이 없습니다.' })

  try {
    const publicKey = fs.readFileSync(path.resolve('public.pem'), 'utf8')
    const decoded: any = jwt.verify(token, publicKey, { algorithms: ['RS256'] })

    const { title, content } = req.body
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용이 필요합니다.' })
    }

    const client = await clientPromise
    const db = client.db('taeyeon_01')
    const result = await db.collection('gesipan').insertOne({
      title,
      content,
      author: decoded.userId,
      createdAt: new Date(),
    })

    return res
      .status(200)
      .json({ message: '게시글이 등록되었습니다.', postId: result.insertedId })
  } catch (err) {
    console.error('인증 오류:', err)
    return res.status(403).json({ message: '토큰이 유효하지 않습니다.' })
  }
}