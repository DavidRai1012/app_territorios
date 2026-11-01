import { TERRITORY_PALETTE } from '../config/mapa';

const MLAT = 110574;
function mLng(lat) {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

// Cierra un anillo de coordenadas si no está cerrado
export function closeRing(r) {
  if (!r || r.length === 0) return [];
  const first = r[0];
  const last = r[r.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return r;
  return [...r, first];
}

// Convierte coordenadas [lat, lng] a [lng, lat] de GeoJSON y cierra anillos
export function toGeoJSONCoords(ringsLatLng) {
  if (!Array.isArray(ringsLatLng)) return [];
  return ringsLatLng.map(ring => {
    if (!Array.isArray(ring)) return [];
    const converted = ring.map(pt => [pt[1], pt[0]]); // [lng, lat]
    return closeRing(converted);
  });
}

// Calcula el área aproximada en km²
export function calculateAreaKm2(ringsLatLng) {
  if (!Array.isArray(ringsLatLng) || ringsLatLng.length === 0) return 0;
  let totalSqMeters = 0;

  for (const ring of ringsLatLng) {
    if (!ring || ring.length < 3) continue;
    const lat0 = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const kx = mLng(lat0);
    const o = ring[0];
    let a = 0;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i];
      const q = ring[(i + 1) % ring.length];
      const px = (p[1] - o[1]) * kx;
      const py = (p[0] - o[0]) * MLAT;
      const qx = (q[1] - o[1]) * kx;
      const qy = (q[0] - o[0]) * MLAT;
      a += px * qy - qx * py;
    }
    totalSqMeters += Math.abs(a) / 2;
  }

  return (totalSqMeters / 1_000_000).toFixed(2);
}

function distPtSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function pointInRing(pt, r) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function distToRing(pt, r) {
  const kx = mLng(pt[1]), px = pt[0] * kx, py = pt[1] * MLAT;
  let best = Infinity;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    const d = distPtSeg(px, py, a[0] * kx, a[1] * MLAT, b[0] * kx, b[1] * MLAT);
    if (d < best) best = d;
  }
  return best;
}

// Punto óptimo interior para colocar la etiqueta centrada sin tapar bordes
export function labelPoint(r) {
  if (!r || r.length < 3) return [0, 0];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of r) {
    if (p[0] < x0) x0 = p[0];
    if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }

  const N = 24;
  let best = null, bd = -1;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const p = [x0 + ((x1 - x0) * i) / N, y0 + ((y1 - y0) * j) / N];
      if (!pointInRing(p, r)) continue;
      const d = distToRing(p, r);
      if (d > bd) {
        bd = d;
        best = p;
      }
    }
  }

  return best || [(x0 + x1) / 2, (y0 + y1) / 2];
}

// Genera un GeoJSON FeatureCollection optimizado a partir del bundle v3
export function buildGeoJSONFeatureCollection(territorios) {
  const features = [];

  territorios.forEach((t, index) => {
    const color = t.color || TERRITORY_PALETTE[index % TERRITORY_PALETTE.length];
    const rings = t.poligonos || [];
    if (rings.length === 0) return;

    // Convertir anillos a [lng, lat]
    const geoJSONCoordinates = toGeoJSONCoords(rings);
    
    // Encontrar el anillo más grande para el punto de etiqueta
    let largestRing = rings[0];
    let maxLen = rings[0].length;
    for (let k = 1; k < rings.length; k++) {
      if (rings[k].length > maxLen) {
        largestRing = rings[k];
        maxLen = rings[k].length;
      }
    }

    const largestRingLngLat = largestRing.map(p => [p[1], p[0]]);
    const [centerLng, centerLat] = labelPoint(largestRingLngLat);

    features.push({
      type: 'Feature',
      id: t.id,
      properties: {
        id: t.id,
        nombre: t.nombre || `Territorio ${t.numero || index + 1}`,
        numero: t.numero != null ? String(t.numero) : '',
        localidad: t.localidad || '',
        descripcion: t.descripcion || '',
        color: color,
        centerLng: centerLng,
        centerLat: centerLat,
        areaKm2: calculateAreaKm2(rings)
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [geoJSONCoordinates]
      }
    });
  });

  return {
    type: 'FeatureCollection',
    features
  };
}

// Generador de puntos de etiqueta GeoJSON
export function buildLabelsFeatureCollection(featureCollection) {
  const labelFeatures = [];

  featureCollection.features.forEach(f => {
    labelFeatures.push({
      type: 'Feature',
      id: 'label-' + f.properties.id,
      properties: {
        id: f.properties.id,
        nombre: f.properties.nombre,
        color: f.properties.color
      },
      geometry: {
        type: 'Point',
        coordinates: [f.properties.centerLng, f.properties.centerLat]
      }
    });
  });

  return {
    type: 'FeatureCollection',
    features: labelFeatures
  };
}

// Calcula el bounding box global para encuadrar la cámara
export function getBoundsFromGeoJSON(featureCollection, selectedIds = null) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let count = 0;

  featureCollection.features.forEach(f => {
    if (selectedIds && !selectedIds.has(f.properties.id)) return;

    const coords = f.geometry.coordinates; // MultiPolygon -> [polygons][rings][points]
    coords.forEach(poly => {
      poly.forEach(ring => {
        ring.forEach(pt => {
          const lng = pt[0], lat = pt[1];
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          count++;
        });
      });
    });
  });

  if (count === 0 || minLng === Infinity) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

// Genera 18 territorios demo para pruebas de rendimiento en móvil
export function generateDemoTerritories(centerLat = 4.745, centerLng = -74.095) {
  const demos = [];
  const rows = 4, cols = 5;
  const stepLat = 0.008, stepLng = 0.012;

  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (demos.length >= 18) break;
      count++;
      const baseLat = centerLat + (r - rows / 2) * stepLat;
      const baseLng = centerLng + (c - cols / 2) * stepLng;

      const ring = [
        [baseLat, baseLng],
        [baseLat + stepLat * 0.85, baseLng],
        [baseLat + stepLat * 0.85, baseLng + stepLng * 0.85],
        [baseLat, baseLng + stepLng * 0.85]
      ];

      demos.push({
        id: `demo-${count}`,
        nombre: `Zona Demo ${count}`,
        numero: count,
        localidad: 'Demostración',
        descripcion: `Territorio de prueba ${count} generado automáticamente para evaluar rendimiento.`,
        limites_texto: {
          norte: `Calle ${140 + count}`,
          sur: `Calle ${138 + count}`,
          oriente: `Cra ${90 + count}`,
          occidente: `Cra ${92 + count}`
        },
        calles: [
          { nombre: `Avenida Demo ${count}`, desde: 'Inicio', hasta: 'Fin' }
        ],
        color: TERRITORY_PALETTE[(count - 1) % TERRITORY_PALETTE.length],
        poligonos: [ring],
        puntos_interes: []
      });
    }
  }

  return demos;
}
