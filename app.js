const cors = require('cors');
const express = require('express');
const buildingsRouter = require('./routes/building');
const roomsRouter = require('./routes/rooms');
const daysRouter = require('./routes/days');
const modulesRouter = require('./routes/modules');
const availabilityRouter = require('./routes/availability');
const scraperRouter = require('./routes/scraper');
const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');
const adminRouter = require('./routes/admin');
const syncRouter = require('./routes/sync');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/buildings', buildingsRouter);
app.use('/rooms', roomsRouter);
app.use('/days', daysRouter);
app.use('/modules', modulesRouter);
app.use('/availability', availabilityRouter);
app.use('/scraper', scraperRouter);
app.use('/auth', authRouter);
app.use('/me', meRouter);
app.use('/admin', adminRouter);
app.use('/sync', syncRouter);

app.get('/health', (_req, res) => {
	res.json({ ok: true });
});

module.exports = app;
