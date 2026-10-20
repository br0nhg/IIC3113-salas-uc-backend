'use strict';

const fs = require('fs');
const path = require('path');
const {
  sequelize,
  Building,
  Room,
  Day,
  TimeModule,
  Course,
  RoomOccupancy,
} = require('../models');

async function exportSeed() {
  await sequelize.authenticate();

  const [buildings, rooms, days, modules, courses, occupancies] = await Promise.all([
    Building.findAll({ raw: true, order: [['code', 'ASC']] }),
    Room.findAll({ raw: true, order: [['name', 'ASC']] }),
    Day.findAll({ raw: true, order: [['id', 'ASC']] }),
    TimeModule.findAll({ raw: true, order: [['number', 'ASC']] }),
    Course.findAll({ raw: true, order: [['code', 'ASC']] }),
    RoomOccupancy.findAll({ raw: true, order: [['id', 'ASC']] }),
  ]);

  const buildingsById = new Map(buildings.map((row) => [row.id, row.code]));
  const roomsById = new Map(rooms.map((row) => [row.id, row.name]));
  const daysById = new Map(days.map((row) => [row.id, row.code]));
  const modulesById = new Map(modules.map((row) => [row.id, row.number]));
  const coursesById = new Map(courses.map((row) => [row.id, row.code]));

  const data = {
    semester: '2026-2',
    generatedAt: new Date().toISOString(),
    buildings: buildings.map(({ code, name, description }) => ({ code, name, description })),
    rooms: rooms.map(({ name, buildingId, capacity, floor }) => ({
      name,
      buildingCode: buildingsById.get(buildingId),
      capacity,
      floor,
    })),
    days: days.map(({ code, name, shortName }) => ({ code, name, shortName })),
    modules: modules.map(({ number, start, end }) => ({ number, start, end })),
    courses: courses.map(({ code, name }) => ({ code, name })),
    occupancies: occupancies.map((row) => ({
      roomName: roomsById.get(row.roomId),
      buildingCode: buildingsById.get(row.buildingId),
      dayCode: daysById.get(row.dayId),
      moduleNumber: modulesById.get(row.moduleId),
      courseCode: row.courseId ? coursesById.get(row.courseId) : null,
      isFree: row.isFree,
    })),
  };

  const outputDirectory = path.join(__dirname, '..', 'seeders', 'data');
  const outputPath = path.join(outputDirectory, 'scraped-2026-2.json');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  console.log(
    `Seed exportado: ${data.buildings.length} edificios, `
      + `${data.rooms.length} salas, ${data.courses.length} cursos y `
      + `${data.occupancies.length} disponibilidades.`,
  );
  console.log(outputPath);
}

exportSeed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
