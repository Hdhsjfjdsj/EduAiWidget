'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Ensure pgvector extension is enabled
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector');
    await queryInterface.createTable('VectorEntries', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      documentId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      urlSourceId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      embedding: {
        type: 'vector(768)', // pgvector column, now matches Gemini
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('VectorEntries');
  }
};
