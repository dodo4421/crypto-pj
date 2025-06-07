'use client'

import Link from 'next/link'
import Image from 'next/image'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'

export default function Home() {
  const router = useRouter()
  const [posts, setPosts] = useState([])

  // accessToken 확인 후 인증되지 않으면 로그인 페이지로 이동
  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) {
      router.push('/')
    }
  }, [])

  // 게시글 목록 불러오기
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

        <div className="container">
          <header>
            <div className="logo">CryptoCommunity</div>
            <nav>
              <ul>
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
                  <Link href="/gesipan/new">작성</Link>
                </li>
              </ul>
            </nav>
          </header>

          <div className="post-list">
            {posts.map((post: any) => (
              <div className="post-card" key={post._id}>
                <div className="post-title">{post.title}</div>
                <div className="post-info">
                  <span>작성자: {post.writer || '익명'}</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="post-excerpt">
                  {post.content?.slice(0, 40) || ''}...
                </div>
                <div className="encryption-tag">AES-256</div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button>이전</button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <button>다음</button>
          </div>

          <div className="create-post" title="게시글 작성">
            +
          </div>

          <footer>
            <p>© 2025 SecureBoard - 암호화 게시판 시스템</p>
            <p>모든 게시물은 선택한 암호화 알고리즘으로 안전하게 보호됩니다.</p>
          </footer>
        </div>

        <style jsx>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Noto Sans KR', sans-serif;
          }
          body {
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0;
            border-bottom: 1px solid #ddd;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
          }
          nav ul {
            display: flex;
            list-style: none;
          }
          nav ul li {
            margin-left: 20px;
          }
          nav ul li a {
            text-decoration: none;
            color: #2c3e50;
            padding: 8px 12px;
            border-radius: 4px;
            transition: background-color 0.3s;
          }
          nav ul li a:hover {
            background-color: #e9ecef;
          }
          .active {
            background-color: #2c3e50;
            color: white;
          }
          .post-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
          }
          .post-card {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            padding: 20px;
            transition: transform 0.3s, box-shadow 0.3s;
          }
          .post-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          }
          .post-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #2c3e50;
          }
          .post-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
            color: #6c757d;
          }
          .post-excerpt {
            font-size: 14px;
            color: #495057;
            margin-bottom: 15px;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .encryption-tag {
            display: inline-block;
            padding: 4px 8px;
            background-color: #e3f2fd;
            color: #0d47a1;
            border-radius: 4px;
            font-size: 12px;
          }
          .pagination {
            display: flex;
            justify-content: center;
            margin-top: 30px;
          }
          .pagination button {
            margin: 0 5px;
            padding: 8px 12px;
            border: 1px solid #ddd;
            background-color: white;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
          }
          .pagination button.active {
            background-color: #2c3e50;
            color: white;
            border-color: #2c3e50;
          }
          .pagination button:hover:not(.active) {
            background-color: #f1f1f1;
          }
          footer {
            text-align: center;
            padding: 20px;
            margin-top: 40px;
            border-top: 1px solid #ddd;
            color: #6c757d;
            font-size: 14px;
          }
          .create-post {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            background-color: #2c3e50;
            color: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: background-color 0.3s, transform 0.3s;
          }
          .create-post:hover {
            background-color: #1e2b3c;
            transform: translateY(-3px);
          }
        `}</style>
      </>
    </AuthGuard>
  )
}
