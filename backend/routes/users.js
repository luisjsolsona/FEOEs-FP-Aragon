const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const { requireAuth, requireAdmin, requireTutor } = require('../middleware/auth');

const router = express.Router();

const VALID_ROLES = ['admin', 'tutor', 'profe', 'invitado'];

router.get('/', requireTutor, (req, res) => {
  const users = db.prepare(`SELECT id, username, nombre, role, activo, created_at FROM users ORDER BY role DESC, username ASC`).all();
  res.json({ users });
});

router.post('/', requireAdmin, (req, res) => {
  const { username, password, nombre, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contrasena son obligatorios.' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rol invalido.' });
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username))
    return res.status(409).json({ error: 'El nombre de usuario ya existe.' });
  const hash = bcrypt.hashSync(password, 12);
  const r = db.prepare(`INSERT INTO users (username, password_hash, role, nombre) VALUES (?,?,?,?)`)
    .run(username, hash, role, nombre||null);
  res.status(201).json({ user: { id: r.lastInsertRowid, username, nombre, role } });
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, activo, role } = req.body;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rol invalido.' });
  db.prepare(`UPDATE users SET nombre=?, activo=?, role=? WHERE id=?`)
    .run(nombre??target.nombre, activo!==undefined?(activo?1:0):target.activo, role||target.role, id);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const target = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (target.role === 'admin') return res.status(403).json({ error: 'No se puede eliminar la cuenta admin.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.put('/:id/password', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'La nueva contrasena debe tener al menos 6 caracteres.' });
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (req.user.role !== 'admin') {
    if (req.user.id !== id) return res.status(403).json({ error: 'Sin permiso.' });
    if (!currentPassword || !bcrypt.compareSync(currentPassword, target.password_hash))
      return res.status(401).json({ error: 'Contrasena actual incorrecta.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 12), id);
  res.json({ ok: true });
});

module.exports = router;
