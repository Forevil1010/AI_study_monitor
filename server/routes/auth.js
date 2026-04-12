const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 注册（带重复密码验证）
router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    // ================== 你要的：重复密码验证 ==================
    if (password !== confirmPassword) {
      return res.status(400).json({
        code: 400,
        msg: '两次密码输入不一致'
      });
    }
    // =========================================================

    // 检查用户名是否存在
    const exist = await User.findOne({ where: { username } });
    if (exist) {
      return res.status(409).json({ code: 409, msg: '用户名已存在' });
    }

    // 密码加密
    const hashedPwd = await bcrypt.hash(password, 10);

    // 创建用户
    await User.create({
      username,
      password: hashedPwd
    });

    res.json({ code: 200, msg: '注册成功' });

  } catch (err) {
    res.status(500).json({ code: 500, msg: '注册失败' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ code: 401, msg: '用户不存在' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ code: 401, msg: '密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      'secret123456',
      { expiresIn: '7d' }
    );

    res.json({
      code: 200,
      msg: '登录成功',
      token,
      user: { id: user.id, username: user.username }
    });

  } catch (err) {
    res.status(500).json({ code: 500, msg: '登录失败' });
  }
});

module.exports = router;