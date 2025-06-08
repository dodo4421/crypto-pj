'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async () => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) {
      alert('로그인이 필요합니다.')
      router.push('/')
      return
    }

    const res = await fetch('/api/posts/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, content }),
    })

    if (res.ok) {
      router.push('/gesipan')
    } else {
      const data = await res.json()
      setError(data.message || '게시물 작성 실패')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="w-full border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-800">
            CryptoCommunity
          </div>
          <nav>
            <ul className="flex gap-6 text-gray-700 text-m">
              <li>
                <Link href="/gesipan">홈</Link>
              </li>
              <li>
                <Link href="/members">소개</Link>
              </li>
              <li>
                <Link href="/members">팀원</Link>
              </li>
              <li>
                <Link
                  href="/gesipan/new"
                  className="text-blue-500 hover:underline"
                >
                  작성
                </Link>
              </li>
              <li>
                <Link href="/messages">대화</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            ✍️ 게시글 작성
          </h2>

          {error && (
            <div className="mb-4 text-red-600 text-sm text-center">{error}</div>
          )}

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition"
          >
            작성 완료
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 text-center text-sm text-gray-500 py-4">
        © 2025 SecureBoard - 암호화 게시판 시스템
        <br />
        모든 게시물은 선택한 암호화 알고리즘으로 안전하게 보호됩니다.
      </footer>
    </div>
  )
}
