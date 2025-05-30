const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')

const publicKey = fs.readFileSync(path.join(__dirname, '../public.pem'))

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] })
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: '유효하지 않은 토큰입니다' })
  }
}
