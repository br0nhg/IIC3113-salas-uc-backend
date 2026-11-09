const Router = require('express');

const { Op } = require('sequelize');
const { OfficialReservation, Room, sequelize } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const { normalizeImport, weekBounds } = require('../services/officialReservations');

const router = Router();

router.use(requireAdmin);

/** Entero >= 0, null para borrar el dato, o undefined si el valor no es válido. */
function parseOptionalInt(value) {
  if (value === null || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

// Piso y capacidad no vienen de BuscaCursos: los ingresa el administrador.
router.patch('/rooms/:name', async (req, res) => {
  try {
    const room = await Room.findOne({ where: { name: req.params.name } });
    if (!room) return res.status(404).json({ error: 'La sala no existe.' });

    const changes = {};
    for (const field of ['capacity', 'floor']) {
      if (!(field in (req.body ?? {}))) continue;
      const value = parseOptionalInt(req.body[field]);
      if (value === undefined) {
        return res.status(400).json({ error: `${field} debe ser un entero mayor o igual a 0.` });
      }
      changes[field] = value;
    }

    await room.update(changes);
    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Reemplaza las reservas oficiales de cada semana presente en el JSON.
 * Acepta directamente un arreglo o { reservas: [...] }.
 */
router.post('/official-reservations/import', async (req, res) => {
  try {
    const normalized = normalizeImport(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const roomNames = [...new Set(normalized.reservations.map((item) => item.roomName))];
    const existingRooms = await Room.findAll({
      attributes: ['name'],
      where: { name: { [Op.in]: roomNames } },
    });
    const knownRooms = new Set(existingRooms.map((room) => room.name.toUpperCase()));
    const unknownRooms = roomNames.filter((name) => !knownRooms.has(name));
    const reservations = normalized.reservations.filter((item) => knownRooms.has(item.roomName));

    if (reservations.length === 0) {
      return res.status(400).json({ error: 'Ninguna reserva corresponde a una sala existente.' });
    }

    const weeks = [...new Map(
      reservations.map((item) => {
        const bounds = weekBounds(item.date);
        return [bounds.join('|'), bounds];
      }),
    ).values()];

    await sequelize.transaction(async (transaction) => {
      for (const [start, end] of weeks) {
        await OfficialReservation.destroy({
          where: { date: { [Op.between]: [start, end] } },
          transaction,
        });
      }
      await OfficialReservation.bulkCreate(reservations, { transaction });
    });

    res.status(201).json({
      importedSlots: reservations.length,
      importedReservations: new Set(reservations.map((item) => item.groupId)).size,
      replacedWeeks: weeks.map(([start, end]) => ({ start, end })),
      unknownRooms,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function groupReservations(rows) {
  const groups = new Map();
  for (const row of rows) {
    const current = groups.get(row.groupId) ?? {
      id: row.groupId,
      roomName: row.roomName,
      date: row.date,
      modules: [],
      reason: row.reason,
    };
    current.modules.push(row.module);
    groups.set(row.groupId, current);
  }
  return [...groups.values()].map((item) => ({
    ...item,
    modules: item.modules.sort((a, b) => a - b),
  }));
}

router.get('/official-reservations', async (req, res) => {
  try {
    const where = req.query.from ? { date: { [Op.gte]: String(req.query.from) } } : undefined;
    const rows = await OfficialReservation.findAll({
      where,
      order: [['date', 'ASC'], ['roomName', 'ASC'], ['module', 'ASC']],
    });
    res.json(groupReservations(rows));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/official-reservations/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!UUID_PATTERN.test(groupId)) return res.status(400).json({ error: 'Identificador inválido.' });
    if (!(await OfficialReservation.findOne({ where: { groupId } }))) {
      return res.status(404).json({ error: 'La reserva no existe.' });
    }
    const normalized = normalizeImport([req.body]);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const slots = normalized.reservations.map((item) => ({ ...item, groupId }));
    if (!(await Room.findOne({ where: { name: slots[0].roomName } }))) {
      return res.status(400).json({ error: 'La sala no existe.' });
    }
    await sequelize.transaction(async (transaction) => {
      await OfficialReservation.destroy({ where: { groupId }, transaction });
      await OfficialReservation.bulkCreate(slots, { transaction });
    });
    res.json(groupReservations(slots)[0]);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe una reserva para esa sala, fecha y módulo.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/official-reservations/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!UUID_PATTERN.test(groupId)) return res.status(400).json({ error: 'Identificador inválido.' });
    const deleted = await OfficialReservation.destroy({ where: { groupId } });
    if (!deleted) return res.status(404).json({ error: 'La reserva no existe.' });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
