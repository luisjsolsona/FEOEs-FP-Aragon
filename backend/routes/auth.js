const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'secreto_por_defecto_cambiar';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contrasena son obligatorios.' });
  const user = db.prepare(`SELECT * FROM users WHERE username = ? AND activo = 1`).get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Usuario o contrasena incorrectos.' });

  const token = jwt.sign({ userId: user.id, role: user.role, nombre: user.nombre }, SECRET, { expiresIn: '8h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 8*60*60*1000 });
  res.json({ user: { id: user.id, username: user.username, nombre: user.nombre, role: user.role } });
});

router.post('/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(`SELECT id, username, nombre, role FROM users WHERE id = ? AND activo = 1`).get(req.user.id);
  if (!user) { res.clearCookie('token'); return res.status(401).json({ error: 'Usuario no encontrado.' }); }
  res.json({ user });
});

module.exports = router;
