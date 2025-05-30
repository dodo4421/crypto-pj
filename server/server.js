const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const postsRouter = require('./routes/posts')

dotenv.config() // ✅ .env 파일 불러오기

const app = express()
const PORT = 5000

// ✅ 미들웨어
app.use(cors())
app.use(express.json())

// ✅ 라우터
app.use('/api/posts', postsRouter)

// ✅ DB 연결
mongoose
  .connect(process.env.MONGODB_URI) // ← 이거 맞아!
  .then(() => {
    console.log('MongoDB 연결 완료')
    app.listen(PORT, () => {
      console.log(`서버 실행 중: http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB 연결 실패', err)
  })
