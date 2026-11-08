'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OfficialReservations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
        type: Sequelize.STRING(200),
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
    await queryInterface.addIndex('OfficialReservations', ['roomName', 'date', 'module'], {
      unique: true,
      name: 'official_reservations_room_date_module_unique',
    });
    await queryInterface.addIndex('OfficialReservations', ['date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('OfficialReservations');
  },
};
