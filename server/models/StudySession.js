const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const StudySession = sequelize.define('StudySession', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  },
  session_name: {
    type: DataTypes.STRING(100),
    defaultValue: '自习会话'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_focus_time: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  distraction_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  distraction_details: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  focus_rate: {
    type: DataTypes.DECIMAL(5,2),
    defaultValue: 0.00
  }
}, {
  tableName: 'study_sessions',
  timestamps: false,
  createdAt: false,
  updatedAt: false,
  underscored: false,
  freezeTableName: true
});

User.hasMany(StudySession, { foreignKey: 'user_id', onDelete: 'CASCADE' });
StudySession.belongsTo(User, { foreignKey: 'user_id' });

module.exports = StudySession;