'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

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

      localStorage.setItem('accessToken', data.token)
      router.push('/gesipan')
    } catch (err) {
      console.error(err)
      setError('서버 오류 발생')
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
            <p style={styles.subtitle}>JWT 인증 기반 실시간 채팅 게시판</p>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleLogin} style={styles.form}>
            <h2 style={styles.formTitle}>로그인</h2>
            
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

            {error && (
              <div style={styles.errorBox}>
                <p style={styles.errorText}>❌ {error}</p>
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
              {isLoading ? '로그인 중...' : ' 로그인'}
            </button>
          </form>

          {/* 구분선 */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>또는</span>
          </div>

          {/* 회원가입 */}
          <div style={styles.signupSection}>
            <p style={styles.signupText}>아직 계정이 없으신가요?</p>
            <button
              onClick={() => router.push('/register')}
              style={styles.signupButton}
            >
              회원가입 하러가기
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
    ':focus': {
      borderColor: '#4299e1'
    }
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
    ':hover': {
      backgroundColor: '#3182ce',
      transform: 'translateY(-2px)'
    }
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
    '::before': {
      content: '""',
      position: 'absolute' as const,
      top: '50%',
      left: '0',
      right: '0',
      height: '1px',
      backgroundColor: '#e2e8f0'
    }
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
    ':hover': {
      backgroundColor: '#ebf8ff'
    }
  },

  features: {
    display: 'flex',
    justifyContent: 'space-around',
    flexWrap: 'wrap' as const,
    gap: '10px',
    marginBottom: '20px'
  },

  feature: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    color: '#718096'
  },

  featureDot: {
    marginRight: '5px'
  },

  footer: {
    marginTop: '20px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center' as const
  }
}
