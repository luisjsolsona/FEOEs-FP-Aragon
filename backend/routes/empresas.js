const express = require('express');
const db      = require('../db');
const { requireAuth, requireTutor } = require('../middleware/auth');

const router = express.Router();

// GET /api/empresas
router.get('/', requireAuth, (req, res) => {
  const empresas = db.prepare(`SELECT * FROM empresas WHERE deleted = 0 ORDER BY nombre ASC`).all();
  res.json({ empresas });
});

// POST /api/empresas
router.post('/', requireAuth, (req, res) => {
  const { nombre, cif, sector, direccion, lat, lon, contacto_nombre, contacto_cargo, contacto_tel, contacto_email, obs } = req.body;
  if (!nombre || !cif) return res.status(400).json({ error: 'Nombre y CIF son obligatorios.' });

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

// PUT /api/empresas/:id
router.put('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const e = db.prepare('SELECT * FROM empresas WHERE id = ?').get(id);
  if (!e) return res.status(404).json({ error: 'Empresa no encontrada.' });
  const { nombre, cif, sector, direccion, lat, lon, contacto_nombre, contacto_cargo, contacto_tel, contacto_email, obs } = req.body;
  db.prepare(`UPDATE empresas SET nombre=?, cif=?, sector=?, direccion=?, lat=?, lon=?,
    contacto_nombre=?, contacto_cargo=?, contacto_tel=?, contacto_email=?, obs=?, updated_at=datetime('now')
    WHERE id=?`)
    .run(nombre??e.nombre, (cif||e.cif).toUpperCase(), sector??e.sector, direccion??e.direccion,
         lat??e.lat, lon??e.lon, contacto_nombre??e.contacto_nombre, contacto_cargo??e.contacto_cargo,
         contacto_tel??e.contacto_tel, contacto_email??e.contacto_email, obs??e.obs, id);
  res.json({ ok: true });
});

// DELETE /api/empresas/:id (soft delete)
router.delete('/:id', requireTutor, (req, res) => {
  db.prepare(`UPDATE empresas SET deleted=1, updated_at=datetime('now') WHERE id=?`).run(parseInt(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
