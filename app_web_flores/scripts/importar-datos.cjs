// =====================================================================
// importar-datos.cjs — Importa los datos geográficos reales a SQLite
// ---------------------------------------------------------------------
// App Web Flores. Lee los 37 territorio_N.json de datos/mapas/, llena las
// tablas territorios, manzanas y caras, y deja TODOS los estados en blanco
// (sin_hacer, sin negocios).
//
// NOTA sobre estados (migración del 2026-11-20):
//   Los estados existentes en partStates.json eran DATOS DE PRUEBA, por
//   decisión explícita del usuario. Por eso esta importación NO traslada
//   estados: todas las caras quedan 'sin_hacer' y sin marca de negocio.
//   La función de traslado de estados antiguos queda escrita para el futuro
//   (ver mapearEstadosAntiguos, desactivada por defecto) pero NO se ejecuta.
//
// Referencias: ADR-002 (modelo de caras), RNF-16 (respaldo antes de migrar).
// =====================================================================

const fs = require('fs');
const path = require('path');
const { abrirDB, crearEsquema, cerrarDB } = require('../servidor/db.cjs');

const DIR_MAPAS = path.join(__dirname, '..', 'datos', 'mapas');
const DIR_BACKUPS = path.join(__dirname, '..', 'backups');

// ---------------------------------------------------------------------
// 1. Respaldo de los datos fuente antes de migrar (RNF-16)
// ---------------------------------------------------------------------
function respaldarDatosFuente() {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const destino = path.join(DIR_BACKUPS, `datos-fuente-${fecha}`);
  fs.mkdirSync(destino, { recursive: true });

  const dirDatos = path.join(__dirname, '..', 'datos');
  // Copiar los 37 mapas
  const destMapas = path.join(destino, 'mapas');
  fs.mkdirSync(destMapas, { recursive: true });
  for (const f of fs.readdirSync(DIR_MAPAS)) {
    if (f.endsWith('.json')) {
      fs.copyFileSync(path.join(DIR_MAPAS, f), path.join(destMapas, f));
    }
  }
  // Copiar partStates y activityLog si existen (referencia histórica)
  for (const f of ['partStates.json', 'activityLog.json']) {
    const origen = path.join(dirDatos, f);
    if (fs.existsSync(origen)) fs.copyFileSync(origen, path.join(destino, f));
  }
  return destino;
}

// ---------------------------------------------------------------------
// 2. Utilidades geográficas
// ---------------------------------------------------------------------

// Geohash simple (precisión fija) del punto medio de una arista. Sirve como
// huella de verificación (ADR-002 §5): si la geometría cambia, la huella no
// coincide y la cara puede marcarse para revisión. No se usa para indexar.
// Implementación compacta del algoritmo geohash estándar.
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
function geohash(lat, lng, precision = 9) {
  let idx = 0, bit = 0, evenBit = true, hash = '';
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { idx = idx * 2 + 1; lngMin = mid; } else { idx = idx * 2; lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { idx = idx * 2 + 1; latMin = mid; } else { idx = idx * 2; latMax = mid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { hash += BASE32[idx]; bit = 0; idx = 0; }
  }
  return hash;
}

// Punto medio de la arista i de un polígono de puntos [[lat,lng],...].
// La arista i va del vértice i al (i+1) módulo n (la última cierra el anillo).
function puntoMedioArista(puntos, i) {
  const a = puntos[i];
  const b = puntos[(i + 1) % puntos.length];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// ---------------------------------------------------------------------
// 3. Importación de la geometría
// ---------------------------------------------------------------------
function importar() {
  const db = crearEsquema(); // asegura que las tablas existan

  const insTerritorio = db.prepare(
    `INSERT INTO territorios (id, numero, limites_json) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET numero=excluded.numero, limites_json=excluded.limites_json`
  );
  const insManzana = db.prepare(
    `INSERT INTO manzanas (id, territorio_id, numero, puntos_json) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET territorio_id=excluded.territorio_id, numero=excluded.numero, puntos_json=excluded.puntos_json`
  );
  const insCara = db.prepare(
    `INSERT INTO caras (id, manzana_id, indice, geohash, estado_normal, es_negocio, estado_negocio)
     VALUES (?, ?, ?, ?, 'sin_hacer', 0, NULL)
     ON CONFLICT(id) DO NOTHING`
  );

  let nTerr = 0, nManz = 0, nCaras = 0;

  // Todo dentro de una transacción: o entra todo, o no entra nada.
  const tx = db.transaction(() => {
    const archivos = fs.readdirSync(DIR_MAPAS)
      .filter(f => /^territorio_\d+\.json$/.test(f))
      // ordenar por número de territorio (1..37), no alfabético
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

    for (const archivo of archivos) {
      const data = JSON.parse(fs.readFileSync(path.join(DIR_MAPAS, archivo), 'utf8'));
      const territorioId = data.territorio_id;        // "T1"
      const numeroTerr = String(data.numero_territorio);
      const limites = data.limites || [];

      insTerritorio.run(territorioId, numeroTerr, JSON.stringify(limites));
      nTerr++;

      for (const m of (data.manzanas || [])) {
        const puntos = m.puntos || [];
        insManzana.run(m.id, territorioId, String(m.numero), JSON.stringify(puntos));
        nManz++;

        // Derivar una cara por arista del polígono.
        for (let i = 0; i < puntos.length; i++) {
          const idLogico = `${territorioId}::${m.id}::f${i}`;
          const [latMed, lngMed] = puntoMedioArista(puntos, i);
          insCara.run(idLogico, m.id, i, geohash(latMed, lngMed));
          nCaras++;
        }
      }
    }
  });

  tx();

  return { nTerr, nManz, nCaras };
}

// ---------------------------------------------------------------------
// 4. (FUTURO, DESACTIVADO) Traslado de estados antiguos desde partStates.json
// ---------------------------------------------------------------------
// NO se ejecuta en la migración del 2026-11-20 (datos de prueba).
// Queda documentado para cuando haya datos reales que preservar:
//   clave "T{t}_m_{..}_p{i}" = "completed"  -> estado_normal = 'hecha'
//   clave "type_{..}"        = "business"   -> es_negocio   = 1
// El mapeo exacto de estado_normal vs estado_negocio para caras de negocio
// debe acordarse con el usuario antes de aplicarse (ver conversación A.3).
function mapearEstadosAntiguos() {
  throw new Error('Traslado de estados antiguos no implementado/activado. Ver nota de cabecera.');
}

// ---------------------------------------------------------------------
// Ejecución directa
// ---------------------------------------------------------------------
if (require.main === module) {
  console.log('== Importación de datos geográficos (App Web Flores) ==');
  const backup = respaldarDatosFuente();
  console.log(`1) Respaldo de datos fuente -> ${backup}`);

  const r = importar();
  console.log(`2) Importados: ${r.nTerr} territorios, ${r.nManz} manzanas, ${r.nCaras} caras.`);
  console.log('   (Todos los estados en blanco: datos de prueba, por decisión del usuario.)');

  cerrarDB();
  console.log('Listo.');
}

module.exports = { importar, geohash, puntoMedioArista, respaldarDatosFuente };
