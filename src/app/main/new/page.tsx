'use client'

import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function NewPostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const token = localStorage.getItem('token') // ✅ JWT 꺼내기
      const res = await axios.post(
        'http://localhost:5000/api/posts',
        { title, content },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      console.log('글 등록 성공:', res.data)
      router.push('/main') // 성공 시 메인페이지 이동
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || '글 작성 실패')
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h2
        style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}
      >
        ✏️ 새 글 작성
      </h2>

      <form onSubmit={handleSubmit}>
        <input
          type='text'
          placeholder='제목을 입력하세요'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '15px' }}
          required
        />
        <textarea
          placeholder='내용을 입력하세요'
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          style={{ width: '100%', padding: '10px', marginBottom: '15px' }}
          required
        />
        <button
          type='submit'
          style={{
            backgroundColor: '#1e40af',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '6px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          작성하기
        </button>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </form>
    </div>
  )
}
