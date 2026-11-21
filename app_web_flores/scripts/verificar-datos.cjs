// =====================================================================
// verificar-datos.cjs — Verifica la integridad de la importación
// ---------------------------------------------------------------------
// Compara lo que hay en SQLite contra los archivos fuente territorio_N.json:
//   - nº de territorios, manzanas y caras
//   - que cada manzana tenga tantas caras como vértices su polígono
//   - que todas las caras estén en blanco (esta migración de prueba)
// Termina con código 0 si todo cuadra, 1 si hay discrepancias.
// =====================================================================

const fs = require('fs');
const path = require('path');
const { abrirDB, cerrarDB } = require('../servidor/db.cjs');

const DIR_MAPAS = path.join(__dirname, '..', 'datos', 'mapas');

function contarEnArchivos() {
  let terr = 0, manz = 0, caras = 0;
  const archivos = fs.readdirSync(DIR_MAPAS).filter(f => /^territorio_\d+\.json$/.test(f));
  for (const f of archivos) {
    const d = JSON.parse(fs.readFileSync(path.join(DIR_MAPAS, f), 'utf8'));
    terr++;
    for (const m of (d.manzanas || [])) {
      manz++;
      caras += (m.puntos || []).length;
    }
  }
  return { terr, manz, caras };
}

function verificar() {
  const db = abrirDB();
  const esperado = contarEnArchivos();

  const enDb = {
    terr: db.prepare('SELECT COUNT(*) c FROM territorios').get().c,
    manz: db.prepare('SELECT COUNT(*) c FROM manzanas').get().c,
    caras: db.prepare('SELECT COUNT(*) c FROM caras').get().c
  };

  const problemas = [];

  if (enDb.terr !== esperado.terr) problemas.push(`Territorios: BD=${enDb.terr}, archivos=${esperado.terr}`);
  if (enDb.manz !== esperado.manz) problemas.push(`Manzanas: BD=${enDb.manz}, archivos=${esperado.manz}`);
  if (enDb.caras !== esperado.caras) problemas.push(`Caras: BD=${enDb.caras}, archivos=${esperado.caras}`);

  // Cada manzana debe tener tantas caras como vértices (= nº de aristas)
  const manzanasMalContadas = db.prepare(`
    SELECT m.id, m.numero,
           (SELECT COUNT(*) FROM caras c WHERE c.manzana_id = m.id) AS n_caras,
           json_array_length(m.puntos_json) AS n_vertices
    FROM manzanas m
    WHERE n_caras <> n_vertices
  `).all();
  if (manzanasMalContadas.length > 0) {
    problemas.push(`Manzanas con nº de caras != nº de vértices: ${manzanasMalContadas.length}`);
  }

  // En esta migración de prueba, todo debe estar en blanco
  const hechas = db.prepare("SELECT COUNT(*) c FROM caras WHERE estado_normal <> 'sin_hacer'").get().c;
  const negocios = db.prepare('SELECT COUNT(*) c FROM caras WHERE es_negocio <> 0').get().c;
  if (hechas !== 0) problemas.push(`Se esperaban 0 caras 'hechas', hay ${hechas}`);
  if (negocios !== 0) problemas.push(`Se esperaban 0 caras de negocio, hay ${negocios}`);

  // Integridad referencial: ninguna manzana huérfana, ninguna cara huérfana
  const manzHuerfanas = db.prepare(`
    SELECT COUNT(*) c FROM manzanas m
    WHERE NOT EXISTS (SELECT 1 FROM territorios t WHERE t.id = m.territorio_id)
  `).get().c;
  const carasHuerfanas = db.prepare(`
    SELECT COUNT(*) c FROM caras c
    WHERE NOT EXISTS (SELECT 1 FROM manzanas m WHERE m.id = c.manzana_id)
  `).get().c;
  if (manzHuerfanas > 0) problemas.push(`Manzanas sin territorio: ${manzHuerfanas}`);
  if (carasHuerfanas > 0) problemas.push(`Caras sin manzana: ${carasHuerfanas}`);

  console.log('== Verificación de integridad ==');
  console.log(`Territorios: ${enDb.terr} (esperado ${esperado.terr})`);
  console.log(`Manzanas:    ${enDb.manz} (esperado ${esperado.manz})`);
  console.log(`Caras:       ${enDb.caras} (esperado ${esperado.caras})`);
  console.log(`Caras hechas: ${hechas} · Caras de negocio: ${negocios} (ambas deben ser 0)`);

  if (problemas.length === 0) {
    console.log('\n[OK] Todo correcto. La importacion es integra.');
    return true;
  } else {
    console.log('\n[X] Problemas detectados:');
    problemas.forEach(p => console.log('  - ' + p));
    return false;
  }
}

if (require.main === module) {
  const ok = verificar();
  cerrarDB();
  process.exit(ok ? 0 : 1);
}

module.exports = { verificar, contarEnArchivos };
