'use strict'

const buildingRows = [
  { id: 1, code: 'A', name: 'Edificio A', description: 'Sector A de Ingeniería, San Joaquín', createdAt: new Date(), updatedAt: new Date() },
  { id: 2, code: 'B', name: 'Edificio B', description: 'Sector B de Ingeniería, San Joaquín', createdAt: new Date(), updatedAt: new Date() },
  { id: 3, code: 'BC', name: 'Edificio BC', description: 'Sector BC de Ingeniería, San Joaquín', createdAt: new Date(), updatedAt: new Date() },
  { id: 4, code: 'K', name: 'Edificio K', description: 'Sector K de Ingeniería, San Joaquín', createdAt: new Date(), updatedAt: new Date() },
]

const roomRows = [
  { id: 1, name: 'A1', buildingId: 1, capacity: 60, floor: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, name: 'A2', buildingId: 1, capacity: 60, floor: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 3, name: 'A3', buildingId: 1, capacity: 45, floor: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 4, name: 'A5', buildingId: 1, capacity: 80, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 5, name: 'A6', buildingId: 1, capacity: 80, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 6, name: 'B12', buildingId: 2, capacity: 40, floor: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 7, name: 'B13', buildingId: 2, capacity: 40, floor: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 8, name: 'B14', buildingId: 2, capacity: 50, floor: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 9, name: 'B15', buildingId: 2, capacity: 50, floor: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 10, name: 'B21', buildingId: 2, capacity: 35, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 11, name: 'B23', buildingId: 2, capacity: 35, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 12, name: 'BC23', buildingId: 3, capacity: 90, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 13, name: 'BC24', buildingId: 3, capacity: 90, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 14, name: 'BC25', buildingId: 3, capacity: 120, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 15, name: 'BC26', buildingId: 3, capacity: 70, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 16, name: 'K200', buildingId: 4, capacity: 100, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 17, name: 'K201', buildingId: 4, capacity: 55, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 18, name: 'K202', buildingId: 4, capacity: 55, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 19, name: 'K203', buildingId: 4, capacity: 40, floor: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 20, name: 'K204', buildingId: 4, capacity: 40, floor: 2, createdAt: new Date(), updatedAt: new Date() },
]

const dayRows = [
  { id: 1, code: 'L', name: 'Lunes', shortName: 'Lun', createdAt: new Date(), updatedAt: new Date() },
  { id: 2, code: 'M', name: 'Martes', shortName: 'Mar', createdAt: new Date(), updatedAt: new Date() },
  { id: 3, code: 'W', name: 'Miércoles', shortName: 'Mié', createdAt: new Date(), updatedAt: new Date() },
  { id: 4, code: 'J', name: 'Jueves', shortName: 'Jue', createdAt: new Date(), updatedAt: new Date() },
  { id: 5, code: 'V', name: 'Viernes', shortName: 'Vie', createdAt: new Date(), updatedAt: new Date() },
  { id: 6, code: 'S', name: 'Sábado', shortName: 'Sáb', createdAt: new Date(), updatedAt: new Date() },
]

const moduleRows = [
  { id: 1, number: 1, start: '08:20', end: '09:30', createdAt: new Date(), updatedAt: new Date() },
  { id: 2, number: 2, start: '09:40', end: '10:50', createdAt: new Date(), updatedAt: new Date() },
  { id: 3, number: 3, start: '11:00', end: '12:10', createdAt: new Date(), updatedAt: new Date() },
  { id: 4, number: 4, start: '12:20', end: '13:30', createdAt: new Date(), updatedAt: new Date() },
  { id: 5, number: 5, start: '14:50', end: '16:00', createdAt: new Date(), updatedAt: new Date() },
  { id: 6, number: 6, start: '16:10', end: '17:20', createdAt: new Date(), updatedAt: new Date() },
  { id: 7, number: 7, start: '17:30', end: '18:40', createdAt: new Date(), updatedAt: new Date() },
  { id: 8, number: 8, start: '18:50', end: '20:00', createdAt: new Date(), updatedAt: new Date() },
  { id: 9, number: 9, start: '20:10', end: '21:20', createdAt: new Date(), updatedAt: new Date() },
]

const courseRows = [
  { id: 1, code: 'IIC1103', name: 'Introducción a la Programación', createdAt: new Date(), updatedAt: new Date() },
  { id: 2, code: 'IIC2233', name: 'Programación Avanzada', createdAt: new Date(), updatedAt: new Date() },
  { id: 3, code: 'IIC2343', name: 'Arquitectura de Computadores', createdAt: new Date(), updatedAt: new Date() },
  { id: 4, code: 'IIC2413', name: 'Bases de Datos', createdAt: new Date(), updatedAt: new Date() },
  { id: 5, code: 'IIC3113', name: 'Gestión de Proyectos de Tecnologías de Información', createdAt: new Date(), updatedAt: new Date() },
  { id: 6, code: 'MAT1610', name: 'Cálculo I', createdAt: new Date(), updatedAt: new Date() },
  { id: 7, code: 'MAT1620', name: 'Cálculo II', createdAt: new Date(), updatedAt: new Date() },
  { id: 8, code: 'MAT1203', name: 'Álgebra Lineal', createdAt: new Date(), updatedAt: new Date() },
  { id: 9, code: 'FIS1514', name: 'Dinámica', createdAt: new Date(), updatedAt: new Date() },
  { id: 10, code: 'ICS1513', name: 'Introducción a la Economía', createdAt: new Date(), updatedAt: new Date() },
  { id: 11, code: 'ICS2123', name: 'Modelos Estocásticos', createdAt: new Date(), updatedAt: new Date() },
  { id: 12, code: 'ICE1514', name: 'Termodinámica', createdAt: new Date(), updatedAt: new Date() },
]

const courses = courseRows.map((course) => ({ code: course.code, name: course.name }))

function hash(text) {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function buildOccupancies() {
  const rows = []

  for (const room of roomRows) {
    for (const day of dayRows) {
      for (const module of moduleRows) {
        const value = hash(`${room.name}-${day.code}-${module.number}`)
        const occupancyPercent = day.code === 'S' ? 10 : module.number >= 8 ? 30 : 60
        const isFree = value % 100 >= occupancyPercent
        const course = courses[value % courses.length]

        rows.push({
          roomId: room.id,
          buildingId: room.buildingId,
          dayId: day.id,
          moduleId: module.id,
          courseId: isFree ? null : ((value % courses.length) + 1),
          isFree,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }
  }

  return rows
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('Buildings', buildingRows)
    await queryInterface.bulkInsert('Rooms', roomRows)
    await queryInterface.bulkInsert('Days', dayRows)
    await queryInterface.bulkInsert('TimeModules', moduleRows)
    await queryInterface.bulkInsert('Courses', courseRows)
    await queryInterface.bulkInsert('RoomOccupancies', buildOccupancies())
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('RoomOccupancies', null, {})
    await queryInterface.bulkDelete('Courses', null, {})
    await queryInterface.bulkDelete('TimeModules', null, {})
    await queryInterface.bulkDelete('Days', null, {})
    await queryInterface.bulkDelete('Rooms', null, {})
    await queryInterface.bulkDelete('Buildings', null, {})
  },
}