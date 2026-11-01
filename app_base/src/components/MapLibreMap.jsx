import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getLibertyStyle, getSatelliteHybridStyle, pickFonts } from '../utils/mapStyleHelper';
import { buildGeoJSONFeatureCollection, buildLabelsFeatureCollection, getBoundsFromGeoJSON } from '../utils/geoUtils';

export default function MapLibreMap({
  territories,
  selectedIds,
  onSelectTerritory,
  baseMapType,
  tiltEnabled,
  autoFitTrigger,
  themeColor
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const isLoadedRef = useRef(false);

  // 1. Inicializar Mapa MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isCancelled = false;

    async function initMap() {
      const initialStyle = baseMapType === 'sat'
        ? await getSatelliteHybridStyle()
        : await getLibertyStyle();

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
        setupTerritoryLayers(map, territories, selectedIds, baseMapType);

        // Encuadre inicial si hay territorios
        const geoJSON = buildGeoJSONFeatureCollection(territories);
        const bounds = getBoundsFromGeoJSON(geoJSON, selectedIds);
        if (bounds) {
          map.fitBounds(bounds, { padding: 40, maxZoom: 17, duration: 1000 });
        }
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
      const newStyle = baseMapType === 'sat'
        ? await getSatelliteHybridStyle()
        : await getLibertyStyle();

      map.setStyle(newStyle, { diff: false });
      map.once('style.load', () => {
        setupTerritoryLayers(map, territories, selectedIds, baseMapType);
      });
    }

    switchStyle();
  }, [baseMapType]);

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
