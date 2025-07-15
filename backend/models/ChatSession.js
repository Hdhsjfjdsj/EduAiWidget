const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatSession = sequelize.define('ChatSession', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // createdAt and updatedAt are managed by Sequelize
  });
  return ChatSession;
}; 