'use client'

import Link from 'next/link'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'

export default function GesipanHome() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const postsPerPage = 6

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) router.push('/')
  }, [])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/gesipan')
        const data = await res.json()
        setPosts(data)
      } catch (err) {
        console.error('게시글 로딩 실패:', err)
      }
    }
    fetchPosts()
  }, [])

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
            name='viewport'
            content='width=device-width, initial-scale=1.0'
          />
        </Head>

        <div className='min-h-screen flex flex-col'>
          {/* Header */}
          <header className='w-full border-b border-gray-200'>
            <div className='container mx-auto px-4 py-4 flex justify-between items-center'>
              <div className='text-2xl font-bold text-gray-800'>
                CryptoCommunity
              </div>
              <nav>
                <ul className='flex gap-6 text-gray-700 text-m'>
                  <li>
                    <Link
                      href='/gesipan'
                      className='text-blue-500 hover:underline'
                    >
                      홈
                    </Link>
                  </li>
                  <li>
                    <Link href='/members'>소개</Link>
                  </li>
                  <li>
                    <Link href='/members'>팀원</Link>
                  </li>
                  <li>
                    <Link href='/gesipan/new'>작성</Link>
                  </li>
                </ul>
              </nav>
            </div>
          </header>

          {/* Main */}
          <main className='flex-grow container mx-auto px-4 py-10'>
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {currentPosts.map((post: any) => (
                <Link
                  key={post._id}
                  href={`/gesipan/${post._id}`}
                  className='block bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition'
                >
                  <div className='text-lg font-semibold text-gray-800 mb-1'>
                    {post.title}
                  </div>
                  <div className='flex justify-between text-sm text-gray-500 mb-2'>
                    <span>작성자: {post.writer || '익명'}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className='text-gray-600 line-clamp-2'>
                    {post.content?.slice(0, 40)}...
                  </p>
                  <span className='inline-block mt-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded'>
                    AES-256
                  </span>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {posts.length > postsPerPage && (
              <div className='flex justify-center gap-3 mt-10 text-sm'>
                <button
                  className='h-10 px-4 rounded border border-gray-300 text-gray-500 bg-white hover:bg-gray-100'
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
                  className='h-10 px-4 rounded border border-gray-300 text-gray-500 bg-white hover:bg-gray-100'
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  다음
                </button>
              </div>
            )}

            {/* Floating Button */}
            <Link
              href='/gesipan/new'
              className='fixed bottom-6 right-6 w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center text-2xl shadow-lg hover:bg-gray-700 transition'
              title='게시글 작성'
            >
              +
            </Link>
          </main>

          {/* Footer */}
          <footer className='w-full border-t border-gray-200 text-center text-sm text-gray-500 py-4'>
            © 2025 SecureBoard - 암호화 게시판 시스템
            <br />
            모든 게시물은 선택한 암호화 알고리즘으로 안전하게 보호됩니다.
          </footer>
        </div>
      </>
    </AuthGuard>
  )
}
