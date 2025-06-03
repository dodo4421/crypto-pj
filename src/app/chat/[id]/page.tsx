// pages/chat/[id].tsx 또는 app/chat/[id]/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { io, Socket } from 'socket.io-client'
import styles from './chat.module.css'

interface Message {
  id: string
  _id?: string | object
  sender: string
  content: string          // 이미 복호화된 메시지가 전달됨
  encryptionAlgorithm: string
  isRead: boolean
  createdAt: string
}

interface User {
  id: string
  email: string
  nickname?: string
}

export default function ChatRoom() {
  const router = useRouter()
  const params = useParams()
  const recipientId = params?.id as string
  
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [recipientInfo, setRecipientInfo] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [encryptionAlgorithm, setEncryptionAlgorithm] = useState('AES-256')  // 고정 값 사용
  const [isTyping, setIsTyping] = useState(false)
  const [recipientIsTyping, setRecipientIsTyping] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Socket.io 연결 설정 (변경 없음)
  useEffect(() => {
    // 토큰 확인
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/')
      return
    }

    // recipientId가 없으면 메시지 목록으로 리디렉션
    if (!recipientId) {
      router.push('/messages')
      return
    }

    // Socket.io 연결
    try {
      // 이미 연결된 소켓이 있으면 재사용
      if (socket) {
        return; // 기존 소켓이 있으면 새로 만들지 않음
      }
      
      const socketInstance = io({
        path: '/api/socketio',
        autoConnect: true,
        reconnectionAttempts: 3, // 재연결 시도 횟수 제한
        reconnectionDelay: 1000, // 재연결 간격
        timeout: 5000 // 연결 타임아웃
      })

      // 연결 성공 시 인증 수행
      socketInstance.on('connect', () => {
        console.log('Socket connected with ID:', socketInstance.id);
        socketInstance.emit('authenticate', token);
      });

      // 명시적인 인증 에러 처리
      socketInstance.on('auth_error', (error) => {
        console.error('Authentication error:', error);
        setError(`인증 실패: ${error.message}`);
        setLoading(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setError('서버 연결에 실패했습니다.');
        setLoading(false);
      });

      setSocket(socketInstance)

      // 컴포넌트 언마운트 시 연결 해제
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        console.log('Disconnecting socket');
        socketInstance.disconnect();
        setSocket(null);
      }
    } catch (error) {
      console.error('Socket initialization error:', error)
      setError('소켓 연결 중 오류가 발생했습니다.')
      setLoading(false);
    }
  }, [router, recipientId])

  // 인증 성공 이벤트 핸들러 (변경 없음)
  useEffect(() => {
    if (!socket) return;
    
    const handleAuthSuccess = () => {
      setAuthenticated(true);
      setError(null);
      console.log('Authentication successful, joining room with recipient:', recipientId);
      socket.emit('join_room', recipientId);
    };
    
    socket.on('auth_success', handleAuthSuccess);
    
    return () => {
      socket.off('auth_success', handleAuthSuccess);
    };
  }, [socket, recipientId]);

  // Socket.io 이벤트 리스너 설정 (변경 없음 - 서버에서 복호화된 메시지가 전달됨)
  useEffect(() => {
    if (!socket || !recipientId) return

    console.log('Setting up chat room event listeners')

    // 인터페이스 정의
    interface ChatHistoryData {
      roomId?: string;
      messages: Message[];
      recipientInfo: User | null;
    }

    interface MessagesReadData {
      roomId?: string;
      messageIds: string[];
      reader?: string;
    }

    interface UserTypingData {
      userId: string;
      isTyping: boolean;
    }

    interface SocketError {
      message?: string;
      [key: string]: any;
    }

    // 이벤트 핸들러 정의
    const handleChatHistory = (data: ChatHistoryData) => {
      console.log('Received chat history:', data);
      setMessages(data.messages || []);
      setRecipientInfo(data.recipientInfo || null);
      setLoading(false);
      setError(null); // 에러 상태 초기화
    };

    const handleNewMessage = (message: Message) => {
      console.log('New message received:', message);
      setMessages(prev => [...prev, message]);
      
      // 읽음 표시 업데이트
      if (message.sender === recipientId) {
        const messageId = message.id || (message._id ? message._id.toString() : undefined);
        if (messageId) {
          socket.emit('mark_read', {
            roomId: [socket.id, recipientId].sort().join('-'),
            messageIds: [messageId]
          });
        }
      }
    };

    const handleMessagesRead = ({ messageIds }: MessagesReadData) => {
      setMessages(prev => 
        prev.map(msg => {
          const msgId = msg.id || (msg._id ? msg._id.toString() : '');
          return messageIds.includes(msgId) ? { ...msg, isRead: true } : msg;
        })
      );
    };

    const handleUserTyping = ({ userId, isTyping }: UserTypingData) => {
      if (userId === recipientId) {
        setRecipientIsTyping(isTyping);
      }
    };

    const handleError = (error: SocketError) => {
      console.error('Socket error in chat room:', error);
      setError(error.message || '오류가 발생했습니다');
      setLoading(false);
    };

    // 이벤트 리스너 등록
    socket.on('chat_history', handleChatHistory);
    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('error', handleError);
    
    // 인증이 되었다면 채팅방 참여
    if (authenticated) {
      socket.emit('join_room', recipientId);
    }

    return () => {
      socket.off('chat_history', handleChatHistory);
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('error', handleError);
    }
  }, [socket, recipientId, authenticated])

  // 메시지 보내기 (암호화 알고리즘 고정)
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!socket || !newMessage.trim() || !recipientId || !authenticated) return

    console.log('Sending message to:', recipientId)
    socket.emit('send_message', {
      recipientId,
      content: newMessage,
      encryptionAlgorithm: 'AES-256'  // 항상 AES-256 사용
    })

    setNewMessage('')
    setIsTyping(false)
    
    // 타이핑 중지 알림
    socket.emit('typing', {
      recipientId,
      isTyping: false
    })
  }

  // 메시지 입력 핸들러 (변경 없음)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)
    
    if (!socket || !recipientId || !authenticated) return

    // 타이핑 상태 변경
    if (!isTyping && value) {
      setIsTyping(true)
      socket.emit('typing', {
        recipientId,
        isTyping: true
      })
    }
    
    // 타이핑 중지 타이머 설정
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        socket.emit('typing', {
          recipientId,
          isTyping: false
        })
      }
    }, 2000) // 2초 동안 타이핑이 없으면 중지 상태로 변경
  }

  // 메시지 목록 자동 스크롤 (변경 없음)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 메시지 시간 형식 (변경 없음)
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 재연결 시도 (변경 없음)
  const handleRetryConnection = () => {
    setError(null);
    setLoading(true);
    setAuthenticated(false);
    
    if (socket) {
      if (socket.connected) {
        socket.emit('join_room', recipientId);
      } else {
        const token = localStorage.getItem('accessToken');
        if (token) {
          socket.connect();
          socket.once('connect', () => {
            socket.emit('authenticate', token);
          });
        }
      }
    } else {
      // 소켓이 없는 경우 새로 생성
      const token = localStorage.getItem('accessToken');
      if (token) {
        const newSocket = io({
          path: '/api/socketio',
          autoConnect: true
        });
        setSocket(newSocket);
        
        newSocket.on('connect', () => {
          newSocket.emit('authenticate', token);
        });
      }
    }
  }

  // UI 렌더링 (변경 없음)
  return (
    <AuthGuard>
      <div className={styles.chatContainer}>
        {/* 채팅방 헤더 */}
        <div className={styles.chatHeader}>
          <button className={styles.backButton} onClick={() => router.push('/messages')}>
            &larr; 뒤로
          </button>
          
          {loading ? (
            <div className={styles.recipientLoading}>로딩 중...</div>
          ) : recipientInfo ? (
            <div className={styles.recipientInfo}>
              <div className={styles.recipientAvatar}>
                {(recipientInfo.nickname || recipientInfo.email.split('@')[0]).charAt(0).toUpperCase()}
              </div>
              <div className={styles.recipientDetails}>
                <h2>{recipientInfo.nickname || recipientInfo.email.split('@')[0]}</h2>
                <p>{recipientInfo.email}</p>
                {recipientIsTyping && <p className={styles.typingIndicator}>입력 중...</p>}
              </div>
            </div>
          ) : (
            <div className={styles.recipientError}>사용자 정보를 불러올 수 없습니다</div>
          )}
          
        </div>
        
        {/* 메시지 목록 */}
        <div className={styles.messagesContainer}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>대화 내용을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
              <button 
                className={styles.retryButton} 
                onClick={handleRetryConnection}
              >
                다시 시도
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyChat}>
              <p>아직 대화 내용이 없습니다.</p>
              <p>첫 메시지를 보내보세요!</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isMine = message.sender !== recipientId;
                const messageId = message.id || (message._id ? message._id.toString() : `msg-${index}`);
                
                return (
                  <div 
                    key={messageId} // 고유한 key 확보
                    className={`${styles.messageItem} ${isMine ? styles.myMessage : styles.theirMessage}`}
                  >
                    <div className={styles.messageContent}>
                      {message.content}
                    </div>
                    <div className={styles.messageFooter}>
                      <span className={styles.messageTime}>
                        {formatMessageTime(message.createdAt)}
                      </span>
                      {isMine && (
                        <span className={styles.readStatus}>
                          {message.isRead ? '읽음' : '안 읽음'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        
        {/* 메시지 입력 영역 */}
        <form className={styles.messageInputForm} onSubmit={sendMessage}>
          <textarea
            className={styles.messageInput}
            value={newMessage}
            onChange={handleInputChange}
            placeholder="메시지를 입력하세요..."
            disabled={loading || !!error || !authenticated}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(e)
              }
            }}
          />
          <button 
            type="submit" 
            className={styles.sendButton}
            disabled={!newMessage.trim() || loading || !!error || !authenticated}
          >
            전송
          </button>
        </form>
      </div>
    </AuthGuard>
  )
}
