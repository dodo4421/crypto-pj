// pages/api/conversations.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '../../../lib/mongodb'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

interface CustomJwtPayload {
  userId?: string;
  email?: string;
  nickname?: string;
}

const verifyToken = (token: string): CustomJwtPayload | null => {
  try {
    const publicKey = fs.readFileSync(path.resolve('public.pem'), 'utf8')
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as CustomJwtPayload
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '허용되지 않는 메서드입니다' })
  }

  // 토큰 검증
  const token = req.headers.authorization?.split(' ')[1] || ''
  const decoded = verifyToken(token)
  
  if (!decoded || !decoded.userId) {
    return res.status(401).json({ message: '인증에 실패했습니다.' })
  }

  const userId = decoded.userId

  try {
    const client = await clientPromise
    const db = client.db('taeyeon_01')
    const conversationsCollection = db.collection('conversations')
    const usersCollection = db.collection('users')

    // 사용자의 모든 대화방 조회
    const conversations = await conversationsCollection
      .find({ participants: userId })
      .sort({ updatedAt: -1 })
      .toArray()
    
    // 대화 목록에 상대방 정보 추가
    const enhancedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipantId = conv.participants.find((id: string) => id !== userId)
        const otherParticipant = await usersCollection.findOne({ nickname: otherParticipantId })
        
        // unreadCount 계산
        const unreadCount = conv.unreadCounts 
          ? (conv.unreadCounts.find((uc: {user: string, count: number}) => uc.user === userId)?.count || 0)
          : 0
          
        return {
          id: conv.roomId,
          participant: {
            id: otherParticipantId,
            email: otherParticipant?.email || 'Unknown',
            nickname: otherParticipant?.nickname
          },
          lastMessage: conv.lastMessage,
          unreadCount,
          updatedAt: conv.updatedAt
        }
      })
    )
    
    return res.status(200).json(enhancedConversations)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' })
  }
}
