// =====================================================================
// db.cjs — Conexión y esquema de la base de datos SQLite
// ---------------------------------------------------------------------
// App Web Flores. Base de datos de territorios, manzanas, caras, negocios
// y control de acceso (personas y admins).
//
// Decisiones de referencia:
//   - ADR-001: SQLite con better-sqlite3 (síncrono) + modo WAL.
//   - ADR-002: modelo territorios -> manzanas -> caras (doble faceta).
//   - ADR-004: personas (PIN) y admins (contraseña), credenciales con hash.
// =====================================================================

const path = require('path');
const Database = require('better-sqlite3');

// Ruta del archivo de base de datos. Por defecto, junto al servidor.
// Se puede sobrescribir con la variable de entorno FLORES_DB_PATH
// (útil para pruebas o para apuntar a otra ubicación en el servidor).
const RUTA_DB = process.env.FLORES_DB_PATH || path.join(__dirname, 'flores.db');

// Instancia única de la conexión (se reutiliza en toda la app).
let db = null;

// Abre (o crea) la base de datos y aplica la configuración recomendada.
function abrirDB() {
  if (db) return db;

  db = new Database(RUTA_DB);

  // WAL (Write-Ahead Logging): permite lecturas concurrentes mientras se
  // escribe. Adecuado para varios dispositivos leyendo y un servidor que
  // escribe (ADR-001).
  db.pragma('journal_mode = WAL');
  // Integridad referencial activa (respeta las claves foráneas).
  db.pragma('foreign_keys = ON');
  // Equilibrio seguridad/rendimiento razonable para esta escala.
  db.pragma('synchronous = NORMAL');

  return db;
}

// =====================================================================
// Esquema
// ---------------------------------------------------------------------
// Se crea con "IF NOT EXISTS": ejecutar crearEsquema() es idempotente,
// no borra datos existentes. La carga de datos va aparte (ver scripts de
// importación), para no mezclar estructura y contenido.
// =====================================================================

const ESQUEMA = `
-- Territorios (geometría del contorno). Datos reales de los 37 territorios.
CREATE TABLE IF NOT EXISTS territorios (
  id            TEXT PRIMARY KEY,          -- "T1".."T37"
  numero        TEXT NOT NULL,             -- número visible
  limites_json  TEXT NOT NULL              -- polígono del territorio: JSON [[lat,lng],...]
);

-- Manzanas: pertenecen a un territorio. Cada una es un polígono.
CREATE TABLE IF NOT EXISTS manzanas (
  id            TEXT PRIMARY KEY,          -- "m_1_b1782022723999" (id estable existente)
  territorio_id TEXT NOT NULL,
  numero        TEXT NOT NULL,             -- número visible
  puntos_json   TEXT NOT NULL,             -- vértices del polígono: JSON [[lat,lng],...]
  FOREIGN KEY (territorio_id) REFERENCES territorios(id)
);

-- Caras: una fila por arista del polígono de la manzana.
-- Doble faceta (ADR-002): estado_normal (predicación) y, si es_negocio=1,
-- estado_negocio. Los dos estados son independientes.
CREATE TABLE IF NOT EXISTS caras (
  id              TEXT PRIMARY KEY,         -- ID lógico: "T28::m_1_b...::f0"
  manzana_id      TEXT NOT NULL,
  indice          INTEGER NOT NULL,         -- 0..n-1 (número visible = indice+1)
  geohash         TEXT,                     -- huella del punto medio de la arista (verificación)
  estado_normal   TEXT NOT NULL DEFAULT 'sin_hacer',  -- 'sin_hacer' | 'hecha'
  es_negocio      INTEGER NOT NULL DEFAULT 0,          -- 0 | 1
  estado_negocio  TEXT DEFAULT NULL,        -- 'sin_hacer' | 'hecha' (solo si es_negocio=1)
  actualizado_por TEXT DEFAULT NULL,        -- nombre del editor (autoría blanda, ADR-003/004)
  actualizado_en  TEXT DEFAULT NULL,        -- timestamp ISO del último cambio
  FOREIGN KEY (manzana_id) REFERENCES manzanas(id),
  UNIQUE (manzana_id, indice)
);

-- Índice para consultar rápido las caras de una manzana.
CREATE INDEX IF NOT EXISTS idx_caras_manzana ON caras(manzana_id);

-- Personas con permiso de edición (PIN de 4 dígitos, ADR-004).
CREATE TABLE IF NOT EXISTS personas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  pin_hash   TEXT NOT NULL,                 -- hash bcrypt del PIN, NUNCA el PIN en claro
  activo     INTEGER NOT NULL DEFAULT 1,
  creado_en  TEXT NOT NULL
);

-- Administradores (contraseña fuerte, varios admins, ADR-004).
CREATE TABLE IF NOT EXISTS admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  password_hash  TEXT NOT NULL,             -- hash bcrypt de la contraseña, NUNCA en claro
  activo         INTEGER NOT NULL DEFAULT 1,
  creado_en      TEXT NOT NULL
);

-- Metadatos de la base (versión del esquema, fecha de migración, etc.).
CREATE TABLE IF NOT EXISTS meta (
  clave  TEXT PRIMARY KEY,
  valor  TEXT
);
`;

// Versión del esquema. Se guarda en 'meta' para futuras migraciones.
const VERSION_ESQUEMA = '1';

// Crea el esquema si no existe. Idempotente (no borra datos).
function crearEsquema() {
  const base = abrirDB();
  base.exec(ESQUEMA);
  base.prepare(
    `INSERT INTO meta (clave, valor) VALUES ('version_esquema', ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(VERSION_ESQUEMA);
  return base;
}

// Cierra la conexión (útil en scripts puntuales y pruebas).
function cerrarDB() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  RUTA_DB,
  VERSION_ESQUEMA,
  abrirDB,
  crearEsquema,
  cerrarDB
};

// Si se ejecuta directamente (node db.cjs), crea el esquema y avisa.
if (require.main === module) {
  crearEsquema();
  console.log(`Esquema creado/actualizado en: ${RUTA_DB}`);
  console.log(`Versión del esquema: ${VERSION_ESQUEMA}`);
  cerrarDB();
}
