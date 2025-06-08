'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { io, Socket } from 'socket.io-client'

interface Conversation {
  id: string
  participant: {
    id: string
    email: string
    nickname?: string
    online?: boolean
  }
  lastMessage?: any
  unreadCount: number
  updatedAt: string
}

export default function PostDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    // 1. 사용자 토큰에서 userId 추출
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (token) {
      try {
        const decoded = jwtDecode<{ userId: string }>(token)
        setCurrentUserId(decoded.userId)
      } catch (err) {
        console.error('토큰 디코딩 실패:', err)
      }
    }
  }, [])

  // Socket.io 연결 설정
  useEffect(() => {
    if (!currentUserId) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    const initializeSocket = async () => {
      try {
        console.log('Initializing Socket.io server for chat...')

        // Socket.io 서버 초기화
        await fetch('/api/socketio')

        // 약간의 지연 후 클라이언트 연결
        setTimeout(() => {
          console.log('Creating socket connection...')

          const newSocket = io(
            process.env.NODE_ENV === 'production'
              ? window.location.origin
              : 'http://localhost:3000',
            {
              path: '/api/socketio',
              transports: ['polling', 'websocket'],
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

          newSocket.on('auth_success', () => {
            console.log('Authentication successful')
            newSocket.emit('get_conversations')
          })

          newSocket.on('auth_error', (data) => {
            console.error('Authentication failed:', data.message)
          })

          // 대화 목록 수신
          newSocket.on('conversations_list', (conversationsList: any[]) => {
            console.log('Conversations received:', conversationsList)

            if (!conversationsList || conversationsList.length === 0) {
              setConversations([])
              return
            }

            // 데이터 구조 정규화
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
                  lastMessage: conv.lastMessage,
                  unreadCount: conv.unreadCount || 0,
                  updatedAt: conv.updatedAt || new Date().toISOString(),
                }
              })
              .filter((conv) => conv.participant.id)

            setConversations(normalizedConversations)
          })

          // 새 대화방 생성 이벤트 처리
          newSocket.on('conversation_created', (newConversation) => {
            console.log('New conversation created:', newConversation)
            setConversations((prev) => [newConversation, ...prev])
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
                  return [newConversation, ...prev]
                }

                return prev
              })
            }

            // 채팅 페이지로 이동
            setIsConnecting(false)
            router.push(`/chat/${data.recipientInfo.id}`)
          })

          setSocket(newSocket)
        }, 1000)
      } catch (error) {
        console.error('Socket initialization error:', error)
        setIsConnecting(false)
      }
    }

    initializeSocket()

    return () => {
      if (socket) {
        socket.off('conversations_list')
        socket.off('conversation_created')
        socket.off('chat_history')
        socket.disconnect()
      }
    }
  }, [currentUserId, router])

  useEffect(() => {
    if (!id) return

    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/gesipan/${id}`)
        const data = await res.json()
        setPost(data)
      } catch (err) {
        console.error('게시글 로딩 실패:', err)
      }
    }

    fetchPost()
  }, [id])

  // 채팅 시작하기 함수
  const startChat = () => {
    if (!post || !post.writer || !currentUserId || !socket) {
      console.error('필요한 정보가 부족합니다.')
      return
    }

    if (post.writer === currentUserId) {
      console.log('자신의 글입니다.')
      return
    }

    setIsConnecting(true)

    // 기존 대화방이 있는지 확인
    const existingConversation = conversations.find(
      (conv) => conv.participant.id === post.writer
    )

    if (existingConversation) {
      // 기존 대화방이 있으면 바로 이동
      console.log('기존 대화방으로 이동:', existingConversation.id)
      setIsConnecting(false)
      router.push(`/chat/${post.writer}`)
    } else {
      // 새 대화방 생성
      console.log('새 대화방 생성 요청:', post.writer)
      socket.emit('join_room', post.writer)

      // 타임아웃 설정 (10초 후에도 응답이 없으면 연결 해제)
      setTimeout(() => {
        if (isConnecting) {
          setIsConnecting(false)
          console.error('채팅방 생성 타임아웃')
        }
      }, 10000)
    }
  }

  if (!post) return <p className="p-6">로딩 중...</p>

  const isOwner = currentUserId === post.writer

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
      <div className="flex justify-between text-sm text-gray-500 mb-2">
        <span>작성자: {post.writer || '익명'}</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>
      <span className="inline-block mb-4 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
        JWT-RS 인증
      </span>
      <p className="text-gray-700 whitespace-pre-line">{post.content}</p>

      {/* 버튼 영역 */}
      <div className="mt-6 flex gap-3">
        {isOwner ? (
          <>
            <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              수정
            </button>
            <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
              삭제
            </button>
            <button
              onClick={() => router.push('/gesipan')}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            >
              목록
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startChat}
              disabled={isConnecting || !socket}
              className={`px-4 py-2 rounded text-white ${
                isConnecting || !socket
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isConnecting ? '연결 중...' : '채팅하기'}
            </button>
            <button
              onClick={() => router.push('/gesipan')}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            >
              목록
            </button>
          </>
        )}
      </div>
    </div>
  )
}
