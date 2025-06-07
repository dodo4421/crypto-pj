import clientPromise from '@/lib/mongodb' //

import { ObjectId } from 'mongodb'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  try {
    const client = await clientPromise
    const db = client.db('taeyeon_01')
    const post = await db
      .collection('posts')
      .findOne({ _id: new ObjectId(id as string) })

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    res.status(200).json(post)
  } catch (error) {
    console.error('API 오류:', error)
    res.status(500).json({ error: '서버 오류 발생' })
  }
}
