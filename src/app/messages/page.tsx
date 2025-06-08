'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import styles from './messages.module.css'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'

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

  // 중복 제거 함수
  const removeDuplicateConversations = useCallback(
    (convs: Conversation[]): Conversation[] => {
      const uniqueConversations = new Map<string, Conversation>()

      convs.forEach((conv) => {
        const participantId = conv.participant.id
        const key = `${currentUserId}-${participantId}`

        if (!uniqueConversations.has(key)) {
          uniqueConversations.set(key, conv)
        } else {
          const existing = uniqueConversations.get(key)!
          const existingTime = new Date(existing.updatedAt).getTime()
          const newTime = new Date(conv.updatedAt).getTime()

          if (newTime > existingTime) {
            uniqueConversations.set(key, conv)
          }
        }
      })

      return Array.from(uniqueConversations.values())
    },
    [currentUserId]
  )

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

    // Socket.io 서버 초기화를 위한 API 호출
    const initializeSocket = async () => {
      try {
        console.log('Initializing Socket.io server...')

        // Socket.io 서버 초기화
        await fetch('/api/socketio')

        // 약간의 지연 후 클라이언트 연결
        setTimeout(() => {
          console.log('Creating socket connection...')

          const newSocket = io(
            process.env.NODE_ENV === 'production'
              ? window.location.origin
              : 'https://crypto-pj.vercel.app/',
            {
              path: '/api/socketio',
              transports: ['polling', 'websocket'], // polling을 먼저 시도
              upgrade: true,
              rememberUpgrade: false,
              timeout: 20000,
              forceNew: true,
            }
          )

          newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id)
            newSocket.emit('authenticate', token)
          })

          newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error)
            setError('서버 연결에 실패했습니다.')
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

          // 대화 목록 수신
          newSocket.on('conversations_list', (conversationsList: any[]) => {
            console.log('Raw conversations data:', conversationsList)

            if (!conversationsList || conversationsList.length === 0) {
              setConversations([])
              setLoading(false)
              return
            }

            // 데이터 구조 정규화 및 필터링
            const normalizedConversations = conversationsList
              .filter((conv) => conv && conv.participant)
              .map((conv, index) => {
                const roomId =
                  conv.id ||
                  conv.roomId ||
                  conv._id ||
                  `conv-${index}-${Date.now()}`

                return {
                  id: roomId,
                  participant: {
                    id: conv.participant?.id || conv.participant?._id,
                    email: conv.participant?.email || '',
                    nickname: conv.participant?.nickname,
                    online: conv.participant?.online || false,
                  },
                  lastMessage:
                    conv.lastMessage && conv.lastMessage.content
                      ? {
                          id:
                            conv.lastMessage.id ||
                            conv.lastMessage._id ||
                            `msg-${index}`,
                          content: conv.lastMessage.content,
                          sender: conv.lastMessage.sender || '',
                          senderNickname: conv.lastMessage.senderNickname || '',
                          createdAt:
                            conv.lastMessage.createdAt ||
                            new Date().toISOString(),
                          isRead: conv.lastMessage.isRead || false,
                        }
                      : null,
                  unreadCount: conv.unreadCount || 0,
                  updatedAt: conv.updatedAt || new Date().toISOString(),
                }
              })
              .filter((conv) => conv.participant.id)

            // 중복 제거
            const uniqueConversations = removeDuplicateConversations(
              normalizedConversations
            )

            // 최신 업데이트 순으로 정렬
            const sortedConversations = uniqueConversations.sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
            )

            console.log(
              'Final conversations after deduplication:',
              sortedConversations
            )
            setConversations(sortedConversations)
            setLoading(false)
          })

          // 새 메시지 알림 처리
          newSocket.on('message_notification', (data) => {
            console.log('Message notification received:', data)
            setConversations((prev) => {
              const updated = prev.map((conv) => {
                if (conv.id === data.roomId) {
                  return {
                    ...conv,
                    lastMessage: data.message,
                    unreadCount: conv.unreadCount + 1,
                    updatedAt: new Date().toISOString(),
                  }
                }
                return conv
              })

              const uniqueUpdated = removeDuplicateConversations(updated)
              return uniqueUpdated.sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
              )
            })
          })

          // 새 대화방 생성 이벤트 처리
          newSocket.on('conversation_created', (newConversation) => {
            console.log('New conversation created:', newConversation)

            setConversations((prev) => {
              const exists = prev.some(
                (conv) =>
                  conv.id === newConversation.id ||
                  conv.participant.id === newConversation.participant.id
              )

              if (exists) {
                console.log('Conversation already exists, skipping...')
                return prev
              }

              const updated = [newConversation, ...prev]
              const uniqueUpdated = removeDuplicateConversations(updated)
              return uniqueUpdated.sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
              )
            })
          })

          // 채팅 기록 받기 (새 대화방 입장 시)
          newSocket.on('chat_history', (data) => {
            console.log('Chat history received:', data)

            if (data.messages.length === 0 && data.recipientInfo) {
              const newConversation: Conversation = {
                id: data.roomId,
                participant: {
                  id: data.recipientInfo.id,
                  email: data.recipientInfo.email,
                  nickname: data.recipientInfo.nickname,
                  online: false,
                },
                lastMessage: null,
                unreadCount: 0,
                updatedAt: new Date().toISOString(),
              }

              setConversations((prev) => {
                const exists = prev.some(
                  (conv) =>
                    conv.id === newConversation.id ||
                    conv.participant.id === newConversation.participant.id
                )

                if (!exists) {
                  const updated = [newConversation, ...prev]
                  const uniqueUpdated = removeDuplicateConversations(updated)
                  return uniqueUpdated.sort(
                    (a, b) =>
                      new Date(b.updatedAt).getTime() -
                      new Date(a.updatedAt).getTime()
                  )
                }

                return prev
              })
            }
          })

          newSocket.on('error', (data) => {
            console.error('Socket error:', data.message)
            setError(data.message)
          })

          setSocket(newSocket)
        }, 1000) // 1초 지연
      } catch (error) {
        console.error('Socket initialization error:', error)
        setError('소켓 초기화에 실패했습니다.')
      }
    }

    initializeSocket()

    return () => {
      if (socket) {
        socket.off('conversations_list')
        socket.off('message_notification')
        socket.off('conversation_created')
        socket.off('chat_history')
        socket.off('users_list')
        socket.disconnect()
      }
    }
  }, [currentUserId, removeDuplicateConversations])

  // 모든 사용자 목록 가져오기
  const fetchAllUsers = useCallback(async () => {
    console.log('=== fetchAllUsers called ===')
    console.log('socket:', !!socket)
    console.log('isAuthenticated:', isAuthenticated)
    console.log('currentUserId:', currentUserId)
    console.log('conversations:', conversations)

    try {
      if (socket && isAuthenticated) {
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

          const existingParticipantIds = conversations.map(
            (conv) => conv.participant.id
          )
          console.log('Existing participant IDs:', existingParticipantIds)

          const uniqueUsers = usersList.filter((user, index, self) => {
            const userId = user._id || user.id
            return index === self.findIndex((u) => (u._id || u.id) === userId)
          })

          console.log('Unique users:', uniqueUsers)

          const availableUsers = uniqueUsers.filter((user) => {
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

          const formattedUsers = availableUsers.map((user) => {
            const finalId = user._id || user.id
            return {
              ...user,
              id: finalId,
              _id: finalId,
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
  // 주기적으로 대화 목록 갱신하는 useEffect 추가
  useEffect(() => {
    if (!socket || !isAuthenticated) return

    const interval = setInterval(() => {
      console.log('[⏱] Polling for updated conversations...')
      socket.emit('get_conversations') // 대화 목록 재요청
    }, 5000) // 5초 간격으로 갱신

    return () => clearInterval(interval)
  }, [socket, isAuthenticated])

  // 주기적으로 사용자 목록 갱신하는 useEffect 추가 (모달이 열려있을 때만)
  useEffect(() => {
    if (!socket || !isAuthenticated || !showNewChatModal) return

    const interval = setInterval(() => {
      console.log('[⏱] Polling for updated users list...')
      fetchAllUsers() // 사용자 목록 재요청
    }, 1000) // 10초 간격으로 갱신

    return () => clearInterval(interval)
  }, [socket, isAuthenticated, showNewChatModal, fetchAllUsers])

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

  // 새 대화 시작
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

    if (socket && isAuthenticated) {
      console.log('Emitting join_room for new chat with userId:', trimmedUserId)
      socket.emit('join_room', trimmedUserId)

      setTimeout(() => {
        console.log('Requesting updated conversations list')
        socket.emit('get_conversations')
      }, 1000)
    } else {
      console.warn('Socket not connected or not authenticated')
    }

    console.log('Navigating to chat page:', `/chat/${trimmedUserId}`)
    router.push(`/chat/${trimmedUserId}`)
  }

  // 검색된 사용자 필터링
  const filteredUsers = allUsers.filter((user) => {
    if (searchQuery.trim() === '') return true

    const name = (
      user.nickname ||
      user.email?.split('@')[0] ||
      ''
    ).toLowerCase()
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
          hour12: false,
        })
      } else if (days === 1) {
        return '어제'
      } else if (days < 7) {
        return `${days}일 전`
      } else {
        return date.toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        })
      }
    } catch (error) {
      console.error('Date formatting error:', error)
      return ''
    }
  }

  // 메시지 내용 처리
  const getLastMessageContent = (conversation: Conversation) => {
    if (
      !conversation.lastMessage ||
      !conversation.lastMessage.content?.trim()
    ) {
      return null
    }

    const content = conversation.lastMessage.content.trim()
    return content.length > 30 ? content.substring(0, 30) + '...' : content
  }

  // 참가자 이름 표시
  const getParticipantDisplayName = (
    participant: Conversation['participant']
  ) => {
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
    <AuthGuard>
      <div className={styles.container}>
        <header className='w-full border-b border-gray-200'>
          <div className='container mx-auto px-4 py-4 flex justify-between items-center'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold'>
                🔐
              </div>
              <div className='text-2xl font-bold text-gray-800'>
                CryptoCommunity
              </div>
            </div>
            <nav>
              <ul className='flex gap-6 text-gray-700 text-m'>
                <li>
                  <Link href='/gesipan'>홈</Link>
                </li>
                <li>
                  <Link href='/inform'>소개</Link>
                </li>
                <li>
                  <Link href='/members'>팀원</Link>
                </li>
                <li>
                  <Link
                    href='/messages'
                    className='text-blue-500 hover:underline'
                  >
                    대화
                  </Link>
                </li>
                <li>
                  <Link href='/gesipan/new'>작성</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <div className={styles.header}>
          <h1 className={styles.title}>메시지</h1>
          <button className={styles.newChatButton} onClick={openNewChatModal}>
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
            <button className={styles.button} onClick={openNewChatModal}>
              새 대화 시작
            </button>
          </div>
        ) : (
          <div className={styles.conversationListContainer}>
            <ul className={styles.conversationList}>
              {conversations.map((conversation, index) => {
                const displayName = getParticipantDisplayName(
                  conversation.participant
                )
                const lastMessageContent = getLastMessageContent(conversation)

                return (
                  <li
                    key={`${conversation.participant.id}-${index}`}
                    className={styles.conversationItem}
                    onClick={() => goToChat(conversation.participant.id)}
                  >
                    <div className={styles.conversationAvatar}>
                      <div
                        className={`${styles.avatar} ${
                          conversation.participant.online ? styles.online : ''
                        }`}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationHeader}>
                        <h3 className={styles.participantName}>
                          {displayName}
                        </h3>
                        {conversation.lastMessage &&
                          conversation.lastMessage.createdAt && (
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
                          <p className={styles.noMessage}>메시지가 없습니다</p>
                        )}
                        {conversation.unreadCount > 0 && (
                          <span className={styles.unreadBadge}>
                            {conversation.unreadCount > 99
                              ? '99+'
                              : conversation.unreadCount}
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
          <div
            className={styles.modalOverlay}
            onClick={() => setShowNewChatModal(false)}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
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
                  type='text'
                  className={styles.searchInput}
                  placeholder='이름 또는 이메일로 검색...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={styles.modalUserList}>
                {filteredUsers.length === 0 ? (
                  <div className={styles.emptySearchResult}>
                    {searchQuery
                      ? '검색 결과가 없습니다.'
                      : allUsers.length === 0
                      ? '새로 대화할 수 있는 사용자가 없습니다.'
                      : '사용자를 불러오는 중...'}
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
                            {(user.nickname || user.email?.split('@')[0] || '?')
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className={styles.userInfo}>
                            <h3 className={styles.userName}>
                              {user.nickname ||
                                user.email?.split('@')[0] ||
                                '이름 없음'}
                            </h3>
                            <p className={styles.userEmail}>
                              {user.email || '이메일 없음'}
                            </p>
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
    </AuthGuard>
  )
}
