'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '로그인 실패')
        return
      }

      // ✅ 로그인 성공 시 /test로 이동
      router.push('/test')
    } catch (err) {
      console.error(err)
      setError('서버 오류 발생')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🔐 로그인</h2>
      <form onSubmit={handleLogin}>
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
        <button type="submit">로그인</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <p> </p>
      <p>계정이 없으신가요?</p>
      <button onClick={() => router.push('/register')}>
        회원가입 하러가기
      </button>
    </div>
  )
}
