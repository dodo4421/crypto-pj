'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage(data.error || '회원가입 실패')
    } else {
      setMessage('✅ 회원가입 성공!')
      setTimeout(() => router.push('/'), 1000)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>📝 회원가입</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button type="submit">회원가입</button>
      </form>
      <p style={{ color: message.includes('성공') ? 'green' : 'red' }}>
        {message}
      </p>
    </div>
  )
}
