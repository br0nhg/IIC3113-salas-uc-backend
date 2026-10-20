const Router = require('express');

const { Room } = require('../models');

const router = Router();

// El scraper y el seed recrean las salas, así que su fecha indica la última carga de datos.
router.get('/status', async (_req, res) => {
  try {
    const lastSyncAt = await Room.max('createdAt');
    res.json({ lastSyncAt: lastSyncAt ? new Date(lastSyncAt).toISOString() : null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
