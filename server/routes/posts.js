const express = require('express')
const router = express.Router()
const Post = require('../models/Post')
const verifyToken = require('../middleware/verifyToken') // JWT 인증 미들웨어

// 📄 1. 게시글 목록 가져오기 (GET /api/posts)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 })
    res.json(posts)
  } catch (err) {
    res.status(500).json({ error: '게시글 목록 조회 실패' })
  }
})

// ✏️ 2. 게시글 작성 (POST /api/posts) — JWT 필요
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, content } = req.body

    const newPost = new Post({
      title,
      content,
      authorId: req.user._id,
      authorName: req.user.nickname || req.user.email || '익명',
    })

    await newPost.save()
    res.status(201).json(newPost)
  } catch (err) {
    res.status(500).json({ error: '게시글 작성 실패' })
  }
})

// 🔍 3. 게시글 상세 보기 (GET /api/posts/:id)
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없음' })
    res.json(post)
  } catch (err) {
    res.status(500).json({ error: '게시글 조회 실패' })
  }
})

module.exports = router
