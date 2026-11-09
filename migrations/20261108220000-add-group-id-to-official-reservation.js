'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OfficialReservations', 'groupId', {
      allowNull: true,
      type: Sequelize.UUID,
    });
    // Las filas antiguas que pertenecen a la misma reserva (varios módulos)
    // reciben el mismo identificador antes de volver obligatoria la columna.
    await queryInterface.sequelize.query(`
      UPDATE "OfficialReservations" AS reservation
      SET "groupId" = grouped."groupId"
      FROM (
        SELECT "roomName", "date", "reason", gen_random_uuid() AS "groupId"
        FROM "OfficialReservations"
        GROUP BY "roomName", "date", "reason"
      ) AS grouped
      WHERE reservation."roomName" = grouped."roomName"
        AND reservation."date" = grouped."date"
        AND reservation."reason" = grouped."reason"
    `);
    await queryInterface.changeColumn('OfficialReservations', 'groupId', {
      allowNull: false,
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    });
    await queryInterface.addIndex('OfficialReservations', ['groupId']);
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('OfficialReservations', 'groupId');
  },
};
