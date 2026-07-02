const express = require('express');
const db      = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// DELETE /api/admin/reset — borra todos los datos (solo admin)
router.delete('/reset', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM seguimientos').run();
  db.prepare('DELETE FROM pendientes').run();
  db.prepare('DELETE FROM estancias').run();
  db.prepare('DELETE FROM alumnado').run();
  db.prepare('DELETE FROM empresas').run();
  db.prepare('DELETE FROM historial').run();
  // Resetear los autoincrement
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('seguimientos','pendientes','estancias','alumnado','empresas','historial')").run();
  res.json({ ok: true });
});

module.exports = router;
