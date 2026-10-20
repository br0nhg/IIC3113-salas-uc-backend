const { spawn } = require('child_process');
const path = require('path');
const Router = require('express');

const { requireAdmin } = require('../middleware/auth');

const router = Router();
const MAX_LOG_LINES = 100;

const state = {
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  log: [],
};

function appendLog(chunk) {
  const lines = chunk.toString('utf8').split(/\r?\n/).filter(Boolean);
  state.log.push(...lines);
  state.log = state.log.slice(-MAX_LOG_LINES);
}

router.get('/', (_req, res) => {
  res.json(state);
});

router.post('/', requireAdmin, (req, res) => {
  if (state.status === 'running') {
    return res.status(409).json({
      error: 'El scraper ya se está ejecutando.',
      ...state,
    });
  }

  const requestedLetter = String(req.body?.startLetter ?? 'A').toUpperCase();
  if (!/^[A-Z]$/.test(requestedLetter)) {
    return res.status(400).json({
      error: 'startLetter debe ser una letra entre A y Z.',
    });
  }

  const scriptPath = path.join(__dirname, '..', 'scraping.py');
  const child = spawn(
    'python3',
    ['-u', scriptPath, '--start-letter', requestedLetter],
    {
      cwd: path.dirname(scriptPath),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  state.status = 'running';
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.exitCode = null;
  state.log = [];

  child.stdout.on('data', appendLog);
  child.stderr.on('data', appendLog);

  child.on('error', (error) => {
    appendLog(error.message);
    state.status = 'failed';
    state.finishedAt = new Date().toISOString();
    state.exitCode = null;
  });

  child.on('close', (code) => {
    state.status = code === 0 ? 'completed' : 'failed';
    state.finishedAt = new Date().toISOString();
    state.exitCode = code;
  });

  return res.status(202).json({
    message: 'Scraper iniciado.',
    status: state.status,
    startedAt: state.startedAt,
    startLetter: requestedLetter,
  });
});

module.exports = router;
