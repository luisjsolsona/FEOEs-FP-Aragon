const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'secreto_por_defecto_cambiar';

// Jerarquía de roles: admin > tutor > profe > invitado
const ROLE_LEVEL = { admin: 4, tutor: 3, profe: 2, invitado: 1 };

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: payload.userId, role: payload.role, nombre: payload.nombre };
    next();
  } catch {
    return res.status(401).json({ error: 'Sesion expirada.' });
  }
}

// Requiere admin puro
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
    next();
  });
}

// Requiere admin o tutor
function requireTutor(req, res, next) {
  requireAuth(req, res, () => {
    if ((ROLE_LEVEL[req.user.role] || 0) < ROLE_LEVEL.tutor) {
      return res.status(403).json({ error: 'Requiere rol tutor o superior.' });
    }
    next();
  });
}

// Requiere al menos profe (no invitado)
function requireProfe(req, res, next) {
  requireAuth(req, res, () => {
    if ((ROLE_LEVEL[req.user.role] || 0) < ROLE_LEVEL.profe) {
      return res.status(403).json({ error: 'Solo lectura. Necesitas rol profe o superior.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin, requireTutor, requireProfe, ROLE_LEVEL };
