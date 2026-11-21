import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getSatelliteHybridStyle, getCallesStyle, pickFonts } from '../utils/mapStyleHelper';
import { registrarProtocoloPmtiles } from '../utils/pmtilesLocal';
import {
  buildGeoJSONFeatureCollection,
  buildLabelsFeatureCollection,
  getBoundsFromGeoJSON,
  buildEdificiosFeatureCollection,
  buildEdificiosLabelsFeatureCollection
} from '../utils/geoUtils';
import {
  construirFaldonesFeatureCollection,
  construirCumbrerasFeatureCollection
} from '../utils/techos';
import { SALON_COLOR_DEFAULT } from '../config/mapa';

// Estilo minimo de respaldo: solo un fondo liso. Se usa si no hay ni mapa
// online ni mapa local. Asi el mapa carga igual y los territorios se ven.
const ESTILO_RESPALDO = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#f4f3ee' } }]
};

// Elige el estilo del mapa base. Nunca devuelve un estilo vacio:
//   - Satelite sin internet -> mapa de calles (local).
//   - Calles sin internet   -> mapa local (suba.pmtiles).
//   - Nada disponible       -> fondo liso de respaldo.
// Devuelve { style, tipo: 'calles'|'sat', esLocal }.
async function resolverEstilo(baseMapType, usarLocal) {
  if (baseMapType === 'sat') {
    const sat = await getSatelliteHybridStyle();
    if (sat) return { style: sat, tipo: 'sat', esLocal: false };
  }
  const r = await getCallesStyle(usarLocal);
  return { style: r.style || ESTILO_RESPALDO, tipo: 'calles', esLocal: r.esLocal };
}

export default function MapLibreMap({
  territories,
  selectedIds,
  onSelectTerritory,
  baseMapType,
  tiltEnabled,
  autoFitTrigger,
  themeColor,
  // --- Salones del Reino (edificios) ---
  edificios = [],
  salonColor = SALON_COLOR_DEFAULT,
  showEdificios = true,
  edificios3D = false,
  onSelectEdificio,
  // --- Mapa base online/offline ---
  usarMapaLocal = false,
  onEstadoFuente
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const isLoadedRef = useRef(false);
  // Estilo que se muestra ahora y tipo real del primer estilo cargado.
  const estiloActualRef = useRef(null);
  const tipoInicialRef = useRef(baseMapType);
  const [mapaCargado, setMapaCargado] = useState(false);

  // Refs con los valores vigentes de edificios/salon, para re-crear las
  // capas tras un cambio de estilo (style.load) sin depender del closure.
  const edificiosRef = useRef(edificios);
  const salonColorRef = useRef(salonColor);
  const showEdificiosRef = useRef(showEdificios);
  const edificios3DRef = useRef(edificios3D);
  const baseMapTypeRef = useRef(baseMapType);
  const usarMapaLocalRef = useRef(usarMapaLocal);
  edificiosRef.current = edificios;
  salonColorRef.current = salonColor;
  showEdificiosRef.current = showEdificios;
  edificios3DRef.current = edificios3D;
  baseMapTypeRef.current = baseMapType;
  usarMapaLocalRef.current = usarMapaLocal;

  // 1. Inicializar Mapa MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;

    registrarProtocoloPmtiles();

    let isCancelled = false;

    async function initMap() {
      const r = await resolverEstilo(baseMapType, usarMapaLocalRef.current);
      const initialStyle = r.style;
      estiloActualRef.current = r.style;
      tipoInicialRef.current = r.tipo;
      if (onEstadoFuente) onEstadoFuente({ tipo: r.tipo, esLocal: r.esLocal });

      if (isCancelled || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: initialStyle,
        center: [-74.102, 4.746],
        zoom: 14.5,
        minZoom: 11,
        maxZoom: 22,
        pitch: tiltEnabled ? 35 : 0,
        pitchWithRotate: tiltEnabled,
        attributionControl: false
      });

      // Atribución compacta en esquina inferior
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        isLoadedRef.current = true;
        mapRef.current = map;

        // Configurar capas de territorios y etiquetas
        setupTerritoryLayers(map, territories, selectedIds, tipoInicialRef.current);

        // Configurar capas de edificios (Salones del Reino)
        setupEdificioLayers(
          map,
          edificiosRef.current,
          tipoInicialRef.current,
          salonColorRef.current,
          showEdificiosRef.current,
          edificios3DRef.current
        );

        // Encuadre inicial si hay territorios
        const geoJSON = buildGeoJSONFeatureCollection(territories);
        const bounds = getBoundsFromGeoJSON(geoJSON, selectedIds);
        if (bounds) {
          map.fitBounds(bounds, { padding: 40, maxZoom: 17, duration: 1000 });
        }

        // Permite que el efecto de cambio de estilo revise si la conexion
        // cambio mientras el mapa cargaba (p.ej. se detecto "sin internet").
        setMapaCargado(true);
      });

      // Click en territorio para abrir ficha de detalle
      map.on('click', 'territorios-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const clickedId = e.features[0].properties.id;
          const found = territories.find(t => t.id === clickedId);
          if (found) onSelectTerritory(found);
        }
      });

      map.on('mouseenter', 'territorios-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'territorios-fill', () => {
        map.getCanvas().style.cursor = '';
      });

      // Click en un salon (edificio) para abrir su ficha, si se provee handler.
      map.on('click', 'edificios-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const clickedId = e.features[0].properties.id;
          const found = (edificiosRef.current || []).find((ed) => ed.id === clickedId);
          if (found && onSelectEdificio) onSelectEdificio(found);
        }
      });
      map.on('mouseenter', 'edificios-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'edificios-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        isLoadedRef.current = false;
      }
    };
  }, []);

  // 2. Cambio de estilo de mapa (Calles vs Satélite Híbrido)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    async function switchStyle() {
      const r = await resolverEstilo(baseMapType, usarMapaLocalRef.current);
      if (onEstadoFuente) onEstadoFuente({ tipo: r.tipo, esLocal: r.esLocal });

      // Si el estilo resultante es el mismo que ya se muestra, no recargar.
      if (r.style === estiloActualRef.current) return;
      estiloActualRef.current = r.style;

      map.setStyle(r.style, { diff: false });
      map.once('style.load', () => {
        setupTerritoryLayers(map, territories, selectedIds, r.tipo);
        setupEdificioLayers(
          map,
          edificiosRef.current,
          r.tipo,
          salonColorRef.current,
          showEdificiosRef.current,
          edificios3DRef.current
        );
      });
    }

    switchStyle();
  }, [baseMapType, usarMapaLocal, mapaCargado]);

  // 3. Actualizar datos de territorios (fuente GeoJSON)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    const source = map.getSource('territorios-source');
    const labelSource = map.getSource('territorios-labels-source');
    if (source && labelSource) {
      const geoJSON = buildGeoJSONFeatureCollection(territories);
      source.setData(geoJSON);
      labelSource.setData(buildLabelsFeatureCollection(geoJSON));
    }
  }, [territories]);

  // 4. Filtrado reactivo e instantáneo (sin recrear capas)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    const idList = Array.from(selectedIds);
    const filter = ['in', ['get', 'id'], ['literal', idList]];

    if (map.getLayer('territorios-fill')) map.setFilter('territorios-fill', filter);
    if (map.getLayer('territorios-line')) map.setFilter('territorios-line', filter);
    if (map.getLayer('territorios-labels')) map.setFilter('territorios-labels', filter);
  }, [selectedIds]);

  // 5. Inclinación 3D del mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setPitch(tiltEnabled ? 35 : 0);
  }, [tiltEnabled]);

  // 6. Disparador de auto-encuadre de cámara
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current || autoFitTrigger === 0) return;

    const geoJSON = buildGeoJSONFeatureCollection(territories);
    const bounds = getBoundsFromGeoJSON(geoJSON, selectedIds);
    if (bounds) {
      map.fitBounds(bounds, { padding: 45, maxZoom: 18, duration: 800 });
    }
  }, [autoFitTrigger]);

  // 7. Actualizar datos de edificios (footprint, faldones, cumbreras, labels)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    const srcFill = map.getSource('edificios-source');
    const srcFaldones = map.getSource('edificios-techos-source');
    const srcCumbreras = map.getSource('edificios-cumbreras-source');
    const srcLabels = map.getSource('edificios-labels-source');

    if (srcFill && srcFaldones && srcCumbreras && srcLabels) {
      srcFill.setData(buildEdificiosFeatureCollection(edificios));
      srcFaldones.setData(construirFaldonesFeatureCollection(edificios));
      srcCumbreras.setData(construirCumbrerasFeatureCollection(edificios));
      srcLabels.setData(buildEdificiosLabelsFeatureCollection(edificios));
    } else {
      // Si aun no existen las capas (p.ej. llegaron tarde), crearlas.
      setupEdificioLayers(map, edificios, baseMapType, salonColor, showEdificios, edificios3D);
    }
  }, [edificios]);

  // 8. Color de los salones (recolorea sin recrear capas)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    aplicarColorSalon(map, salonColor);
  }, [salonColor]);

  // 9. Visibilidad de los salones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    const vis = showEdificios ? 'visible' : 'none';
    EDIFICIO_LAYER_IDS.forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    });
    // La capa 3D depende tambien del toggle edificios3D
    if (map.getLayer('edificios-3d')) {
      map.setLayoutProperty('edificios-3d', 'visibility', showEdificios && edificios3D ? 'visible' : 'none');
    }
  }, [showEdificios]);

  // 10. Relieve 3D de los salones (fill-extrusion opcional)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    if (map.getLayer('edificios-3d')) {
      map.setLayoutProperty('edificios-3d', 'visibility', showEdificios && edificios3D ? 'visible' : 'none');
    }
  }, [edificios3D]);

  return (
    <div className="maplibre-wrapper">
      <div ref={mapContainerRef} className="maplibre-container" />
    </div>
  );
}

// Configura las capas GeoJSON de territorios y etiquetas con estilo tipo Editor
function setupTerritoryLayers(map, territories, selectedIds, baseMapType) {
  const geoJSON = buildGeoJSONFeatureCollection(territories);
  const labelsGeoJSON = buildLabelsFeatureCollection(geoJSON);
  const idList = Array.from(selectedIds);
  const filter = ['in', ['get', 'id'], ['literal', idList]];

  if (!map.getSource('territorios-source')) {
    map.addSource('territorios-source', {
      type: 'geojson',
      data: geoJSON
    });
  } else {
    map.getSource('territorios-source').setData(geoJSON);
  }

  if (!map.getSource('territorios-labels-source')) {
    map.addSource('territorios-labels-source', {
      type: 'geojson',
      data: labelsGeoJSON
    });
  } else {
    map.getSource('territorios-labels-source').setData(labelsGeoJSON);
  }

  const style = map.getStyle();
  const fonts = pickFonts(style);
  const firstSym = (style.layers?.find(l => l.type === 'symbol') || {}).id;

  // 1. Capa Relleno (Fill) debajo de las etiquetas del mapa base
  if (!map.getLayer('territorios-fill')) {
    map.addLayer({
      id: 'territorios-fill',
      type: 'fill',
      source: 'territorios-source',
      filter: filter,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 0.22,
          17, 0.08
        ]
      }
    }, firstSym);
  }

  // 2. Capa Borde (Line) debajo de las etiquetas del mapa base
  if (!map.getLayer('territorios-line')) {
    map.addLayer({
      id: 'territorios-line',
      type: 'line',
      source: 'territorios-source',
      filter: filter,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 2.2,
          20, 3.5
        ],
        'line-opacity': 0.95
      }
    }, firstSym);
  }

  // 3. Capa Nombres Centrados (Symbol) - Estilo idéntico al Editor con escalado dinámico
  const isSat = baseMapType === 'sat';
  if (!map.getLayer('territorios-labels')) {
    map.addLayer({
      id: 'territorios-labels',
      type: 'symbol',
      source: 'territorios-labels-source',
      filter: filter,
      layout: {
        'text-field': ['get', 'nombre'],
        'text-font': fonts.bold,
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 13,
          15, 20,
          18, 28,
          21, 34
        ],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-max-width': 8
      },
      paint: {
        'text-color': isSat ? '#ffffff' : '#251f2e',
        'text-halo-color': isSat ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
        'text-halo-width': 2.2,
        'text-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          16, 1.0,
          18, 0.4
        ]
      }
    });
  }
}

// =====================================================================
// Salones del Reino (edificios) — capas MapLibre
// =====================================================================

// IDs de las capas de edificios (para visibilidad y limpieza).
const EDIFICIO_LAYER_IDS = [
  'edificios-fill',
  'edificios-techo-faldones',
  'edificios-techo-lineas',
  'edificios-line',
  'edificios-punto',
  'edificios-symbol'
];

// Aclara u oscurece un color hex (#rrggbb) en un factor [-1..1].
// factor>0 aclara hacia blanco, factor<0 oscurece hacia negro.
function ajustarTono(hex, factor) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mezcla = (c) => {
    const objetivo = factor >= 0 ? 255 : 0;
    const f = Math.abs(factor);
    return Math.round(c + (objetivo - c) * f);
  };
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return `#${toHex(mezcla(r))}${toHex(mezcla(g))}${toHex(mezcla(b))}`;
}

// Aplica el color del salon a todas las capas de edificios (sin recrearlas).
function aplicarColorSalon(map, salonColor) {
  const claro = ajustarTono(salonColor, 0.25); // agua iluminada
  const oscuro = ajustarTono(salonColor, -0.25); // agua en sombra
  const borde = ajustarTono(salonColor, -0.4);

  // Si un edificio trae color propio se respeta; si no, usa el global.
  const colorFill = ['case', ['!=', ['get', 'colorPropio'], null], ['get', 'colorPropio'], salonColor];

  if (map.getLayer('edificios-fill')) {
    map.setPaintProperty('edificios-fill', 'fill-color', colorFill);
  }
  if (map.getLayer('edificios-line')) {
    map.setPaintProperty('edificios-line', 'line-color', borde);
  }
  if (map.getLayer('edificios-techo-faldones')) {
    // lado 0 => tono claro, lado 1 => tono oscuro
    map.setPaintProperty('edificios-techo-faldones', 'fill-color', [
      'match',
      ['get', 'lado'],
      0, claro,
      1, oscuro,
      salonColor
    ]);
  }
  if (map.getLayer('edificios-techo-lineas')) {
    map.setPaintProperty('edificios-techo-lineas', 'line-color', ajustarTono(salonColor, 0.55));
  }
  if (map.getLayer('edificios-punto')) {
    map.setPaintProperty('edificios-punto', 'circle-color', salonColor);
  }
  if (map.getLayer('edificios-3d')) {
    map.setPaintProperty('edificios-3d', 'fill-extrusion-color', colorFill);
  }
}

// Crea (o recrea) las fuentes y capas de los Salones del Reino.
// Las capas se insertan por encima de las de territorios para que
// los salones siempre destaquen en calles y en satelite.
function setupEdificioLayers(map, edificios, baseMapType, salonColor, showEdificios, edificios3D) {
  if (!edificios || edificios.length === 0) return;

  const fillData = buildEdificiosFeatureCollection(edificios);
  const faldonesData = construirFaldonesFeatureCollection(edificios);
  const cumbrerasData = construirCumbrerasFeatureCollection(edificios);
  const labelsData = buildEdificiosLabelsFeatureCollection(edificios);

  // Fuentes (crear o actualizar)
  const upsertSource = (id, data) => {
    if (!map.getSource(id)) {
      map.addSource(id, { type: 'geojson', data });
    } else {
      map.getSource(id).setData(data);
    }
  };
  upsertSource('edificios-source', fillData);
  upsertSource('edificios-techos-source', faldonesData);
  upsertSource('edificios-cumbreras-source', cumbrerasData);
  upsertSource('edificios-labels-source', labelsData);

  const isSat = baseMapType === 'sat';
  const style = map.getStyle();
  const fonts = pickFonts(style);

  const claro = ajustarTono(salonColor, 0.25);
  const oscuro = ajustarTono(salonColor, -0.25);
  const borde = ajustarTono(salonColor, -0.4);
  const colorFill = ['case', ['!=', ['get', 'colorPropio'], null], ['get', 'colorPropio'], salonColor];
  const vis = showEdificios ? 'visible' : 'none';

  // 1. Relleno del footprint (planta del edificio)
  if (!map.getLayer('edificios-fill')) {
    map.addLayer({
      id: 'edificios-fill',
      type: 'fill',
      source: 'edificios-source',
      layout: { visibility: vis },
      paint: {
        'fill-color': colorFill,
        // Mas opaco sobre satelite para resaltar; algo translucido en calles
        'fill-opacity': isSat ? 0.55 : 0.45
      }
    });
  }

  // 2. Faldones del techo (aguas con dos tonos) — efecto pictorico
  if (!map.getLayer('edificios-techo-faldones')) {
    map.addLayer({
      id: 'edificios-techo-faldones',
      type: 'fill',
      source: 'edificios-techos-source',
      layout: { visibility: vis },
      paint: {
        'fill-color': ['match', ['get', 'lado'], 0, claro, 1, oscuro, salonColor],
        'fill-opacity': 0.75
      }
    });
  }

  // 3. Cumbreras y valles (lineas del caballete) — perfil a dos aguas / M
  if (!map.getLayer('edificios-techo-lineas')) {
    map.addLayer({
      id: 'edificios-techo-lineas',
      type: 'line',
      source: 'edificios-cumbreras-source',
      layout: { visibility: vis, 'line-cap': 'round' },
      paint: {
        'line-color': ajustarTono(salonColor, 0.55),
        'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1.5, 19, 3.5],
        'line-opacity': 0.95
      }
    });
  }

  // 4. Contorno exterior grueso del edificio (visible en ambos estilos)
  if (!map.getLayer('edificios-line')) {
    map.addLayer({
      id: 'edificios-line',
      type: 'line',
      source: 'edificios-source',
      layout: { visibility: vis, 'line-join': 'round' },
      paint: {
        'line-color': borde,
        'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1.8, 19, 4],
        'line-opacity': 1
      }
    });
  }

  // 5a. Marcador circular del salon — visible de lejos (identifica la ubicacion
  //     sin ocupar espacio). Se DESVANECE al llegar al zoom del texto (16),
  //     para que el punto y la etiqueta no se encimen.
  if (!map.getLayer('edificios-punto')) {
    map.addLayer({
      id: 'edificios-punto',
      type: 'circle',
      source: 'edificios-labels-source',
      layout: { visibility: vis },
      paint: {
        'circle-color': salonColor,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 15.5, 6],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        // Opaco hasta z15.5; se desvanece a 0 en z16 (cuando entra el texto).
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 15.5, 1, 16, 0],
        'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 15.5, 1, 16, 0]
      }
    });
  }

  // 5b. Etiqueta de texto — "Salón del Reino" + nombre del barrio, SOLO desde
  //     zoom 16 (de lejos basta el marcador; de cerca ya hay espacio).
  if (!map.getLayer('edificios-symbol')) {
    map.addLayer({
      id: 'edificios-symbol',
      type: 'symbol',
      source: 'edificios-labels-source',
      minzoom: 16,
      layout: {
        visibility: vis,
        // Texto fijo "Salón del Reino" (los 6 salones muestran lo mismo).
        'text-field': 'Salón del Reino',
        'text-font': fonts.bold,
        'text-size': ['interpolate', ['linear'], ['zoom'], 16, 12, 20, 16],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-max-width': 8
      },
      paint: {
        'text-color': isSat ? '#ffffff' : ajustarTono(salonColor, -0.5),
        'text-halo-color': isSat ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
        'text-halo-width': 2.2
      }
    });
  }

  // 6. (Opcional) Relieve 3D — fill-extrusion con la altura del edificio.
  //    Se crea siempre pero su visibilidad depende del toggle edificios3D.
  if (!map.getLayer('edificios-3d')) {
    map.addLayer({
      id: 'edificios-3d',
      type: 'fill-extrusion',
      source: 'edificios-source',
      layout: { visibility: showEdificios && edificios3D ? 'visible' : 'none' },
      paint: {
        'fill-extrusion-color': colorFill,
        'fill-extrusion-height': ['get', 'altura_m'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.6
      }
    });
  }
}
