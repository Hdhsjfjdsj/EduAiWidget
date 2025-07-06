const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VectorEntry = sequelize.define('VectorEntry', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    documentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    urlSourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    embedding: {
      type: DataTypes.ARRAY(DataTypes.FLOAT), // For Sequelize, DB column is vector
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  });
  return VectorEntry;
};
