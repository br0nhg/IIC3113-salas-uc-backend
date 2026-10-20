const jwt = require('jsonwebtoken');

const { User } = require('../models');

/** Exige un token válido (Authorization: Bearer) y deja el usuario en req.user. */
async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Debes iniciar sesión.' });
  }

  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(sub);
    if (!user) return res.status(401).json({ error: 'Sesión inválida.' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

/** Exige un usuario con rol admin. */
function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a administradores.' });
    }
    return next();
  });
}

module.exports = { requireAuth, requireAdmin };
