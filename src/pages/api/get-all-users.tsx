// pages/api/test-db.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const client = await clientPromise;
    const db = client.db('taeyeon_01');
    
    // 컬렉션 목록을 가져와서 확인
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // users 컬렉션의 모든 문서 가져오기
    const allUsers = await db.collection('users').find({}).toArray();
    
    // _id를 문자열로 변환하여 반환 (JSON 직렬화를 위해)
    const serializedUsers = allUsers.map(user => {
      return {
        ...user,
        _id: user._id.toString()
      };
    });
    
    return res.status(200).json({
      connected: true,
      collections: collectionNames,
      users: serializedUsers,
      userCount: serializedUsers.length,
      databaseName: db.databaseName
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      stack: error instanceof Error ? error.stack : null
    });
  }
}
