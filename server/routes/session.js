const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const StudySession = require('../models/StudySession');

// 开始自习
router.post('/start', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const session = await StudySession.create({
    user_id: userId,
    start_time: new Date()
  });
  res.json({ sessionId: session.id });
});

// 结束自习（保存数据）
router.post('/end/:sessionId', verifyToken, async (req, res) => {
  const { sessionId } = req.params;
  const { distraction_count, distraction_details, total_focus_time } = req.body;
  const session = await StudySession.findByPk(sessionId);

  const end_time = new Date();
  const duration = Math.floor((end_time - new Date(session.start_time)) / 1000);
  const focus_rate = duration > 0 ? ((total_focus_time / duration) * 100).toFixed(2) : 0;

  await session.update({
    end_time,
    duration,
    total_focus_time,
    distraction_count,
    distraction_details,
    focus_rate
  });

  res.json({ msg: '保存成功' });
});

// 历史记录
router.get('/history', verifyToken, async (req, res) => {
  const list = await StudySession.findAll({
    where: { user_id: req.user.id },
    order: [['start_time', 'DESC']]
  });
  res.json(list);
});

module.exports = router;