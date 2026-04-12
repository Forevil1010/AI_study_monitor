const { Sequelize } = require('sequelize');

// 连接你本地的ai_study数据库，XAMPP默认root无密码
const sequelize = new Sequelize('ai_study_monitor', 'root', '', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false // 关闭SQL日志，控制台更干净
});

// 测试连接
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
  } catch (err) {
    console.error('❌ 数据库连接失败:', err);
  }
})();

module.exports = sequelize;