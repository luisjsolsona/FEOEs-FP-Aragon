const express = require('express');
const db      = require('../db');
const { requireAuth, requireProfe, requireTutor } = require('../middleware/auth');

const router = express.Router();

// POST /api/estancias — upsert por alumno_id + curso + periodo_ini (permite varios periodos por curso)
router.post('/', requireProfe, (req, res) => {
  const { alumno_id, curso, nivel, empresa_id, empresa_nombre, empresa_cif,
          periodo_ini, periodo_fin, contacto, obs_empresa, obs_alumno,
          calificacion, supervisor_id, supervisor_nombre } = req.body;

  if (!alumno_id || !curso) return res.status(400).json({ error: 'alumno_id y curso son obligatorios.' });
  const alumno = db.prepare('SELECT id FROM alumnado WHERE id = ? AND deleted = 0').get(alumno_id);
  if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado.' });

  // Upsert por alumno_id + curso + periodo_ini. Un alumno puede tener más de
  // una estancia en el mismo curso (p.ej. FCT partida en dos periodos con
  // empresas distintas: Febrero en una, Marzo-Mayo en otra). Si coincide el
  // periodo_ini (o ambos son nulos/vacíos) se trata de la misma estancia y
  // se actualiza; si no, se crea una nueva sin tocar las demás del curso.
  const exist = periodo_ini
    ? db.prepare('SELECT * FROM estancias WHERE alumno_id = ? AND curso = ? AND periodo_ini = ? AND deleted = 0').get(alumno_id, curso, periodo_ini)
    : db.prepare("SELECT * FROM estancias WHERE alumno_id = ? AND curso = ? AND (periodo_ini IS NULL OR periodo_ini = '') AND deleted = 0").get(alumno_id, curso);

  if (exist) {
    db.prepare(`UPDATE estancias SET empresa_id=?,empresa_nombre=?,empresa_cif=?,nivel=?,
      periodo_ini=?,periodo_fin=?,contacto=?,obs_empresa=?,obs_alumno=?,
      calificacion=?,supervisor_id=?,supervisor_nombre=?,updated_at=datetime('now') WHERE id=?`)
      .run(empresa_id||null,empresa_nombre||null,empresa_cif||null,nivel||null,
           periodo_ini||null,periodo_fin||null,contacto||null,obs_empresa||null,obs_alumno||null,
           calificacion||null,supervisor_id||null,supervisor_nombre||null,exist.id);
    return res.json({ estancia: { id: exist.id }, updated: true });
  }

  const r = db.prepare(`INSERT INTO estancias (alumno_id,curso,empresa_id,empresa_nombre,empresa_cif,nivel,
    periodo_ini,periodo_fin,contacto,obs_empresa,obs_alumno,calificacion,supervisor_id,supervisor_nombre)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(alumno_id,curso,empresa_id||null,empresa_nombre||null,empresa_cif||null,nivel||null,
         periodo_ini||null,periodo_fin||null,contacto||null,obs_empresa||null,obs_alumno||null,
         calificacion||null,supervisor_id||null,supervisor_nombre||null);

  res.status(201).json({ estancia: { id: r.lastInsertRowid }, updated: false });
});

// PUT /api/estancias/:id
router.put('/:id', requireProfe, (req, res) => {
  const id = parseInt(req.params.id);
  const e = db.prepare('SELECT * FROM estancias WHERE id = ?').get(id);
  if (!e) return res.status(404).json({ error: 'Estancia no encontrada.' });

  const { curso, nivel, empresa_id, empresa_nombre, empresa_cif,
          periodo_ini, periodo_fin, contacto, obs_empresa, obs_alumno,
          calificacion, supervisor_id, supervisor_nombre } = req.body;

  db.prepare(`UPDATE estancias SET curso=?,nivel=?,empresa_id=?,empresa_nombre=?,empresa_cif=?,
    periodo_ini=?,periodo_fin=?,contacto=?,obs_empresa=?,obs_alumno=?,
    calificacion=?,supervisor_id=?,supervisor_nombre=?,updated_at=datetime('now') WHERE id=?`)
    .run(curso??e.curso, nivel??e.nivel, empresa_id??e.empresa_id, empresa_nombre??e.empresa_nombre,
         empresa_cif??e.empresa_cif, periodo_ini??e.periodo_ini, periodo_fin??e.periodo_fin,
         contacto??e.contacto, obs_empresa??e.obs_empresa, obs_alumno??e.obs_alumno,
         calificacion??e.calificacion, supervisor_id??e.supervisor_id, supervisor_nombre??e.supervisor_nombre, id);

  res.json({ ok: true });
});

// DELETE /api/estancias/:id
router.delete('/:id', requireTutor, (req, res) => {
  db.prepare(`UPDATE estancias SET deleted=1,delete_pending=0,updated_at=datetime('now') WHERE id=?`).run(parseInt(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
