import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getLibertyStyle, getSatelliteHybridStyle } from '../utils/mapStyleHelper';
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

  // GPS y Orientación
  const [gpsMode, setGpsMode] = useState(0); // 0: apagado, 1: siguiendo, 2: siguiendo + rotando
  const gpsWatchIdRef = useRef(null);
  const userCoordsRef = useRef(null);
  const headingRef = useRef(0);
  const smoothHeadingRef = useRef(0);
  const animFrameRef = useRef(null);

  // Estado de rotación actual para la brújula
  const [compassBearing, setCompassBearing] = useState(0);

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

      // Atribución compacta
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        isLoadedRef.current = true;
        mapRef.current = map;

        // Configurar capas de territorios
        setupTerritoryLayers(map, territories, selectedIds, baseMapType);

        // Configurar capa de GPS del usuario
        setupUserLocationLayers(map);

        // Encuadre inicial si hay territorios
        const geoJSON = buildGeoJSONFeatureCollection(territories);
        const bounds = getBoundsFromGeoJSON(geoJSON, selectedIds);
        if (bounds) {
          map.fitBounds(bounds, { padding: 40, maxZoom: 17, duration: 1000 });
        }
      });

      map.on('rotate', () => {
        setCompassBearing(Math.round(map.getBearing()));
      });

      // Click en territorio para abrir ficha
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
        setupUserLocationLayers(map);
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

  // 4. Filtrado instantáneo (sin recrear capas ni nodos DOM)
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

  // 7. Lógica del Sensor GPS y Brújula de orientación
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (gpsMode === 0) {
      // Apagado
      if (gpsWatchIdRef.current) navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
      userCoordsRef.current = null;
      clearUserLocationData(map);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    // Modo 1 o 2: Activar GPS
    if (navigator.geolocation) {
      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;
          const accuracy = pos.coords.accuracy || 15;
          userCoordsRef.current = [lng, lat];

          updateUserLocationData(map, [lng, lat], accuracy);

          // Centrar en usuario
          if (gpsMode >= 1) {
            map.easeTo({ center: [lng, lat], duration: 400 });
          }

          // Si el GPS reporta rumbo fiable con movimiento
          if (pos.coords.heading !== null && !isNaN(pos.coords.heading) && pos.coords.speed > 0.5) {
            headingRef.current = pos.coords.heading;
          }
        },
        (err) => console.warn('Error GPS:', err),
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }

    // Si modo es 2 (Rotando con rumbo): escuchar orientación del dispositivo
    if (gpsMode === 2) {
      const handleOrientation = (e) => {
        let heading = null;

        if (e.webkitCompassHeading != null) {
          // iOS
          heading = e.webkitCompassHeading;
        } else if (e.alpha != null && e.beta != null && e.gamma != null) {
          // Android compensado por inclinación W3C
          const rad = Math.PI / 180;
          const x = e.beta * rad;
          const y = e.gamma * rad;
          const z = e.alpha * rad;

          const cy = Math.cos(y);
          const sy = Math.sin(y);
          const cx = Math.cos(x);
          const sx = Math.sin(x);
          const cz = Math.cos(z);
          const sz = Math.sin(z);

          const Vx = -cz * sy - sz * sx * cy;
          const Vy = -sz * sy + cz * sx * cy;

          let compass = Math.atan2(Vx, Vy) * (180 / Math.PI);
          if (compass < 0) compass += 360;

          // Corrección con orientación de pantalla
          const screenAngle = (window.screen.orientation && window.screen.orientation.angle) || 0;
          heading = (compass + screenAngle) % 360;
        }

        if (heading !== null) {
          headingRef.current = heading;
        }
      };

      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);

      // Bucle de animación suave (filtro pasa-bajos)
      const updateHeadingLoop = () => {
        const target = headingRef.current;
        let current = smoothHeadingRef.current;

        // Manejo del salto de 0 a 360
        let diff = (target - current + 180) % 360 - 180;
        smoothHeadingRef.current = (current + diff * 0.15 + 360) % 360;

        if (mapRef.current && isLoadedRef.current) {
          mapRef.current.setBearing(smoothHeadingRef.current);
        }

        animFrameRef.current = requestAnimationFrame(updateHeadingLoop);
      };

      animFrameRef.current = requestAnimationFrame(updateHeadingLoop);

      return () => {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }
  }, [gpsMode]);

  const toggleGpsMode = () => {
    setGpsMode((prev) => (prev + 1) % 3);
  };

  const resetNorth = () => {
    if (mapRef.current) {
      mapRef.current.easeTo({ bearing: 0, pitch: tiltEnabled ? 35 : 0, duration: 400 });
    }
  };

  return (
    <div className="maplibre-wrapper">
      <div ref={mapContainerRef} className="maplibre-container" />

      {/* Botones de Control Flotantes */}
      <div className="map-fab-column">
        {/* Botón Brújula (Restablecer Norte) */}
        {compassBearing !== 0 && (
          <button
            className="fab-btn"
            onClick={resetNorth}
            title="Restablecer Norte"
          >
            <span style={{ display: 'inline-block', transform: `rotate(${-compassBearing}deg)` }}>
              ⬆️
            </span>
          </button>
        )}

        {/* Botón GPS (3 estados: Apagado / Centrado / Rotando) */}
        <button
          className={`fab-btn ${gpsMode > 0 ? 'active' : ''}`}
          onClick={toggleGpsMode}
          title={
            gpsMode === 0
              ? 'Activar GPS'
              : gpsMode === 1
              ? 'GPS activo (centrado)'
              : 'GPS activo (centrado + rotando)'
          }
        >
          {gpsMode === 0 && '🎯'}
          {gpsMode === 1 && '📍'}
          {gpsMode === 2 && '🧭'}
        </button>
      </div>
    </div>
  );
}

// Configura las 3 capas GeoJSON de territorios en MapLibre
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
  }

  if (!map.getSource('territorios-labels-source')) {
    map.addSource('territorios-labels-source', {
      type: 'geojson',
      data: labelsGeoJSON
    });
  }

  // 1. Capa Relleno (Fill)
  if (!map.getLayer('territorios-fill')) {
    map.addLayer({
      id: 'territorios-fill',
      type: 'fill',
      source: 'territorios-source',
      filter: filter,
      paint: {
        'fill-color': ['get', 'color'],
        // El relleno se aclara al acercarse (22% lejos, 8% cerca)
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 0.22,
          17, 0.08
        ]
      }
    });
  }

  // 2. Capa Borde (Line)
  if (!map.getLayer('territorios-line')) {
    map.addLayer({
      id: 'territorios-line',
      type: 'line',
      source: 'territorios-source',
      filter: filter,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2.5,
        'line-opacity': 0.95
      }
    });
  }

  // 3. Capa Nombres Centrados (Symbol)
  const isSat = baseMapType === 'sat';
  if (!map.getLayer('territorios-labels')) {
    map.addLayer({
      id: 'territorios-labels',
      type: 'symbol',
      source: 'territorios-labels-source',
      filter: filter,
      layout: {
        'text-field': ['get', 'nombre'],
        'text-font': ['Noto Sans Bold', 'Open Sans Bold'],
        'text-size': 13,
        'text-anchor': 'center',
        'text-allow-overlap': true
      },
      paint: {
        'text-color': isSat ? '#ffffff' : '#1e293b',
        'text-halo-color': isSat ? '#000000' : '#ffffff',
        'text-halo-width': 2,
        // La opacidad baja en zoom >= 17 para no tapar nombres de calles
        'text-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13, 0.95,
          16.5, 0.85,
          17.5, 0.2,
          18, 0.0
        ]
      }
    });
  }
}

// Configura la fuente GeoJSON para la posición GPS
function setupUserLocationLayers(map) {
  if (!map.getSource('user-location-source')) {
    map.addSource('user-location-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
  }

  if (!map.getLayer('user-location-point')) {
    map.addLayer({
      id: 'user-location-point',
      type: 'circle',
      source: 'user-location-source',
      paint: {
        'circle-radius': 7,
        'circle-color': '#7c3aed',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff'
      }
    });
  }
}

function updateUserLocationData(map, lngLat, accuracy) {
  const source = map.getSource('user-location-source');
  if (!source) return;

  source.setData({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: lngLat
        }
      }
    ]
  });
}

function clearUserLocationData(map) {
  const source = map.getSource('user-location-source');
  if (!source) return;
  source.setData({
    type: 'FeatureCollection',
    features: []
  });
}
