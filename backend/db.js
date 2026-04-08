const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const logger   = require('./utils/logger');

const DB_PATH = path.join('/app/data', 'feoe.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'profe',
    nombre        TEXT,
    activo        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS empresas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT    NOT NULL,
    cif              TEXT    NOT NULL UNIQUE,
    sector           TEXT, direccion TEXT, lat REAL, lon REAL,
    contacto_nombre  TEXT, contacto_cargo TEXT, contacto_tel TEXT, contacto_email TEXT,
    obs TEXT, deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS alumnado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apellidos TEXT NOT NULL, nombre TEXT NOT NULL, dni TEXT NOT NULL UNIQUE, familia TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS estancias (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id        INTEGER NOT NULL REFERENCES alumnado(id) ON DELETE CASCADE,
    empresa_id       INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    empresa_nombre   TEXT, empresa_cif TEXT,
    curso            TEXT NOT NULL, nivel TEXT,
    periodo_ini TEXT, periodo_fin TEXT, contacto TEXT, obs_empresa TEXT, obs_alumno TEXT,
    calificacion     TEXT,
    supervisor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    supervisor_nombre TEXT,
    deleted INTEGER NOT NULL DEFAULT 0, delete_pending INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS seguimientos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    estancia_id  INTEGER NOT NULL REFERENCES estancias(id) ON DELETE CASCADE,
    alumno_id    INTEGER NOT NULL REFERENCES alumnado(id) ON DELETE CASCADE,
    num_visita   INTEGER NOT NULL DEFAULT 1,
    fecha_visita TEXT,
    modalidad    TEXT DEFAULT 'presencial',
    anotaciones  TEXT,
    autor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    autor_nombre TEXT,
    pendiente    INTEGER NOT NULL DEFAULT 0,
    deleted      INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS pendientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL, ref_id INTEGER NOT NULL, nombre TEXT NOT NULL,
    solicitante TEXT NOT NULL, resuelto INTEGER NOT NULL DEFAULT 0,
    aprobado INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')), resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL, texto TEXT NOT NULL, usuario TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_estancias_alumno        ON estancias(alumno_id);
  CREATE INDEX IF NOT EXISTS idx_estancias_empresa       ON estancias(empresa_id);
  CREATE INDEX IF NOT EXISTS idx_estancias_curso         ON estancias(curso);
  CREATE INDEX IF NOT EXISTS idx_estancias_deleted       ON estancias(deleted);
  CREATE INDEX IF NOT EXISTS idx_estancias_delete_pend   ON estancias(delete_pending);
  CREATE INDEX IF NOT EXISTS idx_seguimientos_est        ON seguimientos(estancia_id);
  CREATE INDEX IF NOT EXISTS idx_seguimientos_alumno     ON seguimientos(alumno_id);
  CREATE INDEX IF NOT EXISTS idx_seguimientos_deleted    ON seguimientos(deleted);
  CREATE INDEX IF NOT EXISTS idx_seguimientos_pendiente  ON seguimientos(pendiente);
  CREATE INDEX IF NOT EXISTS idx_alumnado_dni            ON alumnado(dni);
  CREATE INDEX IF NOT EXISTS idx_alumnado_deleted        ON alumnado(deleted);
  CREATE INDEX IF NOT EXISTS idx_empresas_cif            ON empresas(cif);
  CREATE INDEX IF NOT EXISTS idx_empresas_deleted        ON empresas(deleted);
`);

// Migraciones para BDs existentes
const migs = [
  `ALTER TABLE estancias ADD COLUMN calificacion TEXT`,
  `ALTER TABLE estancias ADD COLUMN supervisor_id INTEGER`,
  `ALTER TABLE estancias ADD COLUMN supervisor_nombre TEXT`,
];
for (const sql of migs) {
  try { db.exec(sql); }
  catch (e) { if (!e.message.includes('duplicate column')) logger.warn('Migration skipped', { sql, error: e.message }); }
}

// Admin por defecto
if (!db.prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`).get()) {
  const rawPassword = process.env.ADMIN_PASSWORD || 'admin1234';
  db.prepare(`INSERT INTO users (username, password_hash, role, nombre) VALUES ('admin', ?, 'admin', 'Administrador')`)
    .run(bcrypt.hashSync(rawPassword, 12));
  logger.info('[DB] Usuario admin creado con contrasena hasheada.');
}

module.exports = db;
