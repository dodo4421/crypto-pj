// src/app/gesipan/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function PostDetailPage() {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)

  useEffect(() => {
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

  if (!post) return <p className='p-6'>로딩 중...</p>

  return (
    <div className='max-w-4xl mx-auto p-6 mt-10 bg-white rounded-xl shadow-md'>
      <h1 className='text-2xl font-bold mb-4'>{post.title}</h1>
      <div className='flex justify-between text-sm text-gray-500 mb-2'>
        <span>작성자: {post.writer || '익명'}</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>
      <span className='inline-block mb-4 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded'>
        AES-256
      </span>
      <p className='text-gray-700 whitespace-pre-line'>{post.content}</p>

      {/* 버튼 영역 */}
      <div className='mt-6 flex gap-3'>
        <button className='bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600'>
          수정
        </button>
        <button className='bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600'>
          삭제
        </button>
        <button className='bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400'>
          목록
        </button>
      </div>
    </div>
  )
}
