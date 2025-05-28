// pages/api/socketio.ts
import { NextApiRequest } from 'next'
import { Server as ServerIO } from 'socket.io'
import { Server as NetServer } from 'http'
import jwt, { JwtPayload } from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import clientPromise from '../../../lib/mongodb'
import { ObjectId } from 'mongodb'

// JWT 페이로드 타입 확장
interface CustomJwtPayload extends JwtPayload {
  userId?: string;
  email?: string;
  nickname?: string;
}

// JWT 검증 함수 수정
const verifyToken = (token: string): CustomJwtPayload | null => {
  try {
    const publicKey = fs.readFileSync(path.resolve('public.pem'), 'utf8');
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as CustomJwtPayload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// MongoDB ObjectId 검증 함수 추가
const isValidObjectId = (id: string): boolean => {
  try {
    new ObjectId(id);
    return true;
  } catch (error) {
    return false;
  }
};

// Socket.io 응답 타입 확장
interface SocketIONextApiResponse {
  socket: {
    server: NetServer & {
      io?: ServerIO
    }
  }
  end: () => void
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: SocketIONextApiResponse
) {
  // Socket.io 서버가 이미 존재하는 경우 재설정 건너뛰기
  if (res.socket.server.io) {
    console.log('Socket.io server already running')
    res.end()
    return
  }

  try {
    // MongoDB 연결
    const client = await clientPromise
    const db = client.db('taeyeon_01')
    const messagesCollection = db.collection('messages')
    const conversationsCollection = db.collection('conversations')
    const usersCollection = db.collection('users')

    // 연결된 사용자 맵
    const connectedUsers = new Map()

    // Socket.io 서버 설정
    const io = new ServerIO(res.socket.server, {
      path: '/api/socketio',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      addTrailingSlash: false,
    })

    // 서버 인스턴스에 Socket.io 할당
    res.socket.server.io = io

    // 사용자 조회 함수 개선
    const findUser = async (userId: string) => {
      // 방법 1: 직접 ID로 검색
      if (isValidObjectId(userId)) {
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (user) return user;
      }
      
      // 방법 2: nickname으로 검색
      const user = await usersCollection.findOne({ nickname: userId });
      if (user) return user;
      
      // 방법 3: nickname = _id 문자열로 검색
      if (isValidObjectId(userId)) {
        const user = await usersCollection.findOne({ nickname: userId.toString() });
        if (user) return user;
      }
      
      // 방법 4: 이메일 검색
      const userByEmail = await usersCollection.findOne({ email: userId });
      if (userByEmail) return userByEmail;
      
      return null;
    };

    // 연결 이벤트 처리
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      // 인증 처리
      socket.on('authenticate', async (token) => {
        const decoded = verifyToken(token)
        if (!decoded) {
          console.log('Invalid token')
          socket.emit('auth_error', { message: '인증에 실패했습니다.' })
          socket.disconnect(true)
          return
        }

        const userId = decoded.userId || decoded.sub || decoded.id
        const email = decoded.email

        if (!userId) {
          console.log('Token missing userId, id, or sub')
          socket.emit('auth_error', { message: '유효하지 않은 사용자 정보입니다.' })
          socket.disconnect(true)
          return
        }

        // 사용자 정보 확인
        const user = await findUser(userId)
        if (!user) {
          console.log(`User not found: ${userId}`)
          socket.emit('auth_error', { message: '등록되지 않은 사용자입니다.' })
          socket.disconnect(true)
          return
        }

        // 소켓에 사용자 정보 저장
        socket.data.userId = user._id.toString()
        socket.data.nickname = user.nickname || user._id.toString()
        socket.data.email = user.email || email

        console.log(`User authenticated: ${socket.data.email} (${socket.data.userId})`)

        // 연결된 사용자 목록에 추가
        connectedUsers.set(socket.data.userId, socket.id)
        
        // 닉네임이 있으면 닉네임으로도 연결 정보 추가
        if (user.nickname && user.nickname !== user._id.toString()) {
          connectedUsers.set(user.nickname, socket.id)
        }

        // 사용자 온라인 상태 업데이트
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { online: true, lastActive: new Date() } }
        )

        // 사용자 온라인 상태 브로드캐스트
        socket.broadcast.emit('user_status', {
          userId: socket.data.userId,
          status: 'online'
        })

        // 사용자 대화 목록을 조회하여 전송
        try {
          // 사용자의 모든 대화방 조회
          const conversations = await conversationsCollection
            .find({ 
              participants: { 
                $in: [
                  socket.data.userId, 
                  socket.data.nickname
                ]
              } 
            })
            .sort({ updatedAt: -1 })
            .toArray();
          
          // unreadCount 계산
          const enhancedConversations = await Promise.all(
            conversations.map(async (conv) => {
              const otherParticipantId = conv.participants.find(
                (id: string) => id !== socket.data.userId && id !== socket.data.nickname
              );
              
              const otherParticipant = await findUser(otherParticipantId);
              
              // unreadCount 계산
              const unreadCount = conv.unreadCounts 
                ? (conv.unreadCounts.find((uc: { user: string, count: number }) => 
                    uc.user === socket.data.userId || uc.user === socket.data.nickname
                  )?.count || 0)
                : 0;
                
              return {
                id: conv.roomId,
                participant: {
                  id: otherParticipantId,
                  email: otherParticipant?.email || 'Unknown',
                  nickname: otherParticipant?.nickname || otherParticipantId
                },
                lastMessage: conv.lastMessage,
                unreadCount,
                updatedAt: conv.updatedAt
              };
            })
          );
          
          console.log(`Sending ${enhancedConversations.length} conversations to user ${socket.data.userId}`);
          socket.emit('conversations_list', enhancedConversations);
        } catch (error) {
          console.error('Error fetching conversations:', error);
          socket.emit('error', { message: '대화 목록을 불러오는 데 실패했습니다.' });
        }
      });

      // 사용자 목록 요청 이벤트 핸들러
socket.on('get_users', async () => {
  const userId = socket.data.userId;
  const userNickname = socket.data.nickname;
  
  if (!userId) {
    console.log('User not authenticated when requesting users list');
    socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
    return;
  }
  
  try {
    // 쿼리 구성
    let query = {};
    
    // 현재 사용자를 제외하는 쿼리 구성 (ID와 nickname 모두 체크)
    if (isValidObjectId(userId)) {
      // ObjectId가 유효한 경우
      query = {
        $and: [
          { 
            $or: [
              { _id: { $ne: new ObjectId(userId) } },
              { nickname: { $ne: userNickname } }
            ]
          },
          {
            $or: [
              { _id: { $exists: true } },
              { email: { $exists: true } }
            ]
          }
        ]
      };
    } else {
      // ObjectId가 유효하지 않은 경우
      query = {
        $and: [
          { nickname: { $ne: userNickname } },
          {
            $or: [
              { _id: { $exists: true } },
              { email: { $exists: true } }
            ]
          }
        ]
      };
    }
    
    // 현재 사용자를 제외한 모든 사용자 조회
    const users = await usersCollection
      .find(query)
      .project({ password: 0 })
      .toArray();
      
    console.log(`Found ${users.length} users for user ${userId}`);
    
    // 사용자 정보 포맷팅
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      email: user.email || '',
      nickname: user.nickname || user._id.toString()
    }));
    
    console.log(`Sending ${formattedUsers.length} users to user ${userId}`);
    socket.emit('users_list', formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    socket.emit('error', { message: '사용자 목록을 불러오는 데 실패했습니다.' });
  }
});


      // 대화 목록 요청 이벤트 핸들러
      socket.on('get_conversations', async () => {
        const userId = socket.data.userId;
        const userNickname = socket.data.nickname;
        
        if (!userId) {
          socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
          return;
        }
        
        try {
          // 사용자의 모든 대화방 조회 
          const conversations = await conversationsCollection
            .find({ 
              participants: { 
                $in: [userId, userNickname] 
              } 
            })
            .sort({ updatedAt: -1 })
            .toArray();
          
          // 대화 목록에 상대방 정보 추가
          const enhancedConversations = await Promise.all(
            conversations.map(async (conv) => {
              const otherParticipantId = conv.participants.find(
                (id: string) => id !== userId && id !== userNickname
              );
              
              const otherParticipant = await findUser(otherParticipantId);
              
              // unreadCount 계산
              const unreadCount = conv.unreadCounts 
                ? (conv.unreadCounts.find((uc: { user: string, count: number }) => 
                    uc.user === userId || uc.user === userNickname
                  )?.count || 0)
                : 0;
                
              return {
                id: conv.roomId,
                participant: {
                  id: otherParticipantId,
                  email: otherParticipant?.email || 'Unknown',
                  nickname: otherParticipant?.nickname || otherParticipantId
                },
                lastMessage: conv.lastMessage,
                unreadCount,
                updatedAt: conv.updatedAt
              };
            })
          );
          
          socket.emit('conversations_list', enhancedConversations);
        } catch (error) {
          console.error('Error fetching conversations:', error);
          socket.emit('error', { message: '대화 목록을 불러오는 데 실패했습니다.' });
        }
      });

      // 채팅방 참여
      socket.on('join_room', async (recipientId) => {
        const userId = socket.data.userId;
        const userNickname = socket.data.nickname;
        
        if (!userId) {
          socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
          return;
        }

        try {
          console.log(`User ${userId} is trying to join room with recipient ${recipientId}`);
          
          // 상대방 사용자 정보 조회 (개선된 조회 함수 사용)
          const recipient = await findUser(recipientId);
          
          if (!recipient) {
            console.error(`Recipient not found: ${recipientId}`);
            socket.emit('error', { message: '존재하지 않는 사용자입니다.' });
            return;
          }
          
          const recipientIdStr = recipient._id.toString();
          const recipientNickname = recipient.nickname || recipientIdStr;
          
          console.log(`Found recipient: ${recipientIdStr} (${recipientNickname})`);

          // 채팅방 ID 생성 (두 사용자 ID를 정렬하여 연결)
          const roomId = [userId, recipientIdStr].sort().join('-');

          // 소켓을 채팅방에 참여시킴
          socket.join(roomId);
          console.log(`User ${userId} joined room ${roomId}`);

          // 채팅방 데이터 조회
          let conversation = await conversationsCollection.findOne({ roomId });
          
          // 대화방이 없으면 생성
          if (!conversation) {
            console.log(`Creating new conversation in room ${roomId}`);
            
            const newConversation = {
              roomId,
              participants: [userId, recipientIdStr],
              participantsInfo: [
                { 
                  id: userId,
                  email: socket.data.email,
                  nickname: userNickname 
                },
                { 
                  id: recipientIdStr,
                  email: recipient.email,
                  nickname: recipientNickname 
                }
              ],
              unreadCounts: [
                { user: userId, count: 0 },
                { user: recipientIdStr, count: 0 }
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
              lastMessage: null
            };

            await conversationsCollection.insertOne(newConversation);
            
            // MongoDB가 생성한 _id를 포함하여 완전한 문서 가져오기
            conversation = await conversationsCollection.findOne({ roomId });
          }

          // 대화 기록 조회
          const messages = await messagesCollection
            .find({ roomId })
            .sort({ createdAt: 1 })
            .toArray();

          // 상대방 정보와 함께 대화 기록 전송
          socket.emit('chat_history', {
            roomId,
            messages,
            recipientInfo: {
              id: recipientIdStr,
              email: recipient.email || '',
              nickname: recipientNickname
            }
          });

          // 읽지 않은 메시지를 읽음으로 표시
          await messagesCollection.updateMany(
            {
              roomId,
              receiver: userId,
              isRead: false
            },
            { $set: { isRead: true } }
          );

          // 상대방에게 메시지 읽음 알림
          const recipientSocketId = connectedUsers.get(recipientIdStr) || connectedUsers.get(recipientNickname);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('messages_read', {
              roomId,
              reader: userId
            });
          }
        } catch (error) {
          console.error('Error joining room:', error);
          socket.emit('error', { message: '채팅방 참여 중 오류가 발생했습니다.' });
        }
      });

      // 메시지 전송
      socket.on('send_message', async ({ recipientId, content, encryptionAlgorithm }) => {
        const userId = socket.data.userId;
        const userEmail = socket.data.email;
        const userNickname = socket.data.nickname;

        if (!userId || !recipientId || !content) {
          socket.emit('error', { message: '메시지 전송에 필요한 정보가 부족합니다.' });
          return;
        }

        try {
          // 상대방 사용자 정보 조회
          const recipient = await findUser(recipientId);
          
          if (!recipient) {
            socket.emit('error', { message: '존재하지 않는 사용자입니다.' });
            return;
          }
          
          const recipientIdStr = recipient._id.toString();
          
          // 채팅방 ID 생성
          const roomId = [userId, recipientIdStr].sort().join('-');

          // 새 메시지 생성
          const newMessage = {
            roomId,
            sender: userId,
            senderNickname: userNickname,
            senderEmail: userEmail,
            receiver: recipientIdStr,
            receiverNickname: recipient.nickname || recipientIdStr,
            content,
            encryptionAlgorithm: encryptionAlgorithm || 'AES-256',
            isRead: false,
            createdAt: new Date()
          };

          // 메시지 DB 저장
          const result = await messagesCollection.insertOne(newMessage);
          const message = { 
            ...newMessage, 
            _id: result.insertedId,
            id: result.insertedId.toString() // 클라이언트가 id 필드를 사용하는 경우 대비
          };

          // 대화 정보 업데이트 (또는 생성)
          await conversationsCollection.updateOne(
            { roomId },
            {
              $set: {
                lastMessage: {
                  content: content.length > 30 ? content.substring(0, 30) + '...' : content,
                  sender: userId,
                  encryptionAlgorithm,
                  createdAt: newMessage.createdAt
                },
                updatedAt: newMessage.createdAt
              },
              $inc: {
                "unreadCounts.$[elem].count": 1
              }
            },
            {
              arrayFilters: [{ "elem.user": recipientIdStr }],
              upsert: true
            }
          );

          // 채팅방에 메시지 전송
          io.to(roomId).emit('new_message', message);

          // 상대방이 온라인인지 확인
          const recipientSocketId = connectedUsers.get(recipientIdStr) || connectedUsers.get(recipient.nickname);
          
          // 상대방이 다른 채팅방에 있을 경우 알림
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message_notification', {
              roomId,
              message: {
                id: message.id || message._id.toString(),
                sender: userId,
                senderEmail: userEmail,
                senderNickname: userNickname,
                content: content.length > 30 ? content.substring(0, 30) + '...' : content,
                encryptionAlgorithm,
                createdAt: newMessage.createdAt
              }
            });
          }
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: '메시지 전송 중 오류가 발생했습니다.' });
        }
      });

      // 타이핑 상태 이벤트 처리
      socket.on('typing', ({ recipientId, isTyping }) => {
        const userId = socket.data.userId;
        if (!userId || !recipientId) return;

        try {
          // 상대방 사용자 정보 조회
          findUser(recipientId).then(recipient => {
            if (!recipient) return;
            
            const recipientIdStr = recipient._id.toString();
            const roomId = [userId, recipientIdStr].sort().join('-');
            
            // 상대방에게만 타이핑 상태 전송
            const recipientSocketId = connectedUsers.get(recipientIdStr) || 
                                    connectedUsers.get(recipient.nickname);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('user_typing', {
                userId,
                isTyping
              });
            }
          });
        } catch (error) {
          console.error('Error in typing event:', error);
        }
      });

      // 메시지 읽음 표시
      socket.on('mark_read', async ({ roomId, messageIds }) => {
        const userId = socket.data.userId;
        if (!userId || !roomId) return;

        try {
          // 메시지 ID가 ObjectId 형태인지 확인하고 변환
          const objectIds = messageIds.map((id: string) => {
            try {
              return new ObjectId(id);
            } catch {
              return id; // 변환에 실패하면 원래 ID 사용
            }
          });
          
          // 메시지 읽음 상태 업데이트
          await messagesCollection.updateMany(
            {
              $or: [
                { _id: { $in: objectIds } },
                { id: { $in: messageIds } }
              ],
              receiver: userId,
              isRead: false
            },
            {
              $set: { isRead: true }
            }
          );

          // 방의 다른 참여자들에게 읽음 상태 알림
          socket.to(roomId).emit('messages_read', {
            roomId,
            messageIds,
            reader: userId
          });
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      // 연결 해제
      socket.on('disconnect', async () => {
        const userId = socket.data.userId;
        const userNickname = socket.data.nickname;
        
        if (!userId) return;

        console.log(`User disconnected: ${userId}`);
        
        // 연결된 사용자 맵에서 제거
        connectedUsers.delete(userId);
        if (userNickname) connectedUsers.delete(userNickname);

        try {
          // 사용자 상태 업데이트
          await usersCollection.updateOne(
            { _id: isValidObjectId(userId) ? new ObjectId(userId) : { $eq: userId } },
            { $set: { online: false, lastActive: new Date() } }
          );
          
          // 사용자 오프라인 상태 브로드캐스트
          socket.broadcast.emit('user_status', {
            userId,
            status: 'offline'
          });
        } catch (error) {
          console.error('Error updating user status on disconnect:', error);
        }
      });
    });

    console.log('Socket.io server started');
    res.end();
  } catch (error) {
    console.error('Socket.io server error:', error);
    res.end();
  }
}
