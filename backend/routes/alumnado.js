const express = require('express');
const db      = require('../db');
const { requireAuth, requireProfe, requireTutor } = require('../middleware/auth');

const router = express.Router();

// GET /api/alumnado — incluye estancias anidadas con conteo de seguimientos (una sola query)
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT
      a.id, a.apellidos, a.nombre, a.dni, a.familia, a.deleted, a.created_at, a.updated_at,
      json_group_array(
        CASE WHEN e.id IS NULL THEN NULL ELSE json_object(
          'id',                        e.id,
          'alumno_id',                 e.alumno_id,
          'empresa_id',                e.empresa_id,
          'empresa_nombre',            e.empresa_nombre,
          'empresa_cif',               e.empresa_cif,
          'curso',                     e.curso,
          'nivel',                     e.nivel,
          'periodo_ini',               e.periodo_ini,
          'periodo_fin',               e.periodo_fin,
          'contacto',                  e.contacto,
          'obs_empresa',               e.obs_empresa,
          'obs_alumno',                e.obs_alumno,
          'calificacion',              e.calificacion,
          'supervisor_id',             e.supervisor_id,
          'supervisor_nombre',         e.supervisor_nombre,
          'deleted',                   e.deleted,
          'delete_pending',            e.delete_pending,
          'created_at',                e.created_at,
          'updated_at',                e.updated_at,
          'num_seguimientos',          (SELECT COUNT(*) FROM seguimientos s WHERE s.estancia_id = e.id AND s.deleted = 0),
          'num_pendientes_validacion', (SELECT COUNT(*) FROM seguimientos s WHERE s.estancia_id = e.id AND s.deleted = 0 AND s.pendiente = 1)
        ) END
      ) AS estancias_json
    FROM alumnado a
    LEFT JOIN estancias e ON e.alumno_id = a.id AND e.deleted = 0
    WHERE a.deleted = 0
    GROUP BY a.id
    ORDER BY a.apellidos, a.nombre
  `).all();

  const alumnado = rows.map(row => {
    const estancias = JSON.parse(row.estancias_json).filter(Boolean);
    const { estancias_json, ...alumno } = row;
    return { ...alumno, estancias };
  });

  res.json({ alumnado });
});

// POST /api/alumnado — upsert por DNI
router.post('/', requireProfe, (req, res) => {
  const { apellidos, nombre, dni, familia } = req.body;
  if (!apellidos || !nombre || !dni) return res.status(400).json({ error: 'Apellidos, nombre y DNI son obligatorios.' });
  const dniUp = dni.toUpperCase().trim();
  const exist = db.prepare('SELECT * FROM alumnado WHERE dni = ?').get(dniUp);
  if (exist) {
    db.prepare(`UPDATE alumnado SET apellidos=?,nombre=?,familia=?,deleted=0,updated_at=datetime('now') WHERE id=?`)
      .run(apellidos, nombre, familia||null, exist.id);
    return res.json({ alumno: { ...exist, apellidos, nombre, familia }, updated: true });
  }
  const r = db.prepare(`INSERT INTO alumnado (apellidos,nombre,dni,familia) VALUES (?,?,?,?)`)
    .run(apellidos, nombre, dniUp, familia||null);
  res.status(201).json({ alumno: { id: r.lastInsertRowid, apellidos, nombre, dni: dniUp, familia } });
});

// PUT /api/alumnado/:id
router.put('/:id', requireProfe, (req, res) => {
  const id = parseInt(req.params.id);
  const a = db.prepare('SELECT * FROM alumnado WHERE id = ?').get(id);
  if (!a) return res.status(404).json({ error: 'Alumno no encontrado.' });
  const { apellidos, nombre, familia } = req.body;
  db.prepare(`UPDATE alumnado SET apellidos=?,nombre=?,familia=?,updated_at=datetime('now') WHERE id=?`)
    .run(apellidos??a.apellidos, nombre??a.nombre, familia??a.familia, id);
  res.json({ ok: true });
});

// DELETE /api/alumnado/:id — tutor o superior
router.delete('/:id', requireTutor, (req, res) => {
  const id = parseInt(req.params.id);
  db.prepare(`UPDATE alumnado SET deleted=1,updated_at=datetime('now') WHERE id=?`).run(id);
  db.prepare(`UPDATE estancias SET deleted=1,updated_at=datetime('now') WHERE alumno_id=?`).run(id);
  res.json({ ok: true });
});

// POST /api/alumnado/bulk-delete — solo tutor+
router.post('/bulk-delete', requireTutor, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids debe ser un array no vacio.' });
  const del = db.transaction(ids => {
    ids.forEach(id => {
      db.prepare(`UPDATE alumnado SET deleted=1,updated_at=datetime('now') WHERE id=?`).run(id);
      db.prepare(`UPDATE estancias SET deleted=1,updated_at=datetime('now') WHERE alumno_id=?`).run(id);
    });
  });
  del(ids);
  res.json({ ok: true, deleted: ids.length });
});

module.exports = router;
