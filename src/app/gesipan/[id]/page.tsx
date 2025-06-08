'use client'

import Link from 'next/link'
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
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [shareMenuAnimation, setShareMenuAnimation] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedContent, setEditedContent] = useState('')

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
        setEditedTitle(data.title)
        setEditedContent(data.content)
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

  // 게시글 수정 함수
  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/gesipan/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent
        })
      })

      if (res.ok) {
        const updatedPost = await res.json()
        setPost(updatedPost)
        setIsEditing(false)
        alert('게시글이 수정되었습니다.')
      } else {
        throw new Error('수정 실패')
      }
    } catch (err) {
      console.error('게시글 수정 실패:', err)
      alert('게시글 수정에 실패했습니다.')
    }
  }

  const handleCancelEdit = () => {
    setEditedTitle(post.title)
    setEditedContent(post.content)
    setIsEditing(false)
  }

  // 게시글 삭제 함수
  const handleDelete = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return
    }

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/gesipan/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        alert('게시글이 삭제되었습니다.')
        router.push('/gesipan')
      } else {
        throw new Error('삭제 실패')
      }
    } catch (err) {
      console.error('게시글 삭제 실패:', err)
      alert('게시글 삭제에 실패했습니다.')
    }
  }

  // 공유 기능들
  const copyLink = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      alert('링크가 클립보드에 복사되었습니다!')
      setShowShareMenu(false)
    } catch (err) {
      console.error('링크 복사 실패:', err)
    }
  }

  const shareToKakao = () => {
    const url = window.location.href
    const title = post?.title || '게시글'
    const description = post?.content?.substring(0, 100) + '...' || '게시글 내용'
    
    // 카카오톡 공유 URL - 웹 브라우저에서 카카오톡 앱으로 직접 공유
    const text = `${title}\n\n${description}\n\n${url}`
    
    // 모바일인 경우 카카오톡 앱 열기 시도
    if (navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i)) {
      const kakaoUrl = `kakaotalk://sendtext?text=${encodeURIComponent(text)}`
      window.location.href = kakaoUrl
      
      // 카카오톡 앱이 없는 경우 대비해서 링크 복사
      setTimeout(() => {
        copyLink()
      }, 1000)
    } else {
      // PC에서는 링크 복사
      copyLink()
      alert('PC에서는 링크가 복사되었습니다. 카카오톡에서 직접 붙여넣기 해주세요.')
    }
    setShowShareMenu(false)
  }

  const shareToInstagram = () => {
    // 인스타그램은 직접 링크 공유가 불가능하므로 웹으로 이동
    const url = `https://www.instagram.com/`
    window.open(url, '_blank')
    copyLink() // 링크를 복사해서 사용자가 붙여넣을 수 있도록
    setShowShareMenu(false)
  }

  const shareToGithub = () => {
    const url = window.location.href
    const title = post?.title || '게시글'
    const body = `CryptoCommunity에서 흥미로운 게시글을 발견했습니다!\n\n제목: ${title}\n링크: ${url}`
    
    // GitHub Issue 생성 형태로 공유 (사용자 본인 레포지토리에 이슈로 저장)
    const githubUrl = `https://github.com/`
    window.open(githubUrl, '_blank')
    copyLink() // 링크를 복사해서 사용자가 붙여넣을 수 있도록
    setShowShareMenu(false)
  }

  const toggleShareMenu = () => {
    if (showShareMenu) {
      setShareMenuAnimation('animate-out')
      setTimeout(() => {
        setShowShareMenu(false)
        setShareMenuAnimation('')
      }, 150)
    } else {
      setShowShareMenu(true)
      setShareMenuAnimation('animate-in')
    }
  }

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.share-menu-container')) {
        setShowShareMenu(false)
        setShareMenuAnimation('')
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="w-full border-b border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                🔐
              </div>
              <div className="text-2xl font-bold text-gray-800">
                CryptoCommunity
              </div>
            </div>
            <nav>
              <ul className="flex gap-6 text-gray-700 text-m">
                <li>
                  <Link href="/gesipan" className="hover:text-blue-500">홈</Link>
                </li>
                <li>
                  <Link href="/inform" className="hover:text-blue-500">소개</Link>
                </li>
                <li>
                  <Link href="/members" className="hover:text-blue-500">팀원</Link>
                </li>
                <li>
                  <Link href="/messages" className="hover:text-blue-500">대화</Link>
                </li>
                <li>
                  <Link href="/gesipan/new" className="text-blue-500 hover:underline">작성</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-xl text-gray-600">게시글을 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = currentUserId === post.writer

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="w-full border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              🔐
            </div>
            <div className="text-2xl font-bold text-gray-800">
              CryptoCommunity
            </div>
          </div>
          <nav>
            <ul className="flex gap-6 text-gray-700 text-m">
              <li>
                <Link href="/gesipan" className="hover:text-blue-500 transition-colors">홈</Link>
              </li>
              <li>
                <Link href="/inform" className="hover:text-blue-500 transition-colors">소개</Link>
              </li>
              <li>
                <Link href="/members" className="hover:text-blue-500 transition-colors">팀원</Link>
              </li>
              <li>
                <Link href="/messages" className="hover:text-blue-500 transition-colors">대화</Link>
              </li>
              <li>
                <Link href="/gesipan/new" 
                  className="bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors">
                  ✏️ 작성
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* 브레드크럼 */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/gesipan" className="hover:text-blue-500">게시판</Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-700 font-medium">게시글 상세</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          {/* 게시글 카드 */}
          <article className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {/* 게시글 헤더 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-3xl font-bold text-gray-900 mb-3 leading-tight w-full bg-transparent border-b-2 border-blue-300 focus:border-blue-500 outline-none"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
                      {post.title}
                    </h1>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {(post.writer || '익명').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{post.writer || '익명'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span>{new Date(post.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    🔐 JWT-RS 인증
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    💬 채팅 가능
                  </span>
                </div>
              </div>
            </div>

            {/* 게시글 내용 */}
            <div className="px-8 py-8">
              <div className="prose prose-lg max-w-none">
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-64 text-gray-800 text-lg leading-relaxed border border-gray-300 rounded-lg p-4 focus:border-blue-500 outline-none resize-none"
                  />
                ) : (
                  <p className="text-gray-800 whitespace-pre-line leading-relaxed text-lg">
                    {post.content}
                  </p>
                )}
              </div>
            </div>

            {/* 게시글 하단 정보 */}
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                </div>
                <span>게시글 작성자: {post.writer}</span>
              </div>
            </div>
          </article>

          {/* 액션 버튼들 */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex flex-wrap gap-3">
                {isOwner ? (
                  <>
                    {isEditing ? (
                      <>
                        <button 
                          onClick={handleSaveEdit}
                          className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          저장
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={handleEdit}
                          className="flex items-center gap-2 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          수정
                        </button>
                        <button 
                          onClick={handleDelete}
                          className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-medium"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          삭제
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <button
                    onClick={startChat}
                    disabled={isConnecting || !socket}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                      isConnecting || !socket
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                  >
                    {isConnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        연결 중...
                      </>
                    ) : (
                      <>
                        💬 채팅하기
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/gesipan')}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  목록으로
                </button>
                {/* 공유 버튼 및 메뉴 */}
                <div className="share-menu-container relative">
                  <button 
                    onClick={toggleShareMenu}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                    공유
                  </button>

                  {/* 공유 메뉴 */}
                  {showShareMenu && (
                    <div className={`absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-48 z-50 ${
                      shareMenuAnimation === 'animate-in' ? 'animate-fade-in' : 
                      shareMenuAnimation === 'animate-out' ? 'animate-fade-out' : ''
                    }`}>
                      <div className="text-xs text-gray-500 px-3 py-1 border-b border-gray-100 mb-1">
                        게시글 공유하기
                      </div>
                      
                      <button
                        onClick={copyLink}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          📋
                        </div>
                        <span>링크 복사</span>
                      </button>
                      
                      <button
                        onClick={shareToKakao}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-yellow-50 rounded transition-colors"
                      >
                        <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center text-white text-xs font-bold">
                          💬
                        </div>
                        <span>카카오톡</span>
                      </button>
                      
                      <button
                        onClick={shareToInstagram}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-pink-50 rounded transition-colors"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center text-white text-xs font-bold">
                          📷
                        </div>
                        <span>인스타그램</span>
                      </button>
                      
                      <button
                        onClick={shareToGithub}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-white text-xs font-bold">
                          🐱
                        </div>
                        <span>GitHub</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-out {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(10px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.15s ease-out forwards;
        }
        
        .animate-fade-out {
          animation: fade-out 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
