'use client'

import Link from 'next/link'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'

export default function GesipanHome() {
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [originalPosts, setOriginalPosts] = useState<any[]>([]) // 원본 저장용
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const postsPerPage = 6

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) router.push('/')
  }, [])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/gesipan/')
        const data = await res.json()
        setPosts(data)
        setOriginalPosts(data)
      } catch (err) {
        console.error('게시글 로딩 실패:', err)
      }
    }
    fetchPosts()
  }, [])

  // 검색 처리
  const handleSearch = (value: string) => {
    setSearch(value)
    const keyword = value.toLowerCase()
    if (!keyword) {
      setPosts(originalPosts)
    } else {
      const filtered = originalPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(keyword) ||
          post.content.toLowerCase().includes(keyword)
      )
      setPosts(filtered)
      setCurrentPage(1)
    }
  }

  // 페이지 계산
  const indexOfLastPost = currentPage * postsPerPage
  const indexOfFirstPost = indexOfLastPost - postsPerPage
  const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost)
  const totalPages = Math.ceil(posts.length / postsPerPage)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <AuthGuard>
      <>
        <Head>
          <title>SecureBoard - 암호화 게시판 시스템</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
        </Head>

        <div className="min-h-screen flex flex-col">
          {/* Header */}
        <header className="w-full border-b border-gray-200">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                🔐
              </div>
              <div className="text-2xl font-bold text-gray-800">
                CryptoCommunity
              </div>
            </div>
              <nav>
                <ul className="flex gap-6 text-gray-700 text-m">
                  <li>
                    <Link
                      href="/gesipan"
                      className="text-blue-500 hover:underline"
                    >
                      홈
                    </Link>
                  </li>
                  <li>
                    <Link href="/inform">소개</Link>
                  </li>
                  <li>
                    <Link href="/members">팀원</Link>
                  </li>
                  <li>
                    <Link href="/messages">대화</Link>
                  </li>
                  <li>
                    <Link href="/gesipan/new">작성</Link>
                  </li>
                </ul>
              </nav>
            </div>
          </header>

          <div className="w-full border-b border-gray-200 py-10 relative">
            <div className="container mx-auto px-4">
              {/* 검색창을 절대 가운데 */}
              <div className="absolute left-1/2 transform -translate-x-1/2 top-1/2 -translate-y-1/2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="게시글 제목 또는 내용을 검색하세요"
                  className="w-[700px] px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 우측 텍스트 */}
              <div className="text-sm text-gray-400 text-right">
                2025 - 암호 프로그래밍 01분반
              </div>
            </div>
          </div>

          {/* Main */}
          <main className="flex-grow container mx-auto px-4 py-20">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {currentPosts.map((post) => (
                <Link
                  key={post._id}
                  href={`/gesipan/${post._id}`}
                  className="flex flex-col justify-between bg-gray-100 rounded-lg shadow-md p-6 hover:shadow-lg transition min-h-[260px]"
                >
                  <div className="flex flex-col gap-3">
                    {/* 제목 */}
                    <h2 className="text-lg font-semibold text-gray-800">
                      {post.title}
                    </h2>

                    {/* 작성자 + 날짜: 아래로 살짝 내리기 */}
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>작성자: {post.writer || '익명'}</span>
                      <span>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* 내용: 중간 정도에 위치한 느낌 주기 */}
                    <p className="text-gray-600 line-clamp-3 mt-6 mb-2">
                      {post.content?.slice(0, 80)}...
                    </p>
                  </div>

                  {/* 알고리즘 태그 */}
                  <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded self-start">
                    JWT-RS 인증
                  </span>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {posts.length > postsPerPage && (
              <div className="flex justify-center gap-3 mt-10 text-sm">
                <button
                  className="h-10 px-4 rounded border border-gray-300 text-gray-500 bg-white hover:bg-gray-100"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`h-10 px-4 rounded border ${
                      currentPage === i + 1
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="h-10 px-4 rounded border border-gray-300 text-gray-500 bg-white hover:bg-gray-100"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  다음
                </button>
              </div>
            )}

            {/* Floating Button */}
            <Link
              href="/gesipan/new"
              className="fixed bottom-6 right-6 w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center text-2xl shadow-lg hover:bg-gray-700 transition"
              title="게시글 작성"
            >
              +
            </Link>
          </main>

          {/* Footer */}
          <footer className="w-full border-t border-gray-200 text-center text-sm text-gray-500 py-4">
            © 2025 SecureBoard - 암호화 게시판 시스템
            <br />
            모든 게시물은 선택한 암호화 알고리즘으로 안전하게 보호됩니다.
          </footer>
        </div>
      </>
    </AuthGuard>
  )
}
