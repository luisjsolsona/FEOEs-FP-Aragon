const express = require('express');
const db      = require('../db');
const { requireAuth, requireProfe, requireTutor, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function validarCoordenadas(lat, lon) {
  if (lat !== undefined && lat !== null && (isNaN(lat) || lat < -90 || lat > 90))
    return 'Latitud inválida (debe estar entre -90 y 90).';
  if (lon !== undefined && lon !== null && (isNaN(lon) || lon < -180 || lon > 180))
    return 'Longitud inválida (debe estar entre -180 y 180).';
  return null;
}

// GET /api/empresas
router.get('/', requireAuth, (req, res) => {
  const empresas = db.prepare(`SELECT * FROM empresas WHERE deleted = 0 ORDER BY nombre ASC`).all();
  res.json({ empresas });
});

// POST /api/empresas — requiere al menos profe
router.post('/', requireProfe, (req, res) => {
  const { nombre, cif, sector, direccion, lat, lon, contacto_nombre, contacto_cargo, contacto_tel, contacto_email, obs } = req.body;
  if (!nombre || !cif) return res.status(400).json({ error: 'Nombre y CIF son obligatorios.' });

  const coordError = validarCoordenadas(lat, lon);
  if (coordError) return res.status(400).json({ error: coordError });

  // Upsert por CIF
  const exist = db.prepare('SELECT id FROM empresas WHERE cif = ?').get(cif.toUpperCase());
  if (exist) {
    db.prepare(`UPDATE empresas SET nombre=?, sector=?, direccion=?, lat=?, lon=?,
      contacto_nombre=?, contacto_cargo=?, contacto_tel=?, contacto_email=?, obs=?,
      deleted=0, updated_at=datetime('now') WHERE id=?`)
      .run(nombre, sector||null, direccion||null, lat||null, lon||null,
           contacto_nombre||null, contacto_cargo||null, contacto_tel||null, contacto_email||null, obs||null, exist.id);
    return res.json({ empresa: { id: exist.id, ...req.body, cif: cif.toUpperCase() }, updated: true });
  }

  const r = db.prepare(`INSERT INTO empresas (nombre, cif, sector, direccion, lat, lon,
    contacto_nombre, contacto_cargo, contacto_tel, contacto_email, obs)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(nombre, cif.toUpperCase(), sector||null, direccion||null, lat||null, lon||null,
         contacto_nombre||null, contacto_cargo||null, contacto_tel||null, contacto_email||null, obs||null);
  res.status(201).json({ empresa: { id: r.lastInsertRowid, ...req.body, cif: cif.toUpperCase() } });
});

// PUT /api/empresas/:id — requiere al menos profe (permite guardar coords geocodificadas)
router.put('/:id', requireProfe, (req, res) => {
  const id = parseInt(req.params.id);
  const e = db.prepare('SELECT * FROM empresas WHERE id = ?').get(id);
  if (!e) return res.status(404).json({ error: 'Empresa no encontrada.' });

  const { nombre, cif, sector, direccion, lat, lon, contacto_nombre, contacto_cargo, contacto_tel, contacto_email, obs } = req.body;
  const coordError = validarCoordenadas(lat, lon);
  if (coordError) return res.status(400).json({ error: coordError });

  db.prepare(`UPDATE empresas SET nombre=?, cif=?, sector=?, direccion=?, lat=?, lon=?,
    contacto_nombre=?, contacto_cargo=?, contacto_tel=?, contacto_email=?, obs=?, updated_at=datetime('now')
    WHERE id=?`)
    .run(nombre??e.nombre, (cif||e.cif).toUpperCase(), sector??e.sector, direccion??e.direccion,
         lat??e.lat, lon??e.lon, contacto_nombre??e.contacto_nombre, contacto_cargo??e.contacto_cargo,
         contacto_tel??e.contacto_tel, contacto_email??e.contacto_email, obs??e.obs, id);
  res.json({ ok: true });
});

// PUT /api/empresas/:id/prospeccion — marcar estado de prospección (llamado/pendiente/ok/rechazada/sin_contactar)
// y dejar constancia en el histórico con la nota escrita en ese momento.
const ESTADOS_PROSPECCION = ['sin_contactar', 'llamado', 'pendiente', 'ok', 'rechazada'];
router.put('/:id/prospeccion', requireProfe, (req, res) => {
  const id = parseInt(req.params.id);
  const e = db.prepare('SELECT * FROM empresas WHERE id = ?').get(id);
  if (!e) return res.status(404).json({ error: 'Empresa no encontrada.' });

  const { estado, nota } = req.body;
  if (!estado || !ESTADOS_PROSPECCION.includes(estado)) {
    return res.status(400).json({ error: 'Estado de prospección inválido.' });
  }
  const contacto = req.user.nombre || req.user.role;
  const fecha = new Date().toISOString().slice(0, 10);

  db.prepare(`UPDATE empresas SET prospeccion_estado=?, prospeccion_fecha=?, prospeccion_contacto=?, updated_at=datetime('now') WHERE id=?`)
    .run(estado, fecha, contacto, id);

  const r = db.prepare(`INSERT INTO prospeccion_historial (empresa_id, estado, nota, autor_id, autor_nombre) VALUES (?,?,?,?,?)`)
    .run(id, estado, nota || null, req.user.id, contacto);

  res.json({ ok: true, prospeccion_estado: estado, prospeccion_fecha: fecha, prospeccion_contacto: contacto, historial_id: r.lastInsertRowid });
});

// GET /api/empresas/:id/prospeccion-historial
router.get('/:id/prospeccion-historial', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const historial = db.prepare(`SELECT * FROM prospeccion_historial WHERE empresa_id = ? AND deleted = 0 ORDER BY created_at DESC`).all(id);
  res.json({ historial });
});

// PUT /api/empresas/:empresaId/prospeccion-historial/:histId — solo el autor puede editar su propia nota
router.put('/:empresaId/prospeccion-historial/:histId', requireProfe, (req, res) => {
  const empresaId = parseInt(req.params.empresaId);
  const histId = parseInt(req.params.histId);
  const h = db.prepare('SELECT * FROM prospeccion_historial WHERE id = ? AND empresa_id = ? AND deleted = 0').get(histId, empresaId);
  if (!h) return res.status(404).json({ error: 'Entrada de histórico no encontrada.' });
  if (h.autor_id !== req.user.id) return res.status(403).json({ error: 'Solo puedes editar tus propias notas.' });

  const { nota } = req.body;
  db.prepare(`UPDATE prospeccion_historial SET nota=?, updated_at=datetime('now') WHERE id=?`).run(nota ?? h.nota, histId);
  res.json({ ok: true });
});

// DELETE /api/empresas/:id — solo admin
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare(`UPDATE empresas SET deleted=1, updated_at=datetime('now') WHERE id=?`).run(parseInt(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
