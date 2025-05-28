'use client'

import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation' // ✅ 추가

export default function RegisterPage() {
  const router = useRouter() // ✅ 초기화

  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await axios.post('/api/signup', {
        email,
        password,
        nickname,
      })
      setMessage('회원가입 성공! 로그인 페이지로 이동합니다.')

      // ✅ 1초 후 /login 페이지로 이동
      setTimeout(() => {
        router.push('../')
      }, 1000)
    } catch (err: any) {
      setMessage(err.response?.data?.message || '에러 발생')
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: 'auto' }}>
      <h2 style={{ marginBottom: '1rem' }}>회원가입</h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <label>
          이메일
          <input
            type="email"
            placeholder="이메일 입력"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          닉네임 (userID)
          <input
            type="text"
            placeholder="닉네임 입력"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        </label>

        <label>
          비밀번호
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit">가입하기</button>
      </form>

      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
    </div>
  )
}
