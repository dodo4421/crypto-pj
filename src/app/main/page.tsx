'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function MainPage() {
  const [posts, setPosts] = useState([])
  const router = useRouter()

  useEffect(() => {
    axios
      .get('/api/posts')
      .then((res) => setPosts(res.data))
      .catch((err) => console.error(err))
  }, [])

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold mb-4'>📋 게시판</h1>

      <button
        onClick={() => router.push('/main/new')}
        className='bg-blue-600 text-white px-4 py-2 rounded mb-4'
      >
        글쓰기
      </button>

      <ul className='space-y-4'>
        {posts.map((post: any) => (
          <li
            key={post._id}
            className='border p-4 rounded cursor-pointer hover:bg-gray-100'
            onClick={() => router.push(`/main/${post._id}`)}
          >
            <h2 className='text-lg font-semibold'>{post.title}</h2>
            <p className='text-sm text-gray-600'>작성자: {post.authorName}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
