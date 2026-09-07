// Seed de empresas de prospección IFC (Zaragoza) — no interactivo, idempotente.
// Uso: node backend/seed_prospeccion.js
// El CIF no se conoce para estas empresas (no forma parte del listado de
// prospección original); se usa un CIF-placeholder único "PROSP-NNN" que
// debe sustituirse por el CIF real al validar el convenio.
const db = require('./db');
const csv = require('fs').readFileSync(require('path').join(__dirname, '..', 'docs', 'prospeccion', 'prospeccion_empresas_IFC_zaragoza.csv'), 'utf-8');

function parseCSV(text) {
  const rows = [];
  let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') {}
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

const rows = parseCSV(csv);
const header = rows[0];
const idx = (h) => header.indexOf(h);
const iNombre = idx('Empresa'), iCat = idx('Categoría'), iDir = idx('Dirección (Zaragoza)'),
      iTel = idx('Teléfono'), iWeb = idx('Web'), iNotas = idx('Notas');

const insert = db.prepare(`INSERT INTO empresas (nombre, cif, sector, direccion,
  contacto_tel, contacto_email, obs) VALUES (?,?,?,?,?,?,?)`);
const existsByNombre = db.prepare(`SELECT id FROM empresas WHERE nombre = ? COLLATE NOCASE`);

let n = 0, skipped = 0;
const tx = db.transaction(() => {
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[iNombre]) continue;
    const nombre = row[iNombre].trim();
    if (existsByNombre.get(nombre)) { skipped++; continue; }
    n++;
    const placeholderCif = 'PROSP-' + String(n).padStart(3, '0');
    const obsParts = [
      'Listado de prospección IFC (SMR/ASIR/DAM/DAW), sin CIF verificado — sustituir CIF al validar convenio.',
      row[iNotas] ? `Notas: ${row[iNotas]}` : null,
      row[iWeb] ? `Web: ${row[iWeb]}` : null
    ].filter(Boolean);
    insert.run(nombre, placeholderCif, row[iCat] || null, row[iDir] || null,
      row[iTel] || null, null, obsParts.join(' | '));
  }
});
tx();
console.log(`Insertadas ${n} empresas de prospección. Omitidas (ya existían por nombre): ${skipped}.`);
