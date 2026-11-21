import {
  LIBERTY_STYLE_URL,
  ESRI_SATELLITE_URL,
  LOCAL_STYLE_URL
} from '../config/mapa';
import { cargarPmtilesLocal } from './pmtilesLocal';

let cachedLibertyStyle = null;
let cachedLocalStyle = null;

// Tiempo maximo para esperar el estilo online antes de usar el local.
const TIMEOUT_ONLINE_MS = 6000;

// true si el sistema declara que no hay red (modo avion, sin datos).
function sinRedDeclarada() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// Helper para detectar fuentes disponibles en el estilo de mapa (glyphs OpenFreeMap)
export function pickFonts(style) {
  let bold = null, reg = null;
  for (const l of (style?.layers || [])) {
    const f = l.layout && l.layout['text-font'];
    if (Array.isArray(f) && f.length && f.every(x => typeof x === 'string')) {
      if (!bold && /bold/i.test(f[0])) bold = f;
      if (!reg && !/bold/i.test(f[0])) reg = f;
      if (bold && reg) break;
    }
  }
  // Si el estilo no tiene fuente negrita (p.ej. el estilo local offline,
  // que solo trae "Noto Sans Regular"), se usa la regular que si existe.
  // Pedir una fuente que no existe deja las etiquetas sin dibujar.
  return {
    bold: bold || reg || ['Noto Sans Bold', 'Open Sans Bold'],
    reg: reg || ['Noto Sans Regular', 'Open Sans Regular']
  };
}

// Obtiene el estilo base Liberty de OpenFreeMap (ONLINE).
// Devuelve null si no hay conexion o si el servidor no responde a tiempo.
export async function getLibertyStyle() {
  if (cachedLibertyStyle) return cachedLibertyStyle;
  if (sinRedDeclarada()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_ONLINE_MS);
  try {
    const res = await fetch(LIBERTY_STYLE_URL, { signal: controller.signal });
    if (!res.ok) return null;
    cachedLibertyStyle = await res.json();
    return cachedLibertyStyle;
  } catch (err) {
    console.warn('Estilo online no disponible:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Obtiene el estilo LOCAL (apunta al PMTiles empaquetado en la app).
// Antes carga el .pmtiles en memoria (ver pmtilesLocal.js).
// Devuelve null si el mapa local no esta disponible.
export async function getLocalStyle() {
  if (cachedLocalStyle) return cachedLocalStyle;
  const pmtilesListo = await cargarPmtilesLocal();
  if (!pmtilesListo) return null;
  try {
    // 'no-cache': revalida contra el archivo local para no usar una copia
    // vieja del estilo. El archivo es local, asi que funciona sin internet.
    const res = await fetch(LOCAL_STYLE_URL, { cache: 'no-cache' });
    if (!res.ok) return null;
    cachedLocalStyle = await res.json();
    return cachedLocalStyle;
  } catch (err) {
    console.warn('Estilo local no disponible todavia:', err);
    return null;
  }
}

// Indica si el estilo local (PMTiles) esta disponible en la app.
export async function existeEstiloLocal() {
  const s = await getLocalStyle();
  return s != null;
}

// Resuelve el estilo de CALLES a usar segun el modo y la conectividad.
//   usarLocal = true  -> estilo local; si no existe, se intenta online.
//   usarLocal = false -> estilo online; si falla (sin internet), local.
// Devuelve { style, esLocal }. style es null solo si ambos fallan.
export async function getCallesStyle(usarLocal) {
  if (usarLocal) {
    const local = await getLocalStyle();
    if (local) return { style: local, esLocal: true };
    const online = await getLibertyStyle();
    return { style: online, esLocal: false };
  }
  const online = await getLibertyStyle();
  if (online) return { style: online, esLocal: false };
  // Sin internet: el mapa local evita que la pantalla quede en blanco.
  const local = await getLocalStyle();
  return { style: local, esLocal: !!local };
}

let cachedSatStyle = null;

// Construye el estilo híbrido Satélite (Esri + nombres de calles de Liberty).
// Devuelve null si no hay internet: el satelite no existe sin conexion.
// Se cachea para devolver siempre el mismo objeto (evita recargas dobles).
export async function getSatelliteHybridStyle() {
  if (cachedSatStyle) return cachedSatStyle;
  const base = await getLibertyStyle();
  if (!base) return null;
  cachedSatStyle = construirSatelite(base);
  return cachedSatStyle;
}

function construirSatelite(base) {

  // Filtrar solo las capas de símbolos/etiquetas y carreteras translúcidas
  const symbolLayers = base.layers.filter(l => l.type === 'symbol');

  return {
    version: 8,
    name: 'Satélite Híbrido',
    glyphs: base.glyphs,
    sprite: base.sprite,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [ESRI_SATELLITE_URL],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; Esri, Maxar, Earthstar Geographics'
      },
      openmaptiles: base.sources.openmaptiles
    },
    layers: [
      {
        id: 'esri-satellite-base',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 22
      },
      ...symbolLayers
    ]
  };
}
