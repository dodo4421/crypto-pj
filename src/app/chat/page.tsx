'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import AuthGuard from '@/components/AuthGuard'
import styles from './chatroom.module.css'


// 메시지 타입 정의
interface Message {
  _id: string
  sender: string
  senderEmail?: string
  receiver: string
  content: string
  encryptionAlgorithm: string
  isRead: boolean
  createdAt: Date | string
}

// 사용자 타입 정의
interface User {
  id: string
  email: string
  nickname?: string
}

export default function ChatRoom() {
  // URL 파라미터에서 userId 추출 (상대방 ID)
// URL 파라미터에서 userId 추출 (상대방 ID)
const params = useParams() as { userId: string };
const recipientId = params.userId;

  // 상태 관리
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [recipient, setRecipient] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [encryptionAlgorithm, setEncryptionAlgorithm] = useState('AES-256')
  
  // 메시지가 저장될 div 참조
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // 타이핑 타임아웃 참조
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 메시지 목록 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Socket.io 연결 및 이벤트 설정
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token || !recipientId) return
    
    // Socket.io 연결 설정
    const newSocket = io({
      path: '/api/socketio',
      autoConnect: true,
    })

    // 연결 이벤트
    newSocket.on('connect', () => {
      console.log('Socket connected')
      // 인증 요청
      newSocket.emit('authenticate', token)
      
      // 대화방 참여
      newSocket.emit('join_room', recipientId)
    })

    // 연결 오류 이벤트
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    // 인증 에러 이벤트
    newSocket.on('auth_error', (error) => {
      console.error('Authentication error:', error)
      alert('인증에 실패했습니다. 다시 로그인해주세요.')
      // 로그인 페이지로 리디렉션 처리
    })

    // 대화 기록 수신
    newSocket.on('chat_history', (data) => {
      setMessages(data.messages || [])
      setRecipient(data.recipientInfo || null)
      setIsLoading(false)
      setTimeout(scrollToBottom, 100)
    })

    // 새 메시지 수신
    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message])
      setTimeout(scrollToBottom, 100)
    })

    // 타이핑 상태 수신
    newSocket.on('user_typing', (data) => {
      if (data.userId === recipientId) {
        setIsTyping(data.isTyping)
      }
    })

    // 메시지 읽음 상태 업데이트
    newSocket.on('messages_read', (data) => {
      if (data.reader === recipientId) {
        setMessages(prev => 
          prev.map(msg => 
            msg.receiver === recipientId ? { ...msg, isRead: true } : msg
          )
        )
      }
    })

    // 에러 처리
    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
      alert(error.message || '오류가 발생했습니다.')
    })

    setSocket(newSocket)

    // 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      newSocket.disconnect()
    }
  }, [recipientId])

  // 메시지 전송 핸들러
  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !recipientId) return
    
    // 메시지 전송
    socket.emit('send_message', {
      recipientId,
      content: newMessage,
      encryptionAlgorithm,
    })
    
    // 입력 필드 초기화
    setNewMessage('')
  }

  // 타이핑 상태 처리
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    
    if (!socket || !recipientId) return
    
    // 타이핑 중 이벤트 전송
    socket.emit('typing', { recipientId, isTyping: true })
    
    // 이전 타임아웃 제거
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // 타이핑 종료 타임아웃 설정 (3초)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { recipientId, isTyping: false })
    }, 3000)
  }

  // 메시지 날짜 포맷팅
  const formatMessageDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // 메시지 날짜 그룹화를 위한 함수
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  // 메시지 그룹화 (날짜별)
  const groupedMessages = () => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''
    
    messages.forEach(message => {
      const messageDate = formatDate(message.createdAt)
      
      if (messageDate !== currentDate) {
        currentDate = messageDate
        groups.push({
          date: messageDate,
          messages: [message]
        })
      } else {
        groups[groups.length - 1].messages.push(message)
      }
    })
    
    return groups
  }

  // 자신의 ID 가져오기 (JWT에서 추출하거나 localStorage에서 가져오기)
  // 여기서는 예시로 localStorage에서 가져옴
  const getCurrentUserId = () => {
    return localStorage.getItem('userId') || ''
  }

  return (
    <AuthGuard>
      <div className={styles.chatContainer}>
        {/* 채팅 헤더 */}
        <div className={styles.chatHeader}>
          <div className={styles.recipientInfo}>
            <div className={styles.avatar}>
              {recipient?.nickname?.charAt(0).toUpperCase() || 
               recipient?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className={styles.recipientName}>
                {recipient?.nickname || recipient?.email || '로딩 중...'}
              </div>
              <div className={styles.recipientStatus}>
                {isTyping ? '입력 중...' : '온라인'}
              </div>
            </div>
          </div>
          <button 
            className={styles.backButton} 
            onClick={() => window.history.back()}
          >
            ← 돌아가기
          </button>
        </div>
        
        {/* 채팅 본문 */}
        <div className={styles.chatBody}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>메시지를 불러오는 중...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyChat}>
              <p>아직 대화 내역이 없습니다.</p>
              <p>첫 메시지를 보내보세요!</p>
            </div>
          ) : (
            groupedMessages().map((group, groupIndex) => (
              <div key={groupIndex}>
                <div className={styles.dateDivider}>
                  <span>{group.date}</span>
                </div>
                {group.messages.map((message) => {
                  const isMyMessage = message.sender === getCurrentUserId()
                  return (
                    <div 
                      key={message._id} 
                      className={`${styles.message} ${
                        isMyMessage ? styles.outgoing : styles.incoming
                      }`}
                    >
                      <div className={styles.messageBubble}>
                        {message.content}
                      </div>
                      <div className={styles.messageInfo}>
                        <span className={styles.messageTime}>
                          {formatMessageDate(message.createdAt)}
                        </span>
                        {isMyMessage && (
                          <span className={styles.messageStatus}>
                            {message.isRead ? '읽음' : '전송됨'}
                          </span>
                        )}
                        <span className={styles.encryptionBadge}>
                          🔒 {message.encryptionAlgorithm}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
          
          {isTyping && (
            <div className={styles.typingIndicator}>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* 메시지 입력 영역 */}
        <div className={styles.chatFooter}>
          <div className={styles.encryptionSelector}>
            <select 
              value={encryptionAlgorithm}
              onChange={(e) => setEncryptionAlgorithm(e.target.value)}
            >
              <option value="AES-256">AES-256</option>
              <option value="RSA">RSA</option>
              <option value="Blowfish">Blowfish</option>
              <option value="TripleDES">Triple DES</option>
              <option value="ARIA">ARIA</option>
              <option value="ECC">ECC</option>
              <option value="SHA-256">SHA-256</option>
            </select>
            <span className={styles.encryptionInfo}>🔒 암호화됨</span>
          </div>
          
          <div className={styles.messageInputContainer}>
            <textarea
              className={styles.messageInput}
              placeholder="메시지를 입력하세요..."
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <button
              className={styles.sendButton}
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
