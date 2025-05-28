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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // 현재 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        // 1. localStorage에서 사용자 정보 확인
        const userStr = localStorage.getItem('user')
        if (userStr) {
          try {
            const userData = JSON.parse(userStr)
            console.log('localStorage user data:', userData)
            if (userData._id || userData.id) {
              setCurrentUserId(userData._id || userData.id)
              setCurrentUserEmail(userData.email)
              return
            }
          } catch (e) {
            console.error('localStorage user parsing error:', e)
          }
        }

        // 2. accessToken에서 정보 추출
        const token = localStorage.getItem('accessToken')
        if (token) {
          try {
            // JWT 토큰 디코딩 시도
            const base64Url = token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const payload = JSON.parse(window.atob(base64))
            console.log('Token payload:', payload)
            
            if (payload.id || payload.sub || payload.userId) {
              setCurrentUserId(payload.id || payload.sub || payload.userId)
              setCurrentUserEmail(payload.email)
              return
            }
          } catch (e) {
            console.error('Token parsing error:', e)
          }
        }
        
        // 3. 세션 스토리지 확인
        const sessionUserStr = sessionStorage.getItem('user')
        if (sessionUserStr) {
          try {
            const sessionUserData = JSON.parse(sessionUserStr)
            console.log('sessionStorage user data:', sessionUserData)
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
      console.log('API 응답 전체 데이터:', data)
      setDebugInfo(data)
      
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users)
        console.log(`${data.users.length}명의 사용자를 불러왔습니다`)
      } else {
        // 다른 형태로 데이터가 제공될 수 있음
        let foundUsers: User[] = []
        
        // 1. 데이터가 직접 배열인 경우
        if (Array.isArray(data)) {
          foundUsers = data
        } 
        // 2. 데이터가 다른 구조인 경우
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
          console.log(`대체 방법으로 ${foundUsers.length}명의 사용자를 찾았습니다`)
        } else {
          console.error('사용자 데이터를 찾을 수 없습니다:', data)
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
  const filteredUsersByCurrentUser = users.filter(user => {
    // ID로 필터링
    if (currentUserId && user._id === currentUserId) {
      return false
    }
    
    // 이메일로 필터링 (ID가 없거나 형식이 다른 경우 대비)
    if (currentUserEmail && user.email === currentUserEmail) {
      return false
    }
    
    return true
  })

  // 검색어로 사용자 필터링
  const filteredUsers = searchQuery 
    ? filteredUsersByCurrentUser.filter(user => 
        (user.nickname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      )
    : filteredUsersByCurrentUser

  // 대화 시작 - 채팅 페이지로 이동
  const startChat = (userId: string) => {
    console.log(`${userId}와(과) 대화를 시작합니다`)
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
            <div key={user._id} className={styles.userCard}>
              <div className={styles.avatar}>
                {((user.nickname || user.email?.split('@')[0] || '?')).charAt(0).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <h3 className={styles.userName}>
                  {user.nickname || (user.email?.split('@')[0] || '이름 없음')}
                </h3>
                <p className={styles.userEmail}>{user.email || '이메일 없음'}</p>
              </div>
              <button 
                className={styles.chatButton}
                onClick={(e) => {
                  e.stopPropagation(); // 이벤트 버블링 방지
                  startChat(user._id);
                }}
              >
                대화하기
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 디버깅 정보 */}
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd', fontSize: '12px' }}>
        <h4>디버깅 정보</h4>
        <p>현재 사용자 ID: {currentUserId || '알 수 없음'}</p>
        <p>현재 사용자 이메일: {currentUserEmail || '알 수 없음'}</p>
        <p>전체 사용자 수: {users.length}</p>
        <p>필터링 후 사용자 수: {filteredUsers.length}</p>
        <details>
          <summary>로그인 확인</summary>
          <div style={{ marginTop: '10px' }}>
            <button onClick={() => {
              // 사용자 정보를 직접 입력 (테스트용)
              const testUserId = prompt('현재 사용자 ID를 입력하세요:')
              if (testUserId) setCurrentUserId(testUserId)
              
              const testUserEmail = prompt('현재 사용자 이메일을 입력하세요:')
              if (testUserEmail) setCurrentUserEmail(testUserEmail)
            }}>
              현재 사용자 정보 수동 입력
            </button>
          </div>
        </details>
        <button 
          onClick={fetchUsers} 
          style={{ padding: '5px 10px', marginTop: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          데이터 새로고침
        </button>
        <div style={{ marginTop: '10px' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>API 응답 데이터 확인</summary>
            <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '10px', fontSize: '11px', maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}
