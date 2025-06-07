import { NextApiRequest } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import jwt, { JwtPayload } from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto'; // 암호화를 위한 crypto 모듈

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
    return jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as CustomJwtPayload;
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

// 암호화 키 생성 (사용자 ID와 비밀키 기반)
const generateEncryptionKey = (
  userId: string,
  recipientId: string,
  secretKey: string
): Buffer => {
  const combinedKey = `${secretKey}-${userId}-${recipientId}`;
  return crypto.createHash('sha256').update(combinedKey).digest();
};

// AES 암호화 함수
const encryptMessage = (
  message: string,
  userId: string,
  recipientId: string,
  secretKey: string
): string => {
  try {
    // 키 생성
    const key = generateEncryptionKey(userId, recipientId, secretKey);
    // 초기화 벡터 생성 (AES에 필요)
    const iv = crypto.randomBytes(16);
    // AES-256-CBC 암호화 생성
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    // 메시지 암호화
    let encrypted = cipher.update(message, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // IV와 암호화된 내용 함께 저장 (구분자로 분리하여 보관)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Message encryption error:', error);
    // 암호화 실패 시 오류 메시지 반환
    return 'ENCRYPTION_ERROR';
  }
};

// AES 복호화 함수
const decryptMessage = (
  encryptedData: string,
  userId: string,
  recipientId: string,
  secretKey: string
): string => {
  try {
    // 암호화된 데이터가 없거나 형식이 맞지 않으면 에러
    if (!encryptedData || !encryptedData.includes(':')) {
      return 'DECRYPTION_ERROR: Invalid format';
    }

    // IV와 암호화된 데이터 분리
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    // 키 생성 (암호화에 사용한 것과 동일한 방식)
    const key = generateEncryptionKey(userId, recipientId, secretKey);

    // 복호화
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Message decryption error:', error);
    return 'DECRYPTION_ERROR';
  }
};

// 메시지 인증용 HMAC 생성 함수 (필요시 사용)
const createHmac = (
  message: string,
  userId: string,
  recipientId: string,
  secretKey: string
): string => {
  try {
    const key = generateEncryptionKey(userId, recipientId, secretKey);
    const hmac = crypto.createHmac('sha256', key);
    return hmac.update(message).digest('base64');
  } catch (error) {
    console.error('HMAC creation error:', error);
    return '';
  }
};

// Socket.io 응답 타입 확장
interface SocketIONextApiResponse {
  socket: {
    server: NetServer & {
      io?: ServerIO;
    };
  };
  end: () => void;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: SocketIONextApiResponse
) {
  // Socket.io 서버가 이미 존재하는 경우 재설정 건너뛰기
  if (res.socket.server.io) {
    console.log('Socket.io server already running');
    res.end();
    return;
  }

  try {
    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('taeyeon_01');
    const messagesCollection = db.collection('messages');
    const conversationsCollection = db.collection('conversations');
    const usersCollection = db.collection('users');

    // 암호화를 위한 비밀 키 설정
    // 실제 환경에서는 환경 변수 등에서 가져오는 것이 안전합니다
    const SECRET_KEY = 'your-very-secure-and-long-secret-key-2025';

    // 연결된 사용자 맵
    const connectedUsers = new Map();

    // Socket.io 서버 설정
    const io = new ServerIO(res.socket.server, {
      path: '/api/socketio',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      addTrailingSlash: false,
      pingTimeout: 60000, // 핑 타임아웃 증가
    });

    // 서버 인스턴스에 Socket.io 할당
    res.socket.server.io = io;

    // 사용자 조회 함수 개선
    const findUser = async (userId: string) => {
      if (!userId) return null;

      try {
        // 방법 1: 직접 ID로 검색
        if (isValidObjectId(userId)) {
          const user = await usersCollection.findOne({
            _id: new ObjectId(userId),
          });
          if (user) return user;
        }

        // 방법 2: nickname으로 검색
        const user = await usersCollection.findOne({ nickname: userId });
        if (user) return user;

        // 방법 3: nickname = _id 문자열로 검색
        if (isValidObjectId(userId)) {
          const user = await usersCollection.findOne({
            nickname: userId.toString(),
          });
          if (user) return user;
        }

        // 방법 4: 이메일 검색
        const userByEmail = await usersCollection.findOne({ email: userId });
        if (userByEmail) return userByEmail;

        return null;
      } catch (error) {
        console.error(`Error finding user ${userId}:`, error);
        return null;
      }
    };

    // 연결 이벤트 처리
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // 인증 처리
      socket.on('authenticate', async (token) => {
        try {
          const decoded = verifyToken(token);
          if (!decoded) {
            console.log('Invalid token');
            socket.emit('auth_error', { message: '인증에 실패했습니다.' });
            return; // 소켓을 즉시 끊지 말고 오류만 전송
          }

          const userId = decoded.userId || decoded.sub || decoded.id;
          const email = decoded.email;

          if (!userId) {
            console.log('Token missing userId, id, or sub');
            socket.emit('auth_error', {
              message: '유효하지 않은 사용자 정보입니다.',
            });
            return;
          }

          // 사용자 정보 확인
          const user = await findUser(userId);
          if (!user) {
            console.log(`User not found: ${userId}`);
            socket.emit('auth_error', {
              message: '등록되지 않은 사용자입니다.',
            });
            return;
          }

          // 소켓에 사용자 정보 저장
          socket.data.userId = user._id.toString();
          socket.data.nickname = user.nickname || user._id.toString();
          socket.data.email = user.email || email;

          console.log(
            `User authenticated: ${socket.data.email} (${socket.data.userId})`
          );
          socket.emit('auth_success', { userId: socket.data.userId }); // 인증 성공 이벤트 추가

          // 연결된 사용자 목록에 추가
          connectedUsers.set(socket.data.userId, socket.id);

          // 닉네임이 있으면 닉네임으로도 연결 정보 추가
          if (user.nickname && user.nickname !== user._id.toString()) {
            connectedUsers.set(user.nickname, socket.id);
          }

          // 사용자 온라인 상태 업데이트
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { online: true, lastActive: new Date() } }
          );

          // 사용자 온라인 상태 브로드캐스트
          socket.broadcast.emit('user_status', {
            userId: socket.data.userId,
            status: 'online',
          });

          // 사용자 대화 목록을 조회하여 전송
          try {
            // 사용자의 모든 대화방 조회
            const conversations = await conversationsCollection
              .find({
                participants: {
                  $in: [socket.data.userId, socket.data.nickname],
                },
              })
              .sort({ updatedAt: -1 })
              .toArray();

            // unreadCount 계산
            const enhancedConversations = await Promise.all(
              conversations.map(async (conv) => {
                const otherParticipantId = conv.participants.find(
                  (id: string) =>
                    id !== socket.data.userId && id !== socket.data.nickname
                );

                const otherParticipant = await findUser(otherParticipantId);

                // unreadCount 계산
                const unreadCount = conv.unreadCounts
                  ? conv.unreadCounts.find(
                      (uc: { user: string; count: number }) =>
                        uc.user === socket.data.userId ||
                        uc.user === socket.data.nickname
                    )?.count || 0
                  : 0;

                // lastMessage가 암호화되어 있으면 복호화
                let lastMessage = conv.lastMessage;
                if (
                  lastMessage &&
                  lastMessage.content &&
                  lastMessage.encryptionAlgorithm === 'AES-256'
                ) {
                  const decrypted = decryptMessage(
                    lastMessage.content,
                    lastMessage.sender === socket.data.userId
                      ? socket.data.userId
                      : otherParticipantId,
                    lastMessage.sender === socket.data.userId
                      ? otherParticipantId
                      : socket.data.userId,
                    SECRET_KEY
                  );

                  if (!decrypted.startsWith('DECRYPTION_ERROR')) {
                    lastMessage = {
                      ...lastMessage,
                      content:
                        decrypted.length > 30
                          ? decrypted.substring(0, 30) + '...'
                          : decrypted,
                    };
                  }
                }

                return {
                  id: conv.roomId,
                  participant: {
                    id: otherParticipantId,
                    email: otherParticipant?.email || 'Unknown',
                    nickname: otherParticipant?.nickname || otherParticipantId,
                  },
                  lastMessage,
                  unreadCount,
                  updatedAt: conv.updatedAt,
                };
              })
            );

            console.log(
              `Sending ${enhancedConversations.length} conversations to user ${socket.data.userId}`
            );
            socket.emit('conversations_list', enhancedConversations);
          } catch (error) {
            console.error('Error fetching conversations:', error);
            socket.emit('error', {
              message: '대화 목록을 불러오는 데 실패했습니다.',
            });
          }
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('auth_error', {
            message: '인증 처리 중 오류가 발생했습니다.',
          });
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
                    { nickname: { $ne: userNickname } },
                  ],
                },
                {
                  $or: [
                    { _id: { $exists: true } },
                    { email: { $exists: true } },
                  ],
                },
              ],
            };
          } else {
            // ObjectId가 유효하지 않은 경우
            query = {
              $and: [
                { nickname: { $ne: userNickname } },
                {
                  $or: [
                    { _id: { $exists: true } },
                    { email: { $exists: true } },
                  ],
                },
              ],
            };
          }

          // 현재 사용자를 제외한 모든 사용자 조회
          const users = await usersCollection
            .find(query)
            .project({ password: 0 })
            .toArray();

          console.log(`Found ${users.length} users for user ${userId}`);

          // 사용자 정보 포맷팅
          const formattedUsers = users.map((user) => ({
            id: user._id.toString(),
            email: user.email || '',
            nickname: user.nickname || user._id.toString(),
          }));

          console.log(
            `Sending ${formattedUsers.length} users to user ${userId}`
          );
          socket.emit('users_list', formattedUsers);
        } catch (error) {
          console.error('Error fetching users:', error);
          socket.emit('error', {
            message: '사용자 목록을 불러오는 데 실패했습니다.',
          });
        }
      });

      // 대화 목록 요청 이벤트 핸들러
      socket.on('get_conversations', async () => {
        const userId = socket.data.userId;
        const userNickname = socket.data.nickname;

        if (!userId) {
          console.log('User not authenticated when requesting conversations');
          socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
          return;
        }

        try {
          // 사용자의 모든 대화방 조회
          const conversations = await conversationsCollection
            .find({
              participants: {
                $in: [userId, userNickname],
              },
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
                ? conv.unreadCounts.find(
                    (uc: { user: string; count: number }) =>
                      uc.user === userId || uc.user === userNickname
                  )?.count || 0
                : 0;

              // lastMessage가 암호화되어 있으면 복호화
              let lastMessage = conv.lastMessage;
              if (
                lastMessage &&
                lastMessage.content &&
                lastMessage.encryptionAlgorithm === 'AES-256'
              ) {
                const decrypted = decryptMessage(
                  lastMessage.content,
                  lastMessage.sender === userId ? userId : otherParticipantId,
                  lastMessage.sender === userId ? otherParticipantId : userId,
                  SECRET_KEY
                );

                if (!decrypted.startsWith('DECRYPTION_ERROR')) {
                  lastMessage = {
                    ...lastMessage,
                    content:
                      decrypted.length > 30
                        ? decrypted.substring(0, 30) + '...'
                        : decrypted,
                  };
                }
              }

              return {
                id: conv.roomId,
                participant: {
                  id: otherParticipantId,
                  email: otherParticipant?.email || 'Unknown',
                  nickname: otherParticipant?.nickname || otherParticipantId,
                },
                lastMessage,
                unreadCount,
                updatedAt: conv.updatedAt,
              };
            })
          );

          socket.emit('conversations_list', enhancedConversations);
        } catch (error) {
          console.error('Error fetching conversations:', error);
          socket.emit('error', {
            message: '대화 목록을 불러오는 데 실패했습니다.',
          });
        }
      });

      // 채팅방 참여
      socket.on('join_room', async (recipientId) => {
        const userId = socket.data.userId;
        const userNickname = socket.data.nickname;

        if (!userId) {
          console.log('User not authenticated when joining room');
          socket.emit('error', { message: '인증되지 않은 사용자입니다.' });
          return;
        }

        try {
          console.log(
            `User ${userId} is trying to join room with recipient ${recipientId}`
          );

          // 상대방 사용자 정보 조회 (개선된 조회 함수 사용)
          const recipient = await findUser(recipientId);

          if (!recipient) {
            console.error(`Recipient not found: ${recipientId}`);
            socket.emit('error', { message: '존재하지 않는 사용자입니다.' });
            return;
          }

          const recipientIdStr = recipient._id.toString();
          const recipientNickname = recipient.nickname || recipientIdStr;

          console.log(
            `Found recipient: ${recipientIdStr} (${recipientNickname})`
          );

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
                  nickname: userNickname,
                },
                {
                  id: recipientIdStr,
                  email: recipient.email,
                  nickname: recipientNickname,
                },
              ],
              unreadCounts: [
                { user: userId, count: 0 },
                { user: recipientIdStr, count: 0 },
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
              lastMessage: null,
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

          // 암호화된 메시지 복호화하여 클라이언트에게 전송
          const formattedMessages = messages.map((msg) => {
            // 암호화된 메시지를 복호화
            let decryptedContent = msg.content;

            // AES 암호화된 메시지라면 복호화 시도
            if (msg.encryptionAlgorithm === 'AES-256') {
              decryptedContent = decryptMessage(
                msg.content,
                msg.sender,
                msg.receiver,
                SECRET_KEY
              );

              // 복호화 실패 시 오류 메시지 유지
              if (decryptedContent.startsWith('DECRYPTION_ERROR')) {
                console.error(
                  `Failed to decrypt message: ${msg.id || msg._id}`
                );
              }
            }

            return {
              ...msg,
              id: msg.id || msg._id.toString(), // id 필드 보장
              content: decryptedContent, // 복호화된 메시지 내용
            };
          });

          // 상대방 정보와 함께 대화 기록 전송
          socket.emit('chat_history', {
            roomId,
            messages: formattedMessages,
            recipientInfo: {
              id: recipientIdStr,
              email: recipient.email || '',
              nickname: recipientNickname,
            },
          });

          // 읽지 않은 메시지를 읽음으로 표시
          const unreadMessages = await messagesCollection.updateMany(
            {
              roomId,
              receiver: userId,
              isRead: false,
            },
            { $set: { isRead: true } }
          );

          // 업데이트된 메시지가 있으면 상대방에게 읽음 표시 알림
          if (unreadMessages.modifiedCount > 0) {
            // 읽은 메시지 ID 조회
            const readMessages = await messagesCollection
              .find({
                roomId,
                receiver: userId,
                isRead: true,
              })
              .project({ _id: 1 })
              .toArray();

            const readMessageIds = readMessages.map((msg) =>
              msg._id.toString()
            );

            // 상대방에게 메시지 읽음 알림
            const recipientSocketId =
              connectedUsers.get(recipientIdStr) ||
              connectedUsers.get(recipientNickname);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('messages_read', {
                roomId,
                messageIds: readMessageIds,
                reader: userId,
              });
            }

            // 읽지 않은 메시지 카운트 업데이트
            await conversationsCollection.updateOne(
              { roomId },
              {
                $set: {
                  'unreadCounts.$[elem].count': 0,
                },
              },
              {
                arrayFilters: [{ 'elem.user': userId }],
              }
            );
          }
        } catch (error) {
          console.error('Error joining room:', error);
          socket.emit('error', {
            message: '채팅방 참여 중 오류가 발생했습니다.',
          });
        }
      });

      // 메시지 전송 (암호화 적용)
      socket.on(
        'send_message',
        async ({ recipientId, content, encryptionAlgorithm = 'AES-256' }) => {
          const userId = socket.data.userId;
          const userEmail = socket.data.email;
          const userNickname = socket.data.nickname;

          if (!userId || !recipientId || !content) {
            socket.emit('error', {
              message: '메시지 전송에 필요한 정보가 부족합니다.',
            });
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

            // 메시지 내용 암호화 (AES-256 사용)
            const encryptedContent = encryptMessage(
              content,
              userId,
              recipientIdStr,
              SECRET_KEY
            );

            // 암호화 성공 여부 확인
            if (encryptedContent === 'ENCRYPTION_ERROR') {
              socket.emit('error', {
                message: '메시지 암호화에 실패했습니다.',
              });
              return;
            }

            // 새 메시지 생성 (암호화된 메시지만 저장)
            const newMessage = {
              roomId,
              sender: userId,
              senderNickname: userNickname,
              senderEmail: userEmail,
              receiver: recipientIdStr,
              receiverNickname: recipient.nickname || recipientIdStr,
              content: encryptedContent, // 암호화된 메시지만 저장
              encryptionAlgorithm, // 암호화 알고리즘 명시
              isRead: false,
              createdAt: new Date(),
            };
            // 암호화 확인 로그
            console.log('원본 메시지:', content);
            console.log('암호화된 메시지1:', encryptedContent);

            // 메시지 DB 저장
            const result = await messagesCollection.insertOne(newMessage);
            const messageId = result.insertedId.toString();

            // 클라이언트에게 보낼 메시지 객체 생성 (복호화된 메시지 사용)
            const clientMessage = {
              ...newMessage,
              _id: result.insertedId,
              id: messageId,
              content: content, // 클라이언트에게는 원본 메시지 전송
            };

            // 대화 정보 업데이트 (또는 생성)
            await conversationsCollection.updateOne(
              { roomId },
              {
                $set: {
                  lastMessage: {
                    content: encryptedContent, // 암호화된 메시지로 저장
                    sender: userId,
                    encryptionAlgorithm,
                    createdAt: newMessage.createdAt,
                  },
                  updatedAt: newMessage.createdAt,
                },
                $inc: {
                  'unreadCounts.$[elem].count': 1,
                },
              },
              {
                arrayFilters: [{ 'elem.user': recipientIdStr }],
                upsert: true,
              }
            );

            // 채팅방에 메시지 전송
            io.to(roomId).emit('new_message', clientMessage);

            // 상대방이 온라인인지 확인
            const recipientSocketId =
              connectedUsers.get(recipientIdStr) ||
              connectedUsers.get(recipient.nickname);

            // 상대방이 다른 채팅방에 있을 경우 알림
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('message_notification', {
                roomId,
                message: {
                  id: messageId,
                  sender: userId,
                  senderEmail: userEmail,
                  senderNickname: userNickname,
                  content:
                    content.length > 30
                      ? content.substring(0, 30) + '...'
                      : content,
                  encryptionAlgorithm,
                  createdAt: newMessage.createdAt,
                },
              });
            }
          } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', {
              message: '메시지 전송 중 오류가 발생했습니다.',
            });
          }
        }
      );
      // 타이핑 상태 이벤트 처리
      socket.on('typing', ({ recipientId, isTyping }) => {
        const userId = socket.data.userId;
        if (!userId || !recipientId) return;

        try {
          // 상대방 사용자 정보 조회
          findUser(recipientId)
            .then((recipient) => {
              if (!recipient) return;

              const recipientIdStr = recipient._id.toString();
              const roomId = [userId, recipientIdStr].sort().join('-');

              // 상대방에게만 타이핑 상태 전송
              const recipientSocketId =
                connectedUsers.get(recipientIdStr) ||
                connectedUsers.get(recipient.nickname);
              if (recipientSocketId) {
                io.to(recipientSocketId).emit('user_typing', {
                  userId,
                  isTyping,
                });
              }
            })
            .catch((err) => {
              console.error('Error in typing event (findUser):', err);
            });
        } catch (error) {
          console.error('Error in typing event:', error);
        }
      });

      // 메시지 읽음 표시
      socket.on('mark_read', async ({ roomId, messageIds }) => {
        const userId = socket.data.userId;
        if (!userId || !roomId || !messageIds || messageIds.length === 0)
          return;

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
              $or: [{ _id: { $in: objectIds } }, { id: { $in: messageIds } }],
              receiver: userId,
              isRead: false,
            },
            {
              $set: { isRead: true },
            }
          );

          // 방의 다른 참여자들에게 읽음 상태 알림
          socket.to(roomId).emit('messages_read', {
            roomId,
            messageIds,
            reader: userId,
          });

          // 대화 목록의 읽지 않은 메시지 카운트 업데이트
          await conversationsCollection.updateOne(
            { roomId },
            {
              $set: {
                'unreadCounts.$[elem].count': 0,
              },
            },
            {
              arrayFilters: [{ 'elem.user': userId }],
            }
          );
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
          if (isValidObjectId(userId)) {
            await usersCollection.updateOne(
              { _id: new ObjectId(userId) },
              { $set: { online: false, lastActive: new Date() } }
            );
          } else {
            await usersCollection.updateOne(
              { $or: [{ nickname: userId }, { email: userId }] },
              { $set: { online: false, lastActive: new Date() } }
            );
          }

          // 사용자 오프라인 상태 브로드캐스트
          socket.broadcast.emit('user_status', {
            userId,
            status: 'offline',
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
