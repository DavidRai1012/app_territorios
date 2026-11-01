import { LIBERTY_STYLE_URL, ESRI_SATELLITE_URL } from '../config/mapa';

let cachedLibertyStyle = null;

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
  return {
    bold: bold || ['Noto Sans Bold', 'Open Sans Bold'],
    reg: reg || ['Noto Sans Regular', 'Open Sans Regular']
  };
}

// Obtiene el estilo base Liberty de OpenFreeMap
export async function getLibertyStyle() {
  if (cachedLibertyStyle) return cachedLibertyStyle;
  try {
    const res = await fetch(LIBERTY_STYLE_URL);
    cachedLibertyStyle = await res.json();
    return cachedLibertyStyle;
  } catch (err) {
    console.error('Error al cargar estilo Liberty:', err);
    return LIBERTY_STYLE_URL;
  }
}

// Construye el estilo híbrido Satélite (Esri + nombres de calles de Liberty)
export async function getSatelliteHybridStyle() {
  const base = await getLibertyStyle();
  if (typeof base === 'string') {
    // Si fetch falló, devolver objeto mínimo con Esri
    return {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [ESRI_SATELLITE_URL],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; Esri, Maxar, Earthstar Geographics'
        }
      },
      layers: [
        {
          id: 'esri-satellite-layer',
          type: 'raster',
          source: 'esri-satellite'
        }
      ]
    };
  }

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
