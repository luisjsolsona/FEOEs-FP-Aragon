const express = require('express');
const db      = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Orden de tablas respetando dependencias (FK): padres antes que hijos.
const TABLAS_BACKUP = ['users', 'empresas', 'alumnado', 'estancias', 'seguimientos', 'prospeccion_historial', 'pendientes', 'historial'];

// DELETE /api/admin/reset — borra todos los datos (solo admin)
router.delete('/reset', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM seguimientos').run();
  db.prepare('DELETE FROM prospeccion_historial').run();
  db.prepare('DELETE FROM pendientes').run();
  db.prepare('DELETE FROM estancias').run();
  db.prepare('DELETE FROM alumnado').run();
  db.prepare('DELETE FROM empresas').run();
  db.prepare('DELETE FROM historial').run();
  // Resetear los autoincrement (no se toca 'users': el reset no borra cuentas de acceso)
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('seguimientos','prospeccion_historial','pendientes','estancias','alumnado','empresas','historial')").run();
  res.json({ ok: true });
});

// GET /api/admin/backup — solo admin. Vuelca TODAS las tablas tal cual están en la BD
// (usuarios incluidos, con su hash de contraseña — el fichero resultante debe tratarse
// como sensible, no compartirse por canales inseguros).
router.get('/backup', requireAuth, requireAdmin, (req, res) => {
  const backup = { _version: 1, _generatedAt: new Date().toISOString(), tablas: {} };
  for (const tabla of TABLAS_BACKUP) {
    backup.tablas[tabla] = db.prepare(`SELECT * FROM ${tabla}`).all();
  }
  res.json(backup);
});

// POST /api/admin/restore — solo admin. Sustituye TODO el contenido de las tablas
// listadas por lo que venga en el JSON (formato del propio /backup). Transaccional:
// si algo falla, no se aplica nada.
router.post('/restore', requireAuth, requireAdmin, (req, res) => {
  const { tablas } = req.body || {};
  if (!tablas || typeof tablas !== 'object') {
    return res.status(400).json({ error: 'Formato de copia de seguridad no reconocido (falta "tablas").' });
  }
  const desconocidas = Object.keys(tablas).filter(t => !TABLAS_BACKUP.includes(t));
  if (desconocidas.length) {
    return res.status(400).json({ error: 'Tabla(s) no reconocida(s) en el backup: ' + desconocidas.join(', ') });
  }

  try {
    const tx = db.transaction(() => {
      // Borrar en orden inverso (hijos antes que padres) para no romper claves foráneas
      for (const tabla of [...TABLAS_BACKUP].reverse()) {
        if (tablas[tabla]) db.prepare(`DELETE FROM ${tabla}`).run();
      }
      // Insertar en orden de dependencias (padres antes que hijos)
      for (const tabla of TABLAS_BACKUP) {
        const filas = tablas[tabla];
        if (!filas || !filas.length) continue;
        const columnas = db.prepare(`PRAGMA table_info(${tabla})`).all().map(c => c.name);
        const placeholders = columnas.map(() => '?').join(',');
        const insert = db.prepare(`INSERT INTO ${tabla} (${columnas.join(',')}) VALUES (${placeholders})`);
        for (const fila of filas) {
          insert.run(columnas.map(c => (fila[c] === undefined ? null : fila[c])));
        }
      }
    });
    tx();
    res.json({ ok: true, restauradas: Object.fromEntries(Object.entries(tablas).map(([k, v]) => [k, v.length])) });
  } catch (err) {
    res.status(500).json({ error: 'Error al restaurar: ' + err.message });
  }
});

module.exports = router;
