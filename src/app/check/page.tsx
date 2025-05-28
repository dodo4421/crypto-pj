'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../check/check.module.css'

// MongoDB에서 반환되는 사용자 타입 정의
interface User {
  _id: string  // MongoDB의 _id 필드를 사용
  email: string
  nickname?: string
  // 기타 MongoDB users 컬렉션에 있는 필드들 추가
}

export default function UserList() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 사용자 목록 불러오기
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // API 라우트를 호출하여 사용자 데이터 가져오기
      const response = await fetch('/api/get-all-users')
      
      if (!response.ok) {
        throw new Error('사용자 목록을 불러오는데 실패했습니다')
      }
      
      const data = await response.json()
      console.log('API 응답:', data)
      
      if (data.connected && data.users) {
        setUsers(data.users)
      } else {
        throw new Error('사용자 데이터를 찾을 수 없습니다')
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 사용자 필터링
  const filteredUsers = searchQuery 
    ? users.filter(user => 
        (user.nickname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      )
    : users

  // 대화 시작
  const startChat = (userId: string) => {
    router.push(`/chat/${userId}`)
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>모든 사용자</h1>
      
      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="사용자 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchUsers} className={styles.retryButton}>
            다시 시도
          </button>
        </div>
      )}
      
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>사용자 목록을 불러오는 중...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className={styles.emptyState}>
          {searchQuery ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
        </div>
      ) : (
        <div className={styles.userGrid}>
          {filteredUsers.map(user => (
            <div key={user._id} className={styles.userCard} onClick={() => startChat(user._id)}>
              <div className={styles.avatar}>
                {((user.nickname || user.email?.split('@')[0] || '?')).charAt(0).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <h3 className={styles.userName}>
                  {user.nickname || (user.email?.split('@')[0] || '이름 없음')}
                </h3>
                <p className={styles.userEmail}>{user.email || '이메일 없음'}</p>
              </div>
              <button className={styles.chatButton}>
                대화하기
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
