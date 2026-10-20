const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Router = require('express');

const { User } = require('../models');

const router = Router();

// Mismas reglas que el frontend (src/utils/validation.ts).
const UC_EMAIL = /^[^\s@]+@(uc\.cl|estudiante\.uc\.cl)$/i;
const MIN_PASSWORD_LENGTH = 8;

function createSession(user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  return { user: user.toPublic(), token };
}

router.post('/register', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!name) return res.status(400).json({ error: 'Ingresa tu nombre.' });
    if (!UC_EMAIL.test(email)) {
      return res.status(400).json({ error: 'Usa tu correo @uc.cl o @estudiante.uc.cl.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      });
    }
    if (await User.findOne({ where: { email } })) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: 'student' });
    res.status(201).json(createSession(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    res.json(createSession(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// El token no se guarda en el servidor: cerrar sesión es borrarlo en el cliente.
router.post('/logout', (_req, res) => {
  res.status(204).end();
});

module.exports = router;
