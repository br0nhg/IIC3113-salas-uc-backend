'use strict';

const seed = require('./data/scraped-2026-2.json');

const timestamped = (rows) => rows.map((row) => ({
  ...row,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.bulkDelete('RoomOccupancies', null, options);
      await queryInterface.bulkDelete('Courses', null, options);
      await queryInterface.bulkDelete('Rooms', null, options);
      await queryInterface.bulkDelete('Buildings', null, options);
      await queryInterface.bulkDelete('TimeModules', null, options);
      await queryInterface.bulkDelete('Days', null, options);

      await queryInterface.bulkInsert('Buildings', timestamped(seed.buildings), options);
      await queryInterface.bulkInsert('Days', timestamped(seed.days), options);
      await queryInterface.bulkInsert('TimeModules', timestamped(seed.modules), options);
      await queryInterface.bulkInsert('Courses', timestamped(seed.courses), options);

      const buildings = await queryInterface.sequelize.query(
        'SELECT id, code FROM "Buildings"',
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const buildingIds = new Map(buildings.map((row) => [row.code, row.id]));

      await queryInterface.bulkInsert(
        'Rooms',
        timestamped(seed.rooms.map((row) => ({
          name: row.name,
          buildingId: buildingIds.get(row.buildingCode),
          capacity: row.capacity,
          floor: row.floor,
        }))),
        options,
      );

      const rooms = await queryInterface.sequelize.query(
        'SELECT id, name FROM "Rooms"',
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const days = await queryInterface.sequelize.query(
        'SELECT id, code FROM "Days"',
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const modules = await queryInterface.sequelize.query(
        'SELECT id, number FROM "TimeModules"',
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const courses = await queryInterface.sequelize.query(
        'SELECT id, code FROM "Courses"',
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );

      const roomIds = new Map(rooms.map((row) => [row.name, row.id]));
      const dayIds = new Map(days.map((row) => [row.code, row.id]));
      const moduleIds = new Map(modules.map((row) => [row.number, row.id]));
      const courseIds = new Map(courses.map((row) => [row.code, row.id]));

      await queryInterface.bulkInsert(
        'RoomOccupancies',
        timestamped(seed.occupancies.map((row) => ({
          roomId: roomIds.get(row.roomName),
          buildingId: buildingIds.get(row.buildingCode),
          dayId: dayIds.get(row.dayCode),
          moduleId: moduleIds.get(row.moduleNumber),
          courseId: row.courseCode ? courseIds.get(row.courseCode) : null,
          isFree: row.isFree,
        }))),
        options,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.bulkDelete('RoomOccupancies', null, options);
      await queryInterface.bulkDelete('Courses', null, options);
      await queryInterface.bulkDelete('Rooms', null, options);
      await queryInterface.bulkDelete('Buildings', null, options);
      await queryInterface.bulkDelete('TimeModules', null, options);
      await queryInterface.bulkDelete('Days', null, options);
    });
  },
};
