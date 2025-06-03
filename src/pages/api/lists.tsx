// pages/api/posts/list.ts
import { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '../../../../lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 9
    const skip = (page - 1) * limit

    const client = await clientPromise
    const db = client.db('taeyeon_01')
    
    // 게시글 목록 조회
    const posts = await db.collection('gesipan')
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    
    // 총 게시글 수 조회
    const total = await db.collection('gesipan').countDocuments()

    return res.status(200).json({
      posts,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    })
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error)
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' })
  }
}
