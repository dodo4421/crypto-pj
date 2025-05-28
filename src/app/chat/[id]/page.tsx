// pages/chat/[id].tsx 또는 app/chat/[id]/page.tsx (Next.js 버전에 따라 다름)
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { io, Socket } from 'socket.io-client'
import styles from './chat.module.css'

interface Message {
  id: string
  sender: string
  content: string
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
  const [encryptionAlgorithm, setEncryptionAlgorithm] = useState('AES-256')
  const [isTyping, setIsTyping] = useState(false)
  const [recipientIsTyping, setRecipientIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Socket.io 연결 설정
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
      const socketInstance = io({
        path: '/api/socketio',
        autoConnect: true
      })

      setSocket(socketInstance)

      // 컴포넌트 언마운트 시 연결 해제
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        socketInstance.disconnect()
      }
    } catch (error) {
      console.error('Socket initialization error:', error)
    }
  }, [router, recipientId])

  // Socket.io 이벤트 리스너 설정
  useEffect(() => {
    if (!socket || !recipientId) return

    // 토큰 확인
    const token = localStorage.getItem('accessToken')
    if (!token) return

    console.log('Setting up chat room event listeners')

    // 인증
    socket.emit('authenticate', token)
    
    // 소켓 연결 시 채팅방 참여
    socket.on('connect', () => {
      console.log('Socket connected, joining room with recipient:', recipientId)
      socket.emit('join_room', recipientId)
    })
    
    // 채팅 기록 수신
    socket.on('chat_history', (data) => {
      console.log('Received chat history:', data)
      setMessages(data.messages || [])
      setRecipientInfo(data.recipientInfo || null)
      setLoading(false)
    })

    // 새 메시지 수신
    socket.on('new_message', (message) => {
      console.log('New message received:', message)
      setMessages(prev => [...prev, message])
      
      // 읽음 표시 업데이트
      if (message.sender === recipientId) {
        socket.emit('mark_read', {
          roomId: [socket.id, recipientId].sort().join('-'),
          messageIds: [message.id]
        })
      }
    })

    // 메시지 읽음 표시 업데이트
    socket.on('messages_read', ({ messageIds }) => {
      console.log('Messages marked as read:', messageIds)
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
        )
      )
    })

    // 타이핑 상태 수신
    socket.on('user_typing', ({ userId, isTyping }) => {
      if (userId === recipientId) {
        setRecipientIsTyping(isTyping)
      }
    })

    // 에러 처리
    socket.on('error', (error) => {
      console.error('Socket error in chat room:', error)
      setError(error.message || '오류가 발생했습니다')
    })

    return () => {
      socket.off('connect')
      socket.off('chat_history')
      socket.off('new_message')
      socket.off('messages_read')
      socket.off('user_typing')
      socket.off('error')
    }
  }, [socket, recipientId])

  // 메시지 보내기
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!socket || !newMessage.trim() || !recipientId) return

    console.log('Sending message to:', recipientId)
    socket.emit('send_message', {
      recipientId,
      content: newMessage,
      encryptionAlgorithm
    })

    setNewMessage('')
    setIsTyping(false)
    
    // 타이핑 중지 알림
    socket.emit('typing', {
      recipientId,
      isTyping: false
    })
  }

  // 메시지 입력 핸들러 (타이핑 상태 포함)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)
    
    if (!socket || !recipientId) return

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

  // 메시지 목록 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 메시지 시간 형식
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
          
          <div className={styles.chatOptions}>
            <select 
              value={encryptionAlgorithm}
              onChange={(e) => setEncryptionAlgorithm(e.target.value)}
              className={styles.encryptionSelect}
            >
              <option value="AES-256">AES-256</option>
              <option value="Blowfish">Blowfish</option>
              <option value="RSA">RSA</option>
            </select>
          </div>
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
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  socket?.emit('join_room', recipientId)
                }}
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
              {messages.map((message) => {
                const isMine = message.sender !== recipientId
                
                return (
                  <div 
                    key={message.id}
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
                      <span className={styles.encryptionTag} title={`암호화: ${message.encryptionAlgorithm}`}>
                        🔒
                      </span>
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
            disabled={loading || !!error}
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
            disabled={!newMessage.trim() || loading || !!error}
          >
            전송
          </button>
        </form>
      </div>
    </AuthGuard>
  )
}
