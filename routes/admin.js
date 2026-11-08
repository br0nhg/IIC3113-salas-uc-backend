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
      importedReservations: new Set(reservations.map((item) => `${item.roomName}|${item.date}|${item.reason}`)).size,
      replacedWeeks: weeks.map(([start, end]) => ({ start, end })),
      unknownRooms,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
