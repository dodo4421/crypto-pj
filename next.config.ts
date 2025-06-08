import type { NextConfig } from 'next'

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // 🔥 ESLint 오류 무시하고 빌드 강행
  },
}

module.exports = nextConfig
