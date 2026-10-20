const Router = require('express');

const { Favorite, Room } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.use(requireAuth);

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
