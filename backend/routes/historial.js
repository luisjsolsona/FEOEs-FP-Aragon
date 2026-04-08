const express = require('express');
const db      = require('../db');
const { requireAuth, requireTutor } = require('../middleware/auth');

const router = express.Router();

// GET /api/historial
router.get('/', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 500);
  const historial = db.prepare(`SELECT * FROM historial ORDER BY created_at DESC LIMIT ?`).all(limit);
  res.json({ historial });
});

// POST /api/historial — solo tutor o superior puede registrar entradas manuales
router.post('/', requireTutor, (req, res) => {
  const { tipo, texto } = req.body;
  if (!tipo || !texto) return res.status(400).json({ error: 'tipo y texto son obligatorios.' });
  const r = db.prepare(`INSERT INTO historial (tipo, texto, usuario) VALUES (?,?,?)`)
    .run(tipo, texto, req.user.role);
  res.status(201).json({ id: r.lastInsertRowid });
});

module.exports = router;
