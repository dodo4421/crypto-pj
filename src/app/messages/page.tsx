'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import styles from '../messages/messages.module.css'

// 타입 정의
interface User {
  _id: string
  id: string
  email: string
  nickname?: string
  online?: boolean
}

interface Message {
  id: string
  content: string
  sender: string
  senderNickname: string
  createdAt: string
  isRead: boolean
}

interface Conversation {
  id: string
  participant: {
    id: string
    email: string
    nickname?: string
    online?: boolean
  }
  lastMessage?: Message | null
  unreadCount: number
  updatedAt: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // 중복 제거 함수 개선
  const removeDuplicateConversations = useCallback((convs: Conversation[]): Conversation[] => {
    const uniqueConversations = new Map<string, Conversation>()
    
    convs.forEach(conv => {
      // participant ID를 기준으로 중복 제거 (더 정확한 방법)
      const participantId = conv.participant.id
      const key = `${currentUserId}-${participantId}`
      
      if (!uniqueConversations.has(key)) {
        uniqueConversations.set(key, conv)
      } else {
        // 이미 존재하는 경우, 더 최신 데이터로 업데이트
        const existing = uniqueConversations.get(key)!
        const existingTime = new Date(existing.updatedAt).getTime()
        const newTime = new Date(conv.updatedAt).getTime()
        
        if (newTime > existingTime) {
          uniqueConversations.set(key, conv)
        }
      }
    })
    
    return Array.from(uniqueConversations.values())
  }, [currentUserId])

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/')
      return
    }

    const getCurrentUser = () => {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const userData = JSON.parse(userStr)
          if (userData._id || userData.id) {
            setCurrentUserId(userData._id || userData.id)
            setCurrentUserEmail(userData.email)
            return
          }
        }

        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(window.atob(base64))
        
        if (payload.id || payload.sub || payload.userId) {
          setCurrentUserId(payload.id || payload.sub || payload.userId)
          setCurrentUserEmail(payload.email)
        }
      } catch (error) {
        console.error('사용자 정보 추출 오류:', error)
        router.push('/')
      }
    }

    getCurrentUser()
  }, [router])

  // Socket.io 연결
  useEffect(() => {
    if (!currentUserId) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
      newSocket.emit('authenticate', token)
    })

    newSocket.on('auth_success', () => {
      console.log('Authentication successful')
      setIsAuthenticated(true)
      setError(null)
      newSocket.emit('get_conversations')
    })

    newSocket.on('auth_error', (data) => {
      console.error('Authentication failed:', data.message)
      setError(data.message)
      setIsAuthenticated(false)
    })

    // 대화 목록 수신 - 개선된 로직
    newSocket.on('conversations_list', (conversationsList: any[]) => {
      console.log('Raw conversations data:', conversationsList)
      
      if (!conversationsList || conversationsList.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }
      
      // 데이터 구조 정규화 및 필터링 개선
      const normalizedConversations = conversationsList
        .filter(conv => conv && conv.participant) // 유효한 데이터만 필터링
        .map((conv, index) => {
          const roomId = conv.id || conv.roomId || conv._id || `conv-${index}-${Date.now()}`
          
          return {
            id: roomId,
            participant: {
              id: conv.participant?.id || conv.participant?._id,
              email: conv.participant?.email || '',
              nickname: conv.participant?.nickname,
              online: conv.participant?.online || false
            },
            lastMessage: conv.lastMessage && conv.lastMessage.content ? {
              id: conv.lastMessage.id || conv.lastMessage._id || `msg-${index}`,
              content: conv.lastMessage.content,
              sender: conv.lastMessage.sender || '',
              senderNickname: conv.lastMessage.senderNickname || '',
              createdAt: conv.lastMessage.createdAt || new Date().toISOString(),
              isRead: conv.lastMessage.isRead || false
            } : null,
            unreadCount: conv.unreadCount || 0,
            updatedAt: conv.updatedAt || new Date().toISOString()
          }
        })
        .filter(conv => conv.participant.id) // participant ID가 있는 것만
      
      // 중복 제거
      const uniqueConversations = removeDuplicateConversations(normalizedConversations)
      
      // 최신 업데이트 순으로 정렬
      const sortedConversations = uniqueConversations.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      
      console.log('Final conversations after deduplication:', sortedConversations)
      setConversations(sortedConversations)
      setLoading(false)
    })

    // 새 메시지 알림 처리
    newSocket.on('message_notification', (data) => {
      console.log('Message notification received:', data)
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === data.roomId) {
            return {
              ...conv,
              lastMessage: data.message,
              unreadCount: conv.unreadCount + 1,
              updatedAt: new Date().toISOString()
            }
          }
          return conv
        })
        
        const uniqueUpdated = removeDuplicateConversations(updated)
        return uniqueUpdated.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      })
    })

    // 새 대화방 생성 이벤트 처리 추가
    newSocket.on('conversation_created', (newConversation) => {
      console.log('New conversation created:', newConversation)
      
      setConversations(prev => {
        // 이미 존재하는지 확인
        const exists = prev.some(conv => 
          conv.id === newConversation.id || 
          conv.participant.id === newConversation.participant.id
        )
        
        if (exists) {
          console.log('Conversation already exists, skipping...')
          return prev
        }
        
        // 새 대화를 목록 맨 위에 추가
        const updated = [newConversation, ...prev]
        
        // 중복 제거 후 정렬
        const uniqueUpdated = removeDuplicateConversations(updated)
        return uniqueUpdated.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      })
    })

    // 채팅 기록 받기 (새 대화방 입장 시)
    newSocket.on('chat_history', (data) => {
      console.log('Chat history received:', data)
      
      // 대화 목록에 새 대화가 없으면 추가
      if (data.messages.length === 0 && data.recipientInfo) {
        const newConversation: Conversation = {
          id: data.roomId,
          participant: {
            id: data.recipientInfo.id,
            email: data.recipientInfo.email,
            nickname: data.recipientInfo.nickname,
            online: false
          },
          lastMessage: null,
          unreadCount: 0,
          updatedAt: new Date().toISOString()
        }
        
        setConversations(prev => {
          const exists = prev.some(conv => 
            conv.id === newConversation.id || 
            conv.participant.id === newConversation.participant.id
          )
          
          if (!exists) {
            const updated = [newConversation, ...prev]
            const uniqueUpdated = removeDuplicateConversations(updated)
            return uniqueUpdated.sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
          }
          
          return prev
        })
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setError('서버 연결에 실패했습니다.')
    })

    newSocket.on('error', (data) => {
      console.error('Socket error:', data.message)
      setError(data.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.off('conversations_list')
      newSocket.off('message_notification')
      newSocket.off('conversation_created') // 추가
      newSocket.off('chat_history') // 추가
      newSocket.off('users_list')
      newSocket.disconnect()
    }
  }, [currentUserId, removeDuplicateConversations])

  // 모든 사용자 목록 가져오기 (새 대화용) - 개선
  const fetchAllUsers = useCallback(async () => {
    console.log('=== fetchAllUsers called ===')
    console.log('socket:', !!socket)
    console.log('isAuthenticated:', isAuthenticated)
    console.log('currentUserId:', currentUserId)
    console.log('conversations:', conversations)
    
    try {
      if (socket && isAuthenticated) {
        // 기존 리스너 제거
        socket.off('users_list')
        
        console.log('Emitting get_users...')
        socket.emit('get_users')
        
        socket.once('users_list', (usersList: User[]) => {
          console.log('All users received:', usersList)
          
          if (!usersList || usersList.length === 0) {
            console.log('No users received')
            setAllUsers([])
            return
          }
          
          // 기존 대화 상대방 ID 목록 생성
          const existingParticipantIds = conversations.map(conv => conv.participant.id)
          console.log('Existing participant IDs:', existingParticipantIds)
          
          // 중복 제거된 사용자 목록
          const uniqueUsers = usersList.filter((user, index, self) => {
            const userId = user._id || user.id
            return index === self.findIndex(u => (u._id || u.id) === userId)
          })
          
          console.log('Unique users:', uniqueUsers)
          
          // 현재 사용자와 기존 대화 상대방을 제외한 사용자만 필터링
          const availableUsers = uniqueUsers.filter(user => {
            const userId = user._id || user.id
            
            if (!userId) {
              console.warn('User without ID found:', user)
              return false
            }
            
            if (userId === currentUserId) {
              console.log('Filtering out current user:', userId)
              return false
            }
            
            if (existingParticipantIds.includes(userId)) {
              console.log('Filtering out existing participant:', userId)
              return false
            }
            
            return true
          })
          
          console.log('Available users after filtering:', availableUsers)
          
          // ID 속성 보장
          const formattedUsers = availableUsers.map(user => {
            const finalId = user._id || user.id
            return {
              ...user,
              id: finalId,
              _id: finalId // 둘 다 보장
            }
          })
          
          console.log('Final formatted users:', formattedUsers)
          setAllUsers(formattedUsers)
        })
      } else {
        console.log('Socket not ready or not authenticated')
      }
    } catch (error) {
      console.error('사용자 목록 불러오기 오류:', error)
    }
  }, [socket, isAuthenticated, conversations, currentUserId])

  // 새 대화 모달 열기
  const openNewChatModal = () => {
    console.log('Opening new chat modal...')
    setShowNewChatModal(true)
    setSearchQuery('')
    fetchAllUsers()
  }

  // 대화방으로 이동
  const goToChat = (participantId: string) => {
    if (!participantId) {
      console.error('Participant ID is missing')
      return
    }
    console.log('Going to chat with participant:', participantId)
    router.push(`/chat/${participantId}`)
  }

  // 새 대화 시작 - 완전 개선
  const startNewChat = (userId: string) => {
    console.log('=== startNewChat Debug ===')
    console.log('Target userId:', userId)
    console.log('Current userId:', currentUserId)
    console.log('Socket connected:', socket?.connected)
    console.log('Is authenticated:', isAuthenticated)
    
    if (!userId || userId.trim() === '') {
      console.error('User ID is missing or empty')
      alert('사용자 ID가 유효하지 않습니다.')
      return
    }
    
    const trimmedUserId = userId.trim()
    
    setShowNewChatModal(false)
    setSearchQuery('')
    
    // 소켓이 연결되어 있으면 즉시 방 참여 시도
    if (socket && isAuthenticated) {
      console.log('Emitting join_room for new chat with userId:', trimmedUserId)
      socket.emit('join_room', trimmedUserId)
      
      // 잠시 후 대화 목록 새로고침 (방이 생성될 시간을 줌)
      setTimeout(() => {
        console.log('Requesting updated conversations list')
        socket.emit('get_conversations')
      }, 1000) // 1초 후
    } else {
      console.warn('Socket not connected or not authenticated')
    }
    
    console.log('Navigating to chat page:', `/chat/${trimmedUserId}`)
    router.push(`/chat/${trimmedUserId}`)
  }

  // 검색된 사용자 필터링 (새 대화용)
  const filteredUsers = allUsers.filter(user => {
    if (searchQuery.trim() === '') return true
    
    const name = (user.nickname || user.email?.split('@')[0] || '').toLowerCase()
    const email = (user.email || '').toLowerCase()
    const query = searchQuery.toLowerCase().trim()
    
    return name.includes(query) || email.includes(query)
  })

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      
      if (days === 0) {
        return date.toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      } else if (days === 1) {
        return '어제'
      } else if (days < 7) {
        return `${days}일 전`
      } else {
        return date.toLocaleDateString('ko-KR', { 
          month: 'short', 
          day: 'numeric' 
        })
      }
    } catch (error) {
      console.error('Date formatting error:', error)
      return ''
    }
  }

  // 메시지 내용 처리 - 개선
  const getLastMessageContent = (conversation: Conversation) => {
    // lastMessage가 없거나 content가 비어있으면 null 반환 (조건부 렌더링에서 처리)
    if (!conversation.lastMessage || !conversation.lastMessage.content?.trim()) {
      return null
    }
    
    const content = conversation.lastMessage.content.trim()
    return content.length > 30 ? content.substring(0, 30) + '...' : content
  }

  // 참가자 이름 표시 개선
  const getParticipantDisplayName = (participant: Conversation['participant']) => {
    if (participant.nickname?.trim()) {
      return participant.nickname.trim()
    }
    if (participant.email) {
      return participant.email.split('@')[0]
    }
    return '이름 없음'
  }

  // 디버깅용 useEffect
  useEffect(() => {
    console.log('=== State Debug ===')
    console.log('conversations:', conversations.length)
    console.log('allUsers:', allUsers.length)
    console.log('filteredUsers:', filteredUsers.length)
  }, [conversations, allUsers, filteredUsers])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>대화 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>메시지</h1>
        <button 
          className={styles.newChatButton}
          onClick={openNewChatModal}
        >
          새 대화
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className={styles.emptyState}>
          <p>아직 대화가 없습니다.</p>
          <p>새 대화를 시작해보세요!</p>
          <button 
            className={styles.button}
            onClick={openNewChatModal}
          >
            새 대화 시작
          </button>
        </div>
      ) : (
        <div className={styles.conversationListContainer}>
          <ul className={styles.conversationList}>
            {conversations.map((conversation, index) => {
              const displayName = getParticipantDisplayName(conversation.participant)
              const lastMessageContent = getLastMessageContent(conversation)
              
              return (
                <li 
                  key={`${conversation.participant.id}-${index}`} // participant ID 기반 키
                  className={styles.conversationItem}
                  onClick={() => goToChat(conversation.participant.id)}
                >
                  <div className={styles.conversationAvatar}>
                    <div className={`${styles.avatar} ${conversation.participant.online ? styles.online : ''}`}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationHeader}>
                      <h3 className={styles.participantName}>
                        {displayName}
                      </h3>
                      {conversation.lastMessage && conversation.lastMessage.createdAt && (
                        <span className={styles.messageTime}>
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    <div className={styles.conversationPreview}>
                      {lastMessageContent ? (
                        <p className={styles.lastMessage}>
                          {lastMessageContent}
                        </p>
                      ) : (
                        <p className={styles.noMessage}>
                          메시지가 없습니다
                        </p>
                      )}
                      {conversation.unreadCount > 0 && (
                        <span className={styles.unreadBadge}>
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 새 대화 모달 */}
      {showNewChatModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewChatModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>새 대화 시작</h2>
              <button 
                className={styles.modalCloseButton}
                onClick={() => setShowNewChatModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalSearch}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="이름 또는 이메일로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.modalUserList}>
              {filteredUsers.length === 0 ? (
                <div className={styles.emptySearchResult}>
                  {searchQuery ? '검색 결과가 없습니다.' : 
                   allUsers.length === 0 ? '새로 대화할 수 있는 사용자가 없습니다.' : 
                   '사용자를 불러오는 중...'}
                </div>
              ) : (
                <ul className={styles.userList}>
                  {filteredUsers.map((user, index) => {
                    const userIdToUse = user._id || user.id
                    return (
                      <li 
                        key={`${userIdToUse}-${index}`}
                        className={styles.userItem}
                        onClick={() => {
                          console.log('Clicked user:', user)
                          console.log('Using ID:', userIdToUse)
                          startNewChat(userIdToUse)
                        }}
                      >
                        <div className={styles.userAvatar}>
                          {(user.nickname || user.email?.split('@')[0] || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userInfo}>
                          <h3 className={styles.userName}>
                            {user.nickname || user.email?.split('@')[0] || '이름 없음'}
                          </h3>
                          <p className={styles.userEmail}>{user.email || '이메일 없음'}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
