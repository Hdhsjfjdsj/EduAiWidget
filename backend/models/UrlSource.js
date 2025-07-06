const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UrlSource = sequelize.define('UrlSource', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    addedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });
  return UrlSource;
};


