const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const StudySession = sequelize.define('StudySession', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '会话ID'
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '关联用户ID'
  },
  session_name: {
    type: DataTypes.STRING(100),
    defaultValue: '自习会话',
    comment: '会话名称'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '开始时间'
  },
  end_time: {
    type: DataTypes.DATE,
    comment: '结束时间'
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总时长(秒)'
  },
  total_focus_time: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '专注时长(秒)'
  },
  distraction_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '分心次数'
  },
  distraction_details: {
    type: DataTypes.JSON,
    defaultValue: null,
    comment: '分心详情'
  },
  focus_rate: {
    type: DataTypes.DECIMAL(5,2),
    defaultValue: 0.00,
    comment: '专注率(%)'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'study_sessions',
  timestamps: false
});

// 建立用户-会话关联
User.hasMany(StudySession, { foreignKey: 'user_id', onDelete: 'CASCADE' });
StudySession.belongsTo(User, { foreignKey: 'user_id' });

module.exports = StudySession;