'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPostPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleSubmit = async () => {
    const res = await fetch('/api/gesipan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })

    if (res.ok) {
      router.push('/gesipan') // 게시판 메인으로 이동
    } else {
      alert('게시물 작성 실패')
    }
  }

  return (
    <div className='container'>
      <h2>게시글 작성</h2>
      <input
        type='text'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder='제목'
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder='내용'
      />
      <button onClick={handleSubmit}>작성</button>
    </div>
  )
}
