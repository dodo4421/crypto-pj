// pages/api/gesipan/new.ts

import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import clientPromise from '../../../../lib/mongodb'
import fs from 'fs'
import path from 'path'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 메서드입니다.' })
  }

  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ message: '토큰이 없습니다.' })
  }

  let decoded: { userId: string; email: string }

  try {
    const publicKey = fs.readFileSync(path.resolve('public.pem'), 'utf8')
    decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as { userId: string; email: string }
  } catch (err) {
    console.error('토큰 검증 실패:', err)
    return res.status(403).json({ message: '유효하지 않은 토큰입니다.' })
  }

  const { title, content } = req.body

  if (!title || !content) {
    return res.status(400).json({ message: '제목과 내용은 필수입니다.' })
  }

  const client = await clientPromise
  const db = client.db('taeyeon_01')

  const result = await db.collection('gesipan').insertOne({
    title,
    content,
    writer: decoded.userId, // ✅ 여기! 토큰에서 가져온 nickname 저장
    createdAt: new Date(),
  })

  return res.status(201).json({
    message: '게시글이 등록되었습니다.',
    postId: result.insertedId,
  })
}
