import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = (await clientPromise).db('taeyeon_01')
  const { id } = req.query

  try {
    const post = await db
      .collection('gesipan')
      .findOne({ _id: new ObjectId(id as string) })

    if (!post)
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })

    res.status(200).json(post)
  } catch (err) {
    console.error('게시글 조회 실패:', err)
    res.status(500).json({ message: '서버 오류' })
  }
}
