const express = require('express');
const db      = require('../db');
const { requireAuth, requireProfe, requireTutor } = require('../middleware/auth');

const router = express.Router();

// GET /api/seguimientos?estancia_id=X  o  ?alumno_id=X  o  ?curso=X
router.get('/', requireAuth, (req, res) => {
  const { estancia_id, alumno_id, curso } = req.query;
  let query = `SELECT s.*, al.apellidos, al.nombre as alumno_nombre,
    e.empresa_nombre, e.curso, e.nivel
    FROM seguimientos s
    JOIN estancias e ON e.id = s.estancia_id
    JOIN alumnado al ON al.id = s.alumno_id
    LEFT JOIN users a ON a.id = s.autor_id
    WHERE s.deleted = 0`;
  const params = [];
  if (estancia_id) { query += ' AND s.estancia_id = ?'; params.push(parseInt(estancia_id)); }
  if (alumno_id)   { query += ' AND s.alumno_id = ?';   params.push(parseInt(alumno_id)); }
  if (curso)       { query += ' AND e.curso = ?';        params.push(curso); }
  query += ' ORDER BY e.curso DESC, s.num_visita ASC';
  const rows = db.prepare(query).all(...params);
  res.json({ seguimientos: rows });
});

// GET /api/seguimientos/visitas — vista resumen para la pestaña Visitas
router.get('/visitas', requireAuth, (req, res) => {
  const { curso } = req.query;
  let query = `
    SELECT al.id as alumno_id, al.apellidos, al.nombre as alumno_nombre,
           e.id as estancia_id, e.curso, e.nivel, e.empresa_nombre, e.empresa_cif,
           e.calificacion, e.supervisor_nombre,
           COUNT(s.id) as num_visitas,
           GROUP_CONCAT(s.num_visita || '|' || COALESCE(s.fecha_visita,'') || '|' || COALESCE(s.anotaciones,'') || '|' || COALESCE(s.modalidad,'') || '|' || COALESCE(s.autor_nombre,'') || '|' || s.pendiente, ';;') as visitas_data
    FROM alumnado al
    JOIN estancias e ON e.alumno_id = al.id AND e.deleted = 0
    LEFT JOIN seguimientos s ON s.estancia_id = e.id AND s.deleted = 0
    WHERE al.deleted = 0`;
  const params = [];
  if (curso) { query += ' AND e.curso = ?'; params.push(curso); }
  query += ' GROUP BY e.id ORDER BY al.apellidos, al.nombre, e.curso DESC';
  const rows = db.prepare(query).all(...params);
  res.json({ visitas: rows });
});

// POST /api/seguimientos
router.post('/', requireProfe, (req, res) => {
  const { estancia_id, alumno_id, fecha_visita, modalidad, anotaciones, num_visita } = req.body;
  if (!estancia_id || !alumno_id) return res.status(400).json({ error: 'estancia_id y alumno_id son obligatorios.' });

  const estancia = db.prepare('SELECT * FROM estancias WHERE id = ? AND deleted = 0').get(estancia_id);
  if (!estancia) return res.status(404).json({ error: 'Estancia no encontrada.' });

  // Calcular siguiente número de visita si no se pasa
  const maxNum = db.prepare('SELECT MAX(num_visita) as m FROM seguimientos WHERE estancia_id = ? AND deleted = 0').get(estancia_id);
  const numVisita = num_visita || ((maxNum?.m || 0) + 1);

  // profe crea con pendiente=1, tutor/admin con pendiente=0
  const pendiente = (req.user.role === 'profe') ? 1 : 0;

  const r = db.prepare(`INSERT INTO seguimientos (estancia_id, alumno_id, num_visita, fecha_visita, modalidad, anotaciones, autor_id, autor_nombre, pendiente)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(estancia_id, alumno_id, numVisita, fecha_visita||null, modalidad||'presencial',
         anotaciones||null, req.user.id, req.user.nombre||req.user.role, pendiente);

  res.status(201).json({ seguimiento: { id: r.lastInsertRowid, num_visita: numVisita, pendiente } });
});

// PUT /api/seguimientos/:id
router.put('/:id', requireProfe, (req, res) => {
  const id = parseInt(req.params.id);
  const s = db.prepare('SELECT * FROM seguimientos WHERE id = ?').get(id);
  if (!s) return res.status(404).json({ error: 'Seguimiento no encontrado.' });

  // profe solo puede editar los suyos
  if (req.user.role === 'profe' && s.autor_id !== req.user.id) {
    return res.status(403).json({ error: 'Solo puedes editar tus propios seguimientos.' });
  }

  const { fecha_visita, modalidad, anotaciones, num_visita } = req.body;
  const pendiente = (req.user.role === 'profe') ? 1 : (req.body.pendiente !== undefined ? (req.body.pendiente ? 1 : 0) : s.pendiente);

  db.prepare(`UPDATE seguimientos SET fecha_visita=?,modalidad=?,anotaciones=?,num_visita=?,pendiente=?,updated_at=datetime('now') WHERE id=?`)
    .run(fecha_visita??s.fecha_visita, modalidad??s.modalidad, anotaciones??s.anotaciones,
         num_visita??s.num_visita, pendiente, id);

  res.json({ ok: true });
});

// PUT /api/seguimientos/:id/validar — tutor/admin valida pendiente
router.put('/:id/validar', requireTutor, (req, res) => {
  const id = parseInt(req.params.id);
  db.prepare(`UPDATE seguimientos SET pendiente=0, updated_at=datetime('now') WHERE id=?`).run(id);
  res.json({ ok: true });
});

// DELETE /api/seguimientos/:id
router.delete('/:id', requireTutor, (req, res) => {
  db.prepare(`UPDATE seguimientos SET deleted=1, updated_at=datetime('now') WHERE id=?`).run(parseInt(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
