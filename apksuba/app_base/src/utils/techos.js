// =====================================================================
// techos.js — Generacion de "techo pictorico 2D" para los salones
// ---------------------------------------------------------------------
// A partir del footprint 2D de cada edificio (planta), se calculan
// poligonos y lineas que SIMULAN el tejado visto desde arriba:
//   - "recto":     sin cumbrera (solo relleno + borde del footprint).
//   - "dos_aguas": una cumbrera por el eje mas largo + 2 faldones.
//   - "m":         dos cumbreras paralelas + valle central + 4 faldones.
//
// Es geometria 2D georreferenciada (lng/lat), por lo que se ve bien en
// calles y en satelite, a cualquier zoom y orientacion, sin datos 3D.
//
// Convenio de entrada: el footprint llega en [lat, lng] (igual que
// territorios.json). Aqui se trabaja internamente en [lng, lat] para
// ser consistente con GeoJSON y con el resto de utilidades del mapa.
// =====================================================================

// Metros aproximados por grado, para calcular distancias/offsets locales.
const MLAT = 110574;
function mLng(lat) {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

// Convierte un anillo [lat,lng] -> [lng,lat] y quita el vertice de cierre
// duplicado si existe (para trabajar con los vertices "unicos").
function anilloLngLat(ringLatLng) {
  const r = ringLatLng.map((p) => [p[1], p[0]]); // [lng, lat]
  if (r.length > 1) {
    const a = r[0];
    const b = r[r.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) r.pop();
  }
  return r;
}

// Centroide simple (promedio de vertices) en [lng, lat].
function centroide(ring) {
  let sx = 0;
  let sy = 0;
  for (const p of ring) {
    sx += p[0];
    sy += p[1];
  }
  return [sx / ring.length, sy / ring.length];
}

// Proyecta un punto lng/lat a metros locales relativos a un origen,
// para poder hacer algebra lineal (PCA, offsets) sin distorsion de grados.
function aMetros(p, origen, kx) {
  return [(p[0] - origen[0]) * kx, (p[1] - origen[1]) * MLAT];
}
function aGrados(m, origen, kx) {
  return [origen[0] + m[0] / kx, origen[1] + m[1] / MLAT];
}

// Calcula el eje principal (direccion mas larga) del footprint mediante
// PCA 2D. Devuelve el vector unitario del eje mayor y el centro, en metros.
function ejePrincipal(ringMetros) {
  const n = ringMetros.length;
  let cx = 0;
  let cy = 0;
  for (const p of ringMetros) {
    cx += p[0];
    cy += p[1];
  }
  cx /= n;
  cy /= n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of ringMetros) {
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= n;
  syy /= n;
  sxy /= n;

  // Angulo del autovector mayor de la matriz de covarianza 2x2.
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ejeMayor = [Math.cos(theta), Math.sin(theta)];
  const ejeMenor = [-Math.sin(theta), Math.cos(theta)];

  // Extension del footprint a lo largo de cada eje (para dimensionar).
  let minMayor = Infinity;
  let maxMayor = -Infinity;
  let minMenor = Infinity;
  let maxMenor = -Infinity;
  for (const p of ringMetros) {
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    const projMayor = dx * ejeMayor[0] + dy * ejeMayor[1];
    const projMenor = dx * ejeMenor[0] + dy * ejeMenor[1];
    if (projMayor < minMayor) minMayor = projMayor;
    if (projMayor > maxMayor) maxMayor = projMayor;
    if (projMenor < minMenor) minMenor = projMenor;
    if (projMenor > maxMenor) maxMenor = projMenor;
  }

  return {
    centro: [cx, cy],
    ejeMayor,
    ejeMenor,
    largo: maxMayor - minMayor,
    ancho: maxMenor - minMenor,
    minMayor,
    maxMayor
  };
}

// Interseccion de la recta de la cumbrera (punto + direccion) con el
// contorno del footprint, para que la cumbrera no sobresalga del tejado.
// Recorta la cumbrera al polígono devolviendo [pA, pB] en metros.
function recortarLineaAlPoligono(ringMetros, punto, dir) {
  // Recta parametrica: punto + t*dir. Buscamos t minimo y maximo que
  // caen dentro del poligono muestreando intersecciones con los lados.
  const ts = [];
  const n = ringMetros.length;
  for (let i = 0; i < n; i++) {
    const a = ringMetros[i];
    const b = ringMetros[(i + 1) % n];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    // Resolver punto + t*dir = a + s*e  (0<=s<=1)
    const denom = dir[0] * -ey - dir[1] * -ex;
    if (Math.abs(denom) < 1e-9) continue;
    const rhsx = a[0] - punto[0];
    const rhsy = a[1] - punto[1];
    const t = (rhsx * -ey - rhsy * -ex) / denom;
    const s = (dir[0] * rhsy - dir[1] * rhsx) / denom;
    if (s >= -1e-6 && s <= 1 + 1e-6) ts.push(t);
  }
  if (ts.length < 2) return null;
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  // Reducir un poco en los extremos para dejar alero.
  const margen = (tMax - tMin) * 0.08;
  const t0 = tMin + margen;
  const t1 = tMax - margen;
  return [
    [punto[0] + t0 * dir[0], punto[1] + t0 * dir[1]],
    [punto[0] + t1 * dir[0], punto[1] + t1 * dir[1]]
  ];
}

// Recorta un poligono (array de [x,y] en metros) por un semiplano definido
// por un punto y una normal. Conserva la parte donde (p - punto)·normal >= 0.
// Algoritmo de Sutherland–Hodgman (un solo borde de corte).
function recortarPorSemiplano(poligono, punto, normal) {
  const dentro = (p) =>
    (p[0] - punto[0]) * normal[0] + (p[1] - punto[1]) * normal[1] >= 0;

  const interseccion = (a, b) => {
    const da = (a[0] - punto[0]) * normal[0] + (a[1] - punto[1]) * normal[1];
    const db = (b[0] - punto[0]) * normal[0] + (b[1] - punto[1]) * normal[1];
    const t = da / (da - db);
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  };

  const salida = [];
  const n = poligono.length;
  for (let i = 0; i < n; i++) {
    const actual = poligono[i];
    const siguiente = poligono[(i + 1) % n];
    const actualDentro = dentro(actual);
    const siguienteDentro = dentro(siguiente);

    if (actualDentro) {
      salida.push(actual);
      if (!siguienteDentro) salida.push(interseccion(actual, siguiente));
    } else if (siguienteDentro) {
      salida.push(interseccion(actual, siguiente));
    }
  }
  return salida;
}

// Construye las features de techo para UN edificio.
// Devuelve { faldones: [ {coords, lado} ], cumbreras: [ [p,p] ] } en [lng,lat].
function construirTecho(ringLatLng, tipoTecho) {
  const ring = anilloLngLat(ringLatLng);
  if (ring.length < 3) return { faldones: [], cumbreras: [] };

  const cen = centroide(ring);
  const kx = mLng(cen[1]);
  const ringM = ring.map((p) => aMetros(p, cen, kx));

  if (tipoTecho === 'recto') {
    // Sin cumbrera ni faldones. El relleno lo dibuja la capa base.
    return { faldones: [], cumbreras: [] };
  }

  const eje = ejePrincipal(ringM);
  const dir = eje.ejeMayor; // direccion de la cumbrera (eje mas largo)
  const normal = eje.ejeMenor; // perpendicular a la cumbrera

  const cumbreras = [];
  const faldones = [];

  if (tipoTecho === 'dos_aguas') {
    // Una cumbrera por el centro, a lo largo del eje mayor.
    const linea = recortarLineaAlPoligono(ringM, eje.centro, dir);
    if (linea) cumbreras.push(linea);

    // Dos faldones: el footprint recortado a cada lado de la cumbrera.
    const aguaA = recortarPorSemiplano(ringM, eje.centro, normal);
    const aguaB = recortarPorSemiplano(ringM, eje.centro, [-normal[0], -normal[1]]);
    if (aguaA.length >= 3) faldones.push({ lado: 0, coords: aguaA });
    if (aguaB.length >= 3) faldones.push({ lado: 1, coords: aguaB });
  } else if (tipoTecho === 'm') {
    // Dos cumbreras paralelas desplazadas a +/-1/4 del ancho (perfil M).
    const offset = eje.ancho * 0.25;
    const pA = [eje.centro[0] + normal[0] * offset, eje.centro[1] + normal[1] * offset];
    const pB = [eje.centro[0] - normal[0] * offset, eje.centro[1] - normal[1] * offset];
    const l1 = recortarLineaAlPoligono(ringM, pA, dir);
    const l2 = recortarLineaAlPoligono(ringM, pB, dir);
    if (l1) cumbreras.push(l1);
    if (l2) cumbreras.push(l2);

    // Cuatro faldones (dos tejados juntos): se recorta el footprint en tres
    // bandas y se asignan tonos alternos para dar el relieve de la M.
    const bandaSup = recortarPorSemiplano(ringM, pA, normal); // mas alla de pA
    const bandaMedia = recortarPorSemiplano(
      recortarPorSemiplano(ringM, pA, [-normal[0], -normal[1]]),
      pB,
      normal
    ); // entre pA y pB (el valle)
    const bandaInf = recortarPorSemiplano(ringM, pB, [-normal[0], -normal[1]]); // mas alla de pB
    if (bandaSup.length >= 3) faldones.push({ lado: 0, coords: bandaSup });
    if (bandaMedia.length >= 3) faldones.push({ lado: 1, coords: bandaMedia });
    if (bandaInf.length >= 3) faldones.push({ lado: 0, coords: bandaInf });
  }

  // Convertir a [lng, lat].
  const cumbrerasLngLat = cumbreras.map((l) => l.map((m) => aGrados(m, cen, kx)));
  const faldonesLngLat = faldones.map((f) => ({
    lado: f.lado,
    coords: f.coords.map((m) => aGrados(m, cen, kx))
  }));

  return { faldones: faldonesLngLat, cumbreras: cumbrerasLngLat };
}

// Punto interior de etiqueta (centroide) en [lng, lat] para un edificio.
export function puntoEtiquetaEdificio(ringLatLng) {
  const ring = anilloLngLat(ringLatLng);
  return centroide(ring);
}

// -----------------------------------------------------------------
// API publica: construye los FeatureCollection de techos para TODOS
// los edificios, listos para alimentar las fuentes GeoJSON de MapLibre.
// -----------------------------------------------------------------

// Faldones (poligonos sombreados). Propiedad "lado" para el tono.
export function construirFaldonesFeatureCollection(edificios) {
  const features = [];
  edificios.forEach((e) => {
    const ring = (e.poligonos && e.poligonos[0]) || [];
    if (ring.length < 3) return;
    const { faldones } = construirTecho(ring, e.techo || 'recto');
    faldones.forEach((f, i) => {
      if (!f.coords || f.coords.length < 3) return;
      const anillo = [...f.coords];
      // cerrar anillo
      anillo.push(anillo[0]);
      features.push({
        type: 'Feature',
        id: `${e.id}-faldon-${i}`,
        properties: { id: e.id, lado: f.lado },
        geometry: { type: 'Polygon', coordinates: [anillo] }
      });
    });
  });
  return { type: 'FeatureCollection', features };
}

// Cumbreras y valles (lineas). Para "m" hay 2 cumbreras (perfil M).
export function construirCumbrerasFeatureCollection(edificios) {
  const features = [];
  edificios.forEach((e) => {
    const ring = (e.poligonos && e.poligonos[0]) || [];
    if (ring.length < 3) return;
    const { cumbreras } = construirTecho(ring, e.techo || 'recto');
    cumbreras.forEach((linea, i) => {
      features.push({
        type: 'Feature',
        id: `${e.id}-cumbrera-${i}`,
        properties: { id: e.id },
        geometry: { type: 'LineString', coordinates: linea }
      });
    });
  });
  return { type: 'FeatureCollection', features };
}
