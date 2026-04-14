const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'secret123'; // 必须和前端一致
const PY_DETECT_URL = process.env.PY_DETECT_URL || 'http://127.0.0.1:5001/detect';

// 中间件
app.use(cors());
app.use(express.json());

// 原生 MySQL 连接（你的空密码）
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ai_study_monitor',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/** 启动时建表，并给已有旧表补缺失列（避免 Unknown column / 表不存在 导致 500） */
async function ensureSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      password VARCHAR(255) NOT NULL,
      UNIQUE KEY uk_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      session_name VARCHAR(100) NOT NULL DEFAULT '自习会话',
      start_time DATETIME NOT NULL,
      end_time DATETIME NULL,
      duration INT NOT NULL DEFAULT 0,
      total_focus_time INT NOT NULL DEFAULT 0,
      distraction_count INT NOT NULL DEFAULT 0,
      distraction_details TEXT NULL,
      focus_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      KEY idx_study_sessions_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [colRows] = await db.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'study_sessions'`
  );
  const existing = new Set(colRows.map((r) => r.COLUMN_NAME));
  const additions = [
    ['session_name', "VARCHAR(100) NOT NULL DEFAULT '自习会话'"],
    ['start_time', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'],
    ['end_time', 'DATETIME NULL'],
    ['duration', 'INT NOT NULL DEFAULT 0'],
    ['total_focus_time', 'INT NOT NULL DEFAULT 0'],
    ['distraction_count', 'INT NOT NULL DEFAULT 0'],
    ['distraction_details', 'TEXT NULL'],
    ['focus_rate', 'DECIMAL(5,2) NOT NULL DEFAULT 0.00'],
  ];
  for (const [name, definition] of additions) {
    if (existing.has(name)) continue;
    try {
      await db.execute(`ALTER TABLE study_sessions ADD COLUMN \`${name}\` ${definition}`);
      console.log(`✅ 已补充列 study_sessions.${name}`);
      existing.add(name);
    } catch (e) {
      console.error(`补充列 study_sessions.${name} 失败:`, e.message);
    }
  }
}

// ================= Token 校验中间件（原生版，绝对可靠）=================
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ msg: '请先登录' }); // 明确提示
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // 把用户信息挂到 req
    next(); // 校验通过，进入接口
  } catch (err) {
    return res.status(401).json({ msg: 'Token 无效，请重新登录' });
  }
};

// ================= 注册接口 =================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ msg: '请填写完整信息' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ msg: '两次密码不一致' });
    }

    // 检查用户名是否存在
    const [users] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (users.length > 0) {
      return res.status(400).json({ msg: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入用户（只插三个字段，绝对不碰时间）
    await db.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    res.json({ msg: '注册成功' });
  } catch (err) {
    console.error('注册错误:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// ================= 登录接口 =================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 原生 SQL 只查需要的字段，绝对不查 createdAt
    const [users] = await db.execute(
      'SELECT id, username, password FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ msg: '用户不存在' });
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(400).json({ msg: '密码错误' });
    }

    // 生成 Token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, msg: '登录成功' });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// ================= 开始会话接口（最终修复版，100%兼容表结构）=================
app.post('/api/session/start', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ msg: '登录状态异常，请重新登录' });
    }
    const now = new Date();

    // 只写必填列，其余走表默认值（与 ensureSchema 中的表结构一致）
    const [result] = await db.execute(
      'INSERT INTO study_sessions (user_id, start_time) VALUES (?, ?)',
      [userId, now]
    );

    console.log('会话创建成功，ID:', result.insertId);
    res.json({ sessionId: result.insertId, msg: '会话已开始' });
  } catch (err) {
    // 打印完整错误，方便排查
    console.error('=== 开始会话错误详情 ===');
    console.error('错误信息:', err.message);
    console.error('错误栈:', err.stack);
    res.status(500).json({ msg: '开始会话失败', error: err.message });
  }
});

// ================= 分心检测（转发到 Python mediapipe 服务）=================
app.post('/api/detect', authenticateToken, async (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ msg: '缺少 image 字段' });
    }

    const pyRes = await fetch(PY_DETECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image })
    });

    if (!pyRes.ok) {
      const text = await pyRes.text();
      return res.status(502).json({ msg: 'Python 检测服务异常', error: text });
    }

    const pyData = await pyRes.json();
    const label = pyData?.label || '';
    const isDistracted = label && label !== '专注学习';
    const reason = isDistracted ? label : '';

    res.json({
      isDistracted,
      reason,
      label,
      class: pyData?.class,
      confidence: pyData?.confidence,
      baidu: pyData?.baidu
    });
  } catch (err) {
    console.error('分心检测转发错误:', err.message);
    res.status(500).json({ msg: '分心检测失败', error: err.message });
  }
});

// ================= 结束会话接口 =================
app.post('/api/session/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId, distractionCount = 0 } = req.body;
    const userId = Number(req.user.id);
    const now = new Date();

    // 查询当前会话
    const [sessions] = await db.execute(
      'SELECT start_time FROM study_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ msg: '会话不存在' });
    }

    const session = sessions[0];
    const startTime = new Date(session.start_time);
    const duration = Math.floor((now - startTime) / 1000);
    const focusRate = Math.max(0, 100 - (distractionCount * 5));

    // 更新会话
    await db.execute(
      `UPDATE study_sessions 
      SET end_time = ?, duration = ?, distraction_count = ?, focus_rate = ? 
      WHERE id = ? AND user_id = ?`,
      [now, duration, distractionCount, focusRate, sessionId, userId]
    );

    res.json({ msg: '会话已结束', duration });
  } catch (err) {
    console.error('结束会话错误:', err);
    res.status(500).json({ msg: '结束会话失败' });
  }
});

// ================= 专注历史（已结束会话）=================
app.get('/api/session/history', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const [rows] = await db.execute(
      `SELECT id, session_name, start_time, end_time, duration, distraction_count, focus_rate
       FROM study_sessions
       WHERE user_id = ? AND end_time IS NOT NULL
       ORDER BY start_time DESC
       LIMIT 100`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('历史记录错误:', err);
    res.status(500).json({ msg: '获取历史失败', error: err.message });
  }
});

async function start() {
  try {
    await ensureSchema();
  } catch (e) {
    console.error('❌ 初始化数据库表失败（请确认库 ai_study_monitor 已创建、账号密码正确）:', e.message);
  }
  app.listen(PORT, () => {
    console.log(`✅ 后端服务已启动，访问地址：http://localhost:${PORT}`);
  });
}

start();