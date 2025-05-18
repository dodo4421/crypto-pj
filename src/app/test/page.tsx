'use client'

import Image from 'next/image'
import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>
          SecureBoard - 암호화 게시판 시스템dㄴㅇㄻㄴㅇㄻㄴㅇㄻㄹㄹdd
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="container">
        <header>
          <div className="logo">SecureBoard</div>
          <nav>
            <ul>
              <li>
                <a href="#" className="active">
                  홈
                </a>
              </li>
              <li>
                <a href="#">작성</a>
              </li>
              <li>
                <a href="#">프로필</a>
              </li>
              <li>
                <a href="#">로그인</a>
              </li>
            </ul>
          </nav>
        </header>

        <div className="search-container">
          <input
            type="text"
            className="search-box"
            placeholder="게시글 검색..."
          />
          <button className="search-btn">검색</button>
        </div>

        <div className="post-list">
          {/* 게시글 카드 반복 */}
          <div className="post-card">
            <div className="post-title">보안 강화된 게시판 시스템의 필요성</div>
            <div className="post-info">
              <span>작성자: 관리자</span>
              <span>2025.05.18</span>
            </div>
            <div className="post-excerpt">
              오늘날 인터넷 환경에서 정보 보안은 매우 중요한 요소입니다...
            </div>
            <div className="encryption-tag">AES-256</div>
          </div>
          {/* 추가 카드 생략 */}
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
        .search-container {
          margin: 30px 0;
          display: flex;
          justify-content: center;
        }
        .search-box {
          width: 60%;
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 4px 0 0 4px;
          font-size: 16px;
        }
        .search-btn {
          padding: 10px 15px;
          background-color: #2c3e50;
          border: 1px solid #2c3e50;
          color: white;
          border-radius: 0 4px 4px 0;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .search-btn:hover {
          background-color: #1e2b3c;
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
  )
}
