const express = require('express');
const db      = require('../db');
const { requireAuth, requireTutor } = require('../middleware/auth');

const router = express.Router();

// GET /api/pendientes
router.get('/', requireAuth, (req, res) => {
  const pendientes = db.prepare(`SELECT * FROM pendientes ORDER BY created_at DESC`).all();
  res.json({ pendientes });
});

// POST /api/pendientes — solicitar eliminación
router.post('/', requireAuth, (req, res) => {
  const { tipo, ref_id, nombre } = req.body;
  if (!tipo || !ref_id || !nombre) return res.status(400).json({ error: 'tipo, ref_id y nombre son obligatorios.' });

  // Marcar el registro como delete_pending
  if (tipo === 'estancia') {
    db.prepare(`UPDATE estancias SET delete_pending=1, updated_at=datetime('now') WHERE id=?`).run(ref_id);
  }

  const r = db.prepare(`INSERT INTO pendientes (tipo, ref_id, nombre, solicitante) VALUES (?,?,?,?)`)
    .run(tipo, ref_id, nombre, req.user.role === 'admin' ? 'admin' : 'profesor');

  res.status(201).json({ pendiente: { id: r.lastInsertRowid, tipo, ref_id, nombre } });
});

// PUT /api/pendientes/:id/resolver — aprobar o rechazar (solo admin)
router.put('/:id/resolver', requireTutor, (req, res) => {
  const id = parseInt(req.params.id);
  const { aprobar } = req.body;
  const p = db.prepare('SELECT * FROM pendientes WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Solicitud no encontrada.' });

  db.prepare(`UPDATE pendientes SET resuelto=1, aprobado=?, resolved_at=datetime('now') WHERE id=?`)
    .run(aprobar ? 1 : 0, id);

  if (aprobar) {
    if (p.tipo === 'alumno') {
      db.prepare(`UPDATE alumnado SET deleted=1, updated_at=datetime('now') WHERE id=?`).run(p.ref_id);
      db.prepare(`UPDATE estancias SET deleted=1, updated_at=datetime('now') WHERE alumno_id=?`).run(p.ref_id);
    } else if (p.tipo === 'estancia') {
      db.prepare(`UPDATE estancias SET deleted=1, delete_pending=0, updated_at=datetime('now') WHERE id=?`).run(p.ref_id);
    } else if (p.tipo === 'empresa') {
      db.prepare(`UPDATE empresas SET deleted=1, updated_at=datetime('now') WHERE id=?`).run(p.ref_id);
    }
  } else {
    // Rechazado: quitar el marcado de pending
    if (p.tipo === 'estancia') {
      db.prepare(`UPDATE estancias SET delete_pending=0, updated_at=datetime('now') WHERE id=?`).run(p.ref_id);
    }
  }

  res.json({ ok: true });
});

module.exports = router;
