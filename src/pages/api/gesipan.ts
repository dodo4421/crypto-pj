// pages/api/gesipan.ts
import { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '../../lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise
  const db = client.db('taeyeon_01') // 예: 실제 DB명으로 수정

  if (req.method === 'POST') {
    const { title, content } = req.body
    const result = await db.collection('gesipan').insertOne({
      title,
      content,
      createdAt: new Date(),
      writer: '관리자', // 추후 로그인 정보 기반 작성자 대체 가능
    })
    res.status(201).json({ message: '작성 성공', _id: result.insertedId })
  } else if (req.method === 'GET') {
    const posts = await db
      .collection('gesipan')
      .find({})
      .sort({ createdAt: -1 })
      .toArray()
    res.status(200).json(posts)
  } else {
    res.status(405).json({ message: '지원되지 않는 메서드' })
  }
}
