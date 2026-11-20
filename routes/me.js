const bcrypt = require('bcryptjs');
const Router = require('express');

const { Favorite, Room, User, sequelize } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.use(requireAuth);

const MAX_NAME_LENGTH = 80;

// Editar el nombre (REQ-04). El correo y el rol no se pueden cambiar.
router.patch('/', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Ingresa tu nombre.' });
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `El nombre puede tener hasta ${MAX_NAME_LENGTH} caracteres.` });
    }
    await req.user.update({ name });
    res.json({ user: req.user.toPublic() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Eliminar la cuenta (REQ-05). Se pide la contraseña para confirmar.
router.delete('/', async (req, res) => {
  try {
    const password = String(req.body?.password ?? '');
    if (!(await bcrypt.compare(password, req.user.passwordHash))) {
      return res.status(403).json({ error: 'La contraseña no es correcta.' });
    }
    await sequelize.transaction(async (transaction) => {
      await Favorite.destroy({ where: { userId: req.user.id }, transaction });
      await User.destroy({ where: { id: req.user.id }, transaction });
    });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const toFavorite = (favorite) => ({
  roomId: favorite.roomName,
  createdAt: favorite.createdAt.toISOString(),
});

router.get('/favorites', async (req, res) => {
  try {
    const favorites = await Favorite.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(favorites.map(toFavorite));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/favorites', async (req, res) => {
  try {
    const roomName = String(req.body?.roomId ?? '');
    if (!(await Room.findOne({ where: { name: roomName } }))) {
      return res.status(404).json({ error: 'La sala no existe.' });
    }
    const [favorite] = await Favorite.findOrCreate({
      where: { userId: req.user.id, roomName },
    });
    res.status(201).json(toFavorite(favorite));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/favorites/:roomId', async (req, res) => {
  try {
    await Favorite.destroy({ where: { userId: req.user.id, roomName: req.params.roomId } });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
