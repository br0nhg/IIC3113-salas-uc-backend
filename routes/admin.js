const Router = require('express');

const { Room } = require('../models');
const { requireAdmin } = require('../middleware/auth');

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

module.exports = router;
