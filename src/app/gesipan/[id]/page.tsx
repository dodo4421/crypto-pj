'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
export default function PostDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
        AES-256
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
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">

            채팅하기
          </button>
        )}
      </div>
    </div>
  )
}
