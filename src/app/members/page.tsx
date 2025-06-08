import React from 'react'
import Link from 'next/link'
import { FaGithub } from 'react-icons/fa' // GitHub 아이콘

const members = [
  {
    name: '이태연',
    info: '정보보호학과 20학번',
    role: 'AI개발, 프론트엔드',
    github: 'https://github.com/leetaeyeon11111',
    githubId: 'leetaeyeon11111',
  },
  {
    name: '장재원',
    info: '정보보호학과 20학번',
    role: 'AI개발, 프론트엔드',
    github: 'https://github.com/dodo4421',
    githubId: 'dodo4421',
  },
  {
    name: '서우석',
    info: '정보보호학과 20학번',
    role: 'AI개발, 프론트엔드',
    github: 'https://github.com/wooseok0301',
    githubId: 'wooseok0301',
  }
]

const pageContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#f8fafc',
}

const headerStyle: React.CSSProperties = {
  width: '100%',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: 'white',
  position: 'sticky',
  top: 0,
  zIndex: 50,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
}

const headerContainerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const logoContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const logoStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  backgroundColor: '#3b82f6',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontWeight: 'bold',
}

const logoTextStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  listStyle: 'none',
  gap: '24px',
  margin: 0,
  padding: 0,
  color: '#4b5563',
}

const navLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: '#4b5563',
  transition: 'color 0.2s',
}

const activeLinkStyle: React.CSSProperties = {
  color: '#3b82f6',
  fontWeight: '500',
}

const createButtonStyle: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  color: 'white',
  padding: '6px 12px',
  borderRadius: '8px',
  textDecoration: 'none',
  transition: 'background-color 0.2s',
}

const wrapperStyle: React.CSSProperties = {
  padding: '40px 20px',
  fontFamily: 'sans-serif',
}

const titleStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: '32px',
  fontWeight: 'bold',
  marginBottom: '40px',
  color: '#1e293b',
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '20px',
}

const cardStyle: React.CSSProperties = {
  width: '200px',
  border: '1px solid #ccc',
  borderRadius: '12px',
  padding: '16px',
  margin: '10px',
  backgroundColor: '#fff',
  textAlign: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
}

const profileImageStyle: React.CSSProperties = {
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  objectFit: 'cover',
  margin: '0 auto 12px',
  backgroundColor: '#eee',
}

const linkStyle: React.CSSProperties = {
  color: '#333',
  marginTop: '10px',
  display: 'inline-block',
}

export default function Members() {
  return (
    <div style={pageContainerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerContainerStyle}>
          <div style={logoContainerStyle}>
            <div style={logoStyle}>
              🔐
            </div>
            <div style={logoTextStyle}>
              CryptoCommunity
            </div>
          </div>
          <nav>
            <ul style={navStyle}>
              <li>
                <Link href="/gesipan" style={navLinkStyle}>홈</Link>
              </li>
              <li>
                <Link href="/inform" style={navLinkStyle}>소개</Link>
              </li>
              <li>
                <Link href="/members" style={{...navLinkStyle, ...activeLinkStyle}}>팀원</Link>
              </li>
              <li>
                <Link href="/messages" style={navLinkStyle}>대화</Link>
              </li>
              <li>
                <Link href="/gesipan/new">
                  작성
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div style={wrapperStyle}>
        <h2 style={titleStyle}>팀원 소개</h2>
        <div style={containerStyle}>
          {members.map((member, index) => (
            <div key={index} style={cardStyle}>
              <img
                src={`https://github.com/${member.githubId}.png`}
                alt={`${member.name} 프로필`}
                style={profileImageStyle}
              />
              <h3>{member.name}</h3>
              <p>{member.info}</p>
              <p>{member.role}</p>
              <a
                href={member.github}
                target='_blank'
                rel='noopener noreferrer'
                style={linkStyle}
              >
                <FaGithub size={24} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
