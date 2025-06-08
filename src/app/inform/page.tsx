'use client'

import Link from 'next/link'
import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'

export default function InformPage() {
  const router = useRouter()

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) router.push('/')
  }, [])

  return (
    <AuthGuard>
      <>
        <Head>
          <title>프로젝트 소개 - CryptoCommunity</title>
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
                    <Link href="/gesipan" className="hover:text-blue-500">
                      홈
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/inform"
                      className="text-blue-500 hover:underline"
                    >
                      소개
                    </Link>
                  </li>
                  <li>
                    <Link href="/members" className="hover:text-blue-500">
                      팀원
                    </Link>
                  </li>
                  <li>
                    <Link href="/messages" className="hover:text-blue-500">
                      대화
                    </Link>
                  </li>
                  <li>
                    <Link href="/gesipan/new" className="hover:text-blue-500">
                      작성
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-grow container mx-auto px-4 py-10">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                🔐 CryptoCommunity
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                JWT 인증과 Socket.io를 활용한 실시간 채팅 게시판 시스템
              </p>
            </div>

            {/* Project Overview */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                전체 서비스 흐름
              </h2>
              <div className="bg-white rounded-lg shadow-md p-8">
                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  CryptoCommunity는 JWT 기반 인증 시스템과 Socket.io를 통한
                  실시간 1:1 채팅 기능을 제공하는 게시판 시스템입니다. 게시글
                  작성자와 직접 소통할 수 있는 안전한 커뮤니티 플랫폼입니다.
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl mb-2">🔐</div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      JWT 인증
                    </h3>
                    <p className="text-sm text-gray-600">
                      JWT-RS 방식으로 보안강화
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl mb-2">💬</div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      실시간 채팅
                    </h3>
                    <p className="text-sm text-gray-600">
                      Socket.io 기반 1:1 채팅
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl mb-2">📃</div>
                    <h3 className="font-semibold text-gray-800 mb-2">게시판</h3>
                    <p className="text-sm text-gray-600">
                      작성자와 직접 소통 가능
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Technology Stack */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                기술 스택
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Frontend */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">🌐</span>
                    Frontend (React)
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      <span>
                        <strong>React</strong> - 사용자 인터페이스
                      </span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      <span>
                        <strong>Socket.io Client</strong> - 실시간 통신
                      </span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      <span>
                        <strong>React Router</strong> - 페이지 라우팅
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Backend */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">🔧</span>
                    Backend (Node.js + Express)
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      <span>
                        <strong>Node.js & Express</strong> - 서버 프레임워크
                      </span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      <span>
                        <strong>Socket.io</strong> - 실시간 채팅 처리
                      </span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      <span>
                        <strong>MongoDB</strong> - 데이터베이스
                      </span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      <span>
                        <strong>JWT (RS256)</strong> - 토큰 기반 인증
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Main Features */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                주요 기능
              </h2>
              <div className="space-y-6">
                {/* 인증 시스템 */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">🔐</span>
                    1. 회원가입 & 로그인 (JWT 인증)
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        API 엔드포인트:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • <code>POST /register</code>: 사용자 정보 저장
                          (비밀번호 해시)
                        </li>
                        <li>
                          • <code>POST /login</code>: JWT 토큰 발급
                        </li>
                        <li>
                          • <code>Authorization: Bearer &lt;token&gt;</code>{' '}
                          헤더 사용
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        보안 특징:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • <strong>토큰 만료:</strong> 1시간 후 재로그인 필요
                        </li>
                        <li>
                          • <strong>RS256 암호화:</strong> 공개키/개인키 인증
                        </li>
                        <li>
                          • <strong>localStorage</strong> 와{' '}
                          <strong>cookie</strong> 저장
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 게시판 기능 */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📃</span>
                    2. 게시판 기능
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        API 엔드포인트:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • <code>/gesipan</code>: 게시글 목록 가져오기
                        </li>
                        <li>
                          • <code>/gesipan/new</code>: 게시글 작성 (JWT 검증
                          필요)
                        </li>
                        <li>
                          • <code>/gesipan/id</code>: 게시글 상세 보기
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        핵심 기능:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • 게시글마다 작성자 <code>userId</code> 포함
                        </li>
                        <li>• 게시글 내부로 이동이후 채팅방 이동 가능</li>
                        <li>• JWT 토큰으로 작성 권한 관리</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 채팅 기능 */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">💬</span>
                    3. 1:1 채팅 기능 (Socket.io)
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        API 엔드포인트:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • <code>/api/get-all-users</code>: 유저 목록 불러오기
                          API 제작
                        </li>
                        <li>
                          • <code>/api/socketio.tsx</code>:
                          채팅,유저,검색,대화방 생성 서버
                        </li>
                        <li>
                          • <code>/messages</code>: 유저 목록 필터링하여 메시지
                          가능
                        </li>
                        <li>
                          • <code>/chat/id</code>: 유저와의 실시간 대화 구현
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        동작 방식:
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • 게시글 작성자 클릭 → <code>ChatRoom</code> 페이지
                          이동
                        </li>
                        <li>• 채팅방 ID = 두 userId 조합으로 생성</li>
                        <li>• MongoDB에 대화 내용 저장</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Project Structure */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                프로젝트 구조
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Backend Structure */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">🔧</span>
                    백엔드 구조
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    <div className="space-y-1">
                      <div>📁 /api/auth/register / 회원가입 </div>
                      <div>📁 /api/auth/login / 로그인 </div>
                      <div>📁 /api/gesipan / 게시판 DB</div>
                      <div>📁 /api/get-all-users / 유저 목록</div>
                      <div>🔌 /socket.io / 서버</div>
                    </div>
                  </div>
                </div>

                {/* Frontend Structure */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">🌐</span>
                    프론트엔드 구조
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                    <div className="space-y-1">
                      <div>📄 gesipan.tsx / 홈</div>
                      <div>📄 Register.tsx / 회원가입</div>
                      <div>📄 gesipan/new.tsx / 게시판 작성</div>
                      <div>📄 gesipan/id.tsx / 게시판 상세보기</div>
                      <div>📄 messages.tsx / 메시지목록</div>
                      <div>📄 chat/id.tsx / 대화화면</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Security Files */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                보안 인증서
              </h2>
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl mb-2">🔑</div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      private.pem
                    </h3>
                    <p className="text-sm text-gray-600">
                      JWT 토큰 서명용 개인키
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl mb-2">🔓</div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      public.pem
                    </h3>
                    <p className="text-sm text-gray-600">
                      JWT 토큰 검증용 공개키
                    </p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl mb-2">🔒</div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      1:1 채팅 대화 암호화
                    </h3>
                    <p className="text-sm text-gray-600">AES-256 사용</p>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-gray-700">
                    <strong>RS256 알고리즘</strong>을 사용하여 공개키/개인키
                    쌍으로 JWT 토큰의 보안성을 강화하고,{' '}
                    <strong>AES-256</strong>으로 채팅 메시지를 암호화합니다.
                  </p>
                </div>
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="w-full border-t border-gray-200 text-center text-sm text-gray-500 py-4">
            © 2025 CryptoCommunity - JWT 인증 기반 실시간 채팅 게시판
            <br />
            모든 사용자 인증은 JWT 토큰으로 안전하게 관리됩니다.
          </footer>
        </div>
      </>
    </AuthGuard>
  )
}
