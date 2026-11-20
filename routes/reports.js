const Router = require('express');

const { OccupancyReport, Room } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { normalizeReportInput, toPublicReport } = require('../services/occupancyReports');

const router = Router();

// Solo usuarios con cuenta pueden reportar (RN-02). Registra usuario, sala y fecha (REQ-17).
router.post('/', requireAuth, async (req, res) => {
  try {
    const normalized = normalizeReportInput(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const { roomName, date, module } = normalized.report;

    if (!(await Room.findOne({ where: { name: roomName } }))) {
      return res.status(404).json({ error: 'La sala no existe.' });
    }
    const duplicate = await OccupancyReport.findOne({
      where: { userId: req.user.id, roomName, date, module, status: 'pending' },
    });
    if (duplicate) {
      return res.status(409).json({ error: 'Ya reportaste esta sala en ese módulo; está en revisión.' });
    }

    const report = await OccupancyReport.create({
      ...normalized.report,
      userId: req.user.id,
      status: 'pending',
    });
    res.status(201).json(toPublicReport(report));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
