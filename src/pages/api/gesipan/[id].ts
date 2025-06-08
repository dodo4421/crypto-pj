// pages/api/gesipan/[id].ts

import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import clientPromise from '../../../../lib/mongodb'
import fs from 'fs'
import path from 'path'
import { ObjectId } from 'mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  // ID 유효성 검사
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' })
  }

  // ObjectId 형식 검사
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: '잘못된 게시글 ID 형식입니다.' })
  }

  const client = await clientPromise
  const db = client.db('taeyeon_01')

  // GET 요청 - 게시글 조회
  if (req.method === 'GET') {
    try {
      const post = await db.collection('gesipan').findOne({
        _id: new ObjectId(id)
      })

      if (!post) {
        return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })
      }

      return res.status(200).json(post)
    } catch (err) {
      console.error('게시글 조회 실패:', err)
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' })
    }
  }

  // PUT, DELETE 요청은 토큰 검증 필요
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

  // 게시글 존재 여부 및 작성자 확인
  const existingPost = await db.collection('gesipan').findOne({
    _id: new ObjectId(id)
  })

  if (!existingPost) {
    return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })
  }

  if (existingPost.writer !== decoded.userId) {
    return res.status(403).json({ message: '게시글을 수정/삭제할 권한이 없습니다.' })
  }

  // PUT 요청 - 게시글 수정
  if (req.method === 'PUT') {
    const { title, content } = req.body

    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용은 필수입니다.' })
    }

    try {
      const result = await db.collection('gesipan').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            title,
            content,
            updatedAt: new Date(),
          }
        }
      )

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })
      }

      // 수정된 게시글 반환
      const updatedPost = await db.collection('gesipan').findOne({
        _id: new ObjectId(id)
      })

      return res.status(200).json({
        message: '게시글이 수정되었습니다.',
        ...updatedPost
      })
    } catch (err) {
      console.error('게시글 수정 실패:', err)
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' })
    }
  }

  // DELETE 요청 - 게시글 삭제
  if (req.method === 'DELETE') {
    try {
      const result = await db.collection('gesipan').deleteOne({
        _id: new ObjectId(id)
      })

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' })
      }

      return res.status(200).json({
        message: '게시글이 삭제되었습니다.',
        deletedId: id
      })
    } catch (err) {
      console.error('게시글 삭제 실패:', err)
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' })
    }
  }

  // 지원하지 않는 메서드
  return res.status(405).json({ message: '허용되지 않은 메서드입니다.' })
}
