const express = require('express')
const cors = require('cors')
const app = express()

// 中间件配置
app.use(cors()) // 允许跨域
app.use(express.json()) // 解析JSON格式请求体

app.post('/api/register', (req, res) => {
  const { username, password } = req.body
  res.json({ code: 200, msg: '注册成功' })
})

// 1. 登录接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  // Day5 接入数据库后做真实校验，Day1用mock数据
  res.json({
    code: 200,
    msg: '登录成功',
    token: 'mock-token-' + Date.now()
  })
})

// 2. 开始专注会话接口
app.post('/api/session/start', (req, res) => {
  res.json({
    code: 200,
    msg: '已开始专注会话',
    sessionId: Date.now() // 用时间戳模拟会话ID
  })
})

// 3. 结束专注会话接口
app.post('/api/session/end', (req, res) => {
  res.json({
    code: 200,
    msg: '已结束专注会话'
  })
})

// 分心检测Mock接口（后续替换为真实MediaPipe逻辑）
app.post('/api/detect', (req, res) => {
  // 模拟随机返回分心/专注，后续替换为真实AI检测
  const isDistracted = Math.random() < 0.3
  res.json({
    code: 200,
    isDistracted,
    reason: isDistracted ? "低头分心" : "正常专注"
  })
})

// 启动服务
const PORT = 3000
app.listen(PORT, () => {
  console.log(`✅ 后端服务已启动，访问地址：http://localhost:${PORT}`)
})