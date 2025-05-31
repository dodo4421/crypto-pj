'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function NewPostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const token = localStorage.getItem('accessToken')
      const res = await axios.post(
        '/api/posts/create',
        { title, content },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      console.log('✅ 게시글 등록:', res.data)
      router.push('/gesipan') // 게시판 목록 페이지로 이동
    } catch (err: any) {
      console.error('❌ 작성 오류:', err)
      setError(err.response?.data?.message || '작성 실패')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>✍️ 게시글 작성</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <br />
        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <br />
        <button type="submit">작성하기</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
