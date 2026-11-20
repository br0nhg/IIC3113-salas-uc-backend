'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OccupancyReports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      // Sin FK: el scraper borra y recrea Rooms.
      roomName: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      date: {
        allowNull: false,
        type: Sequelize.DATEONLY,
      },
      module: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      reason: {
        allowNull: false,
        type: Sequelize.STRING(20),
      },
      detail: {
        allowNull: false,
        defaultValue: '',
        type: Sequelize.STRING(300),
      },
      status: {
        allowNull: false,
        defaultValue: 'pending',
        type: Sequelize.STRING(10),
      },
      // Fin del bloqueo que fija el administrador al aceptar.
      blockedUntilDate: {
        allowNull: true,
        type: Sequelize.DATEONLY,
      },
      blockedUntilModule: {
        allowNull: true,
        type: Sequelize.INTEGER,
      },
      reviewedBy: {
        allowNull: true,
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
      },
      reviewedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex('OccupancyReports', ['status', 'date']);
    await queryInterface.addIndex('OccupancyReports', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('OccupancyReports');
  },
};
