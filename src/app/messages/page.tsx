'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../messages/messages.module.css'

// MongoDB에서 반환되는 사용자 타입 정의
interface User {
  _id: string
  email: string
  nickname?: string
}

export default function UserList() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 현재 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        // localStorage에서 사용자 정보 확인
        const userStr = localStorage.getItem('user')
        if (userStr) {
          try {
            const userData = JSON.parse(userStr)
            if (userData._id || userData.id) {
              setCurrentUserId(userData._id || userData.id)
              setCurrentUserEmail(userData.email)
              return
            }
          } catch (e) {
            console.error('localStorage user parsing error:', e)
          }
        }

        // accessToken에서 정보 추출
        const token = localStorage.getItem('accessToken')
        if (token) {
          try {
            const base64Url = token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const payload = JSON.parse(window.atob(base64))
            
            if (payload.id || payload.sub || payload.userId) {
              setCurrentUserId(payload.id || payload.sub || payload.userId)
              setCurrentUserEmail(payload.email)
              return
            }
          } catch (e) {
            console.error('Token parsing error:', e)
          }
        }
        
        // 세션 스토리지 확인
        const sessionUserStr = sessionStorage.getItem('user')
        if (sessionUserStr) {
          try {
            const sessionUserData = JSON.parse(sessionUserStr)
            if (sessionUserData._id || sessionUserData.id) {
              setCurrentUserId(sessionUserData._id || sessionUserData.id)
              setCurrentUserEmail(sessionUserData.email)
              return
            }
          } catch (e) {
            console.error('sessionStorage user parsing error:', e)
          }
        }
      } catch (error) {
        console.error('사용자 정보 추출 오류:', error)
      }
    }

    getCurrentUser()
  }, [])

  // 사용자 목록 불러오기
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/get-all-users')
      
      if (!response.ok) {
        throw new Error(`사용자 목록 불러오기 실패 (${response.status})`)
      }
      
      const data = await response.json()
      
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users)
      } else {
        // 다른 형태로 데이터가 제공될 수 있음
        let foundUsers: User[] = []
        
        // 데이터가 직접 배열인 경우
        if (Array.isArray(data)) {
          foundUsers = data
        } 
        // 데이터가 다른 구조인 경우
        else if (typeof data === 'object' && data !== null) {
          const possibleFields = ['users', 'data', 'items', 'results']
          for (const field of possibleFields) {
            if (Array.isArray(data[field])) {
              foundUsers = data[field]
              break
            }
          }
          
          if (foundUsers.length === 0) {
            for (const key in data) {
              if (Array.isArray(data[key])) {
                foundUsers = data[key]
                if (foundUsers.length > 0 && foundUsers[0]._id) {
                  break
                }
              }
            }
          }
        }
        
        if (foundUsers.length > 0) {
          setUsers(foundUsers)
        } else {
          throw new Error('사용자 데이터를 찾을 수 없습니다')
        }
      }
      
      setError(null)
    } catch (err) {
      console.error('사용자 목록 불러오기 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 자신을 제외한 사용자 필터링
  const filteredUsers = users.filter(user => {
    // 현재 사용자 제외
    if ((currentUserId && user._id === currentUserId) || 
        (currentUserEmail && user.email === currentUserEmail)) {
      return false
    }
    
    // 검색어로 필터링
    if (searchQuery) {
      const name = (user.nickname || user.email?.split('@')[0] || '').toLowerCase()
      const email = (user.email || '').toLowerCase()
      return name.includes(searchQuery.toLowerCase()) || 
             email.includes(searchQuery.toLowerCase())
    }
    
    return true
  })

  // 대화 시작
  const startChat = (userId: string) => {
    router.push(`/chat/${userId}`)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>사용자 목록</h1>
        <div className={styles.infoBar}>
          <span className={styles.userCount}>
            총 <strong>{filteredUsers.length}</strong>명의 사용자
          </span>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="이름 또는 이메일로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchUsers} className={styles.button}>다시 시도</button>
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
        <div className={styles.userListContainer}>
          <ul className={styles.userList}>
            {filteredUsers.map(user => (
              <li key={user._id} className={styles.userItem}>
                <div className={styles.userAvatar}>
                  {(user.nickname || user.email?.split('@')[0] || '?').charAt(0).toUpperCase()}
                </div>
                <div className={styles.userInfo}>
                  <h3 className={styles.userName}>
                    {user.nickname || (user.email?.split('@')[0] || '이름 없음')}
                  </h3>
                  <p className={styles.userEmail}>{user.email || '이메일 없음'}</p>
                </div>
                <button 
                  className={styles.chatButton}
                  onClick={() => startChat(user._id)}
                >
                  대화하기
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
