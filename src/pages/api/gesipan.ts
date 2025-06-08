// pages/api/gesipan.ts

import { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '../../../lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise
  const db = client.db('taeyeon_01') // 실제 DB명

  // ✅ 게시글 목록 조회
  if (req.method === 'GET') {
    try {
      const posts = await db
        .collection('gesipan')
        .find({})
        .sort({ createdAt: -1 })
        .toArray()

      return res.status(200).json(posts)
    } catch (err) {
      console.error('게시글 목록 조회 실패:', err)
      return res.status(500).json({ message: '서버 오류' })
    }
  }

  // ❌ 게시글 작성 막기
  return res.status(405).json({ message: '이 API에서는 GET만 허용됩니다.' })
}
