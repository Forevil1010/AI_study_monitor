const express = require('express')
const cors = require('cors')
const app = express()

// ===================== 数据库配置（你的库名：ai_study_monitor）=====================
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('ai_study_monitor', 'root', '', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false
});

// ===================== 用户模型 =====================
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'users', timestamps: false });

// ===================== 会话模型 =====================
const StudySession = sequelize.define('StudySession', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  start_time: DataTypes.DATE,
  end_time: DataTypes.DATE,
  duration: DataTypes.INTEGER,
  total_focus_time: DataTypes.INTEGER,
  distraction_count: DataTypes.INTEGER,
  distraction_details: DataTypes.JSON,
  focus_rate: DataTypes.DECIMAL(5,2)
}, { tableName: 'study_sessions', timestamps: false });

// 关联
User.hasMany(StudySession, { foreignKey: 'user_id' });
StudySession.belongsTo(User, { foreignKey: 'user_id' });

// ===================== 加密 & Token =====================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 中间件配置
app.use(cors())
app.use(express.json())

// ===================== 注册（真实 + 重复密码验证）=====================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    // 你要的：两次密码不一致判断
    if (password !== confirmPassword) {
      return res.status(400).json({ code: 400, msg: "两次密码不一致" });
    }

    const exist = await User.findOne({ where: { username } });
    if (exist) return res.status(400).json({ code: 400, msg: "用户名已存在" });

    const hashedPwd = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPwd });

    res.json({ code: 200, msg: "注册成功" });
  } catch (err) {
    res.status(500).json({ code: 500, msg: "注册失败" });
  }
});

// ===================== 登录（真实验证）=====================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ code: 401, msg: "用户不存在" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ code: 401, msg: "密码错误" });

    const token = jwt.sign({ id: user.id, username: user.username }, 'secret123', { expiresIn: '7d' });
    res.json({ code: 200, msg: "登录成功", token });
  } catch (err) {
    res.status(500).json({ code: 500, msg: "登录失败" });
  }
});

// ===================== 登录验证中间件 =====================
const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ code: 401, msg: "请登录" });

  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, 'secret123');
    next();
  } catch (e) {
    res.status(401).json({ code: 401, msg: "登录已过期" });
  }
};

// ===================== 开始专注会话（存数据库）=====================
app.post('/api/session/start', verifyToken, async (req, res) => {
  const session = await StudySession.create({
    user_id: req.user.id,
    start_time: new Date()
  });
  res.json({ code: 200, msg: "已开始专注", sessionId: session.id });
});

// ===================== 结束专注会话（保存分心数据）=====================
app.post('/api/session/end', verifyToken, async (req, res) => {
  const { sessionId, distraction_count, distraction_details, total_focus_time } = req.body;
  const session = await StudySession.findByPk(sessionId);
  if (!session) return res.status(404).json({ code: 404, msg: "会话不存在" });

  const end_time = new Date();
  const duration = Math.floor((end_time - new Date(session.start_time)) / 1000);
  const focus_rate = duration > 0 ? ((total_focus_time / duration) * 100).toFixed(2) : 0;

  await session.update({
    end_time, duration, total_focus_time, distraction_count, distraction_details, focus_rate
  });

  res.json({ code: 200, msg: "已保存专注记录" });
});

// ===================== 历史记录 =====================
app.get('/api/session/history', verifyToken, async (req, res) => {
  const list = await StudySession.findAll({
    where: { user_id: req.user.id }, order: [['start_time', 'DESC']]
  });
  res.json({ code: 200, data: list });
});

// ===================== 分心检测（Mock不变）=====================
app.post('/api/detect', (req, res) => {
  const isDistracted = Math.random() < 0.3
  res.json({ code: 200, isDistracted, reason: isDistracted ? "低头分心" : "正常专注" })
})

// ===================== 同步数据库 =====================
sequelize.sync({ alter: true }).then(() => {
  console.log("✅ 数据库表已同步");
});

// 启动服务
const PORT = 3000
app.listen(PORT, () => {
  console.log(`✅ 后端服务已启动，访问地址：http://localhost:${PORT}`)
})