'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'

interface Props {
  children: React.ReactNode
}

export default function AuthGuard({ children }: Props) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/')
      return
    }

    try {
      const decoded: any = jwtDecode(token)
      const now = Math.floor(Date.now() / 1000)
      if (decoded.exp < now) {
        alert('토큰이 만료되었습니다. 다시 로그인 해주세요.')
        localStorage.removeItem('accessToken')
        router.push('/')
      }
    } catch (err) {
      console.error('토큰 디코딩 오류:', err)
      localStorage.removeItem('accessToken')
      router.push('/')
    }
  }, [])

  return <>{children}</>
}
