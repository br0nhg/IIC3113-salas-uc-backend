const Router = require('express');

const { TimeModule } = require('../models');

const router = Router();

router.get('/', async (req, res) => {
    try {
        const modules = await TimeModule.findAll();
        res.json(modules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;