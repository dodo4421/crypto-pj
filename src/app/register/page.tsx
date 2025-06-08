'use client'

import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const res = await axios.post('/api/signup', {
        email,
        password,
        nickname,
      })
      setMessage('회원가입 성공! 로그인 페이지로 이동합니다.')
      setIsSuccess(true)

      setTimeout(() => {
        router.push('../')
      }, 1000)
    } catch (err: any) {
      setMessage(err.response?.data?.message || '에러 발생')
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div style={styles.container}>
        <div style={styles.loginBox}>
          {/* 로고 */}
          <div style={styles.header}>
            <div style={styles.logo}>🔐</div>
            <h1 style={styles.title}>CryptoCommunity</h1>
            <p style={styles.subtitle}>새로운 계정을 만들어 시작하세요</p>
          </div>

          {/* 회원가입 폼 */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <h2 style={styles.formTitle}>회원가입</h2>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>이메일 주소</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                disabled={isLoading}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>닉네임 (UserID)</label>
              <input
                type="text"
                placeholder="고유한 닉네임을 입력하세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                style={styles.input}
                disabled={isLoading}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>비밀번호</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                disabled={isLoading}
              />
            </div>

            {message && (
              <div style={isSuccess ? styles.successBox : styles.errorBox}>
                <p style={isSuccess ? styles.successText : styles.errorText}>
                  {isSuccess ? '✅' : '❌'} {message}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.loginButton,
                ...(isLoading ? styles.loginButtonDisabled : {})
              }}
            >
              {isLoading ? '🔄 가입 중...' : '가입하기'}
            </button>
          </form>

          {/* 구분선 */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>또는</span>
          </div>

          {/* 로그인 링크 */}
          <div style={styles.signupSection}>
            <p style={styles.signupText}>이미 계정이 있으신가요?</p>
            <button
              onClick={() => router.push('../')}
              style={styles.signupButton}
            >
              로그인 하러가기
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  
  loginBox: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '450px',
    textAlign: 'center' as const
  },

  header: {
    marginBottom: '30px'
  },

  logo: {
    fontSize: '60px',
    marginBottom: '15px'
  },

  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: '0 0 8px 0'
  },

  subtitle: {
    color: '#718096',
    fontSize: '14px',
    margin: '0'
  },

  form: {
    textAlign: 'left' as const,
    marginBottom: '30px'
  },

  formTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center' as const,
    marginBottom: '25px'
  },

  inputGroup: {
    marginBottom: '20px'
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    marginBottom: '8px'
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  },

  errorBox: {
    backgroundColor: '#fed7d7',
    border: '1px solid #feb2b2',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px'
  },

  errorText: {
    color: '#c53030',
    fontSize: '14px',
    margin: '0',
    fontWeight: '500'
  },

  successBox: {
    backgroundColor: '#c6f6d5',
    border: '1px solid #9ae6b4',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px'
  },

  successText: {
    color: '#2f855a',
    fontSize: '14px',
    margin: '0',
    fontWeight: '500'
  },

  loginButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  loginButtonDisabled: {
    backgroundColor: '#a0aec0',
    cursor: 'not-allowed',
    transform: 'none'
  },

  divider: {
    position: 'relative' as const,
    margin: '25px 0',
    textAlign: 'center' as const,
  },

  dividerText: {
    backgroundColor: 'white',
    color: '#718096',
    padding: '0 15px',
    fontSize: '14px'
  },

  signupSection: {
    marginBottom: '30px'
  },

  signupText: {
    color: '#718096',
    fontSize: '14px',
    marginBottom: '15px'
  },

  signupButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#4299e1',
    border: '2px solid #4299e1',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
}
