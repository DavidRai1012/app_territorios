import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, Marker, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
import { getAllLocalTerritories } from './utils/territoriesLoader';

// Estilos de Mosaicos (Map Tiles)
const TILE_LAYERS = {
  rappi: {
    name: 'Estilo Rappi (Limpio)',
    icon: '🛵',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxNativeZoom: 20,
    maxZoom: 22
  },
  satellite: {
    name: 'Satélite Alta Resolución',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 19,
    maxZoom: 22
  },
  streets: {
    name: 'Calles Estándar',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    maxNativeZoom: 19,
    maxZoom: 22
  }
};

// Componente para ajustar la cámara del mapa
function MapCameraHandler({ targetBounds }) {
  const map = useMap();
  useEffect(() => {
    if (targetBounds && targetBounds.isValid && targetBounds.isValid()) {
      map.fitBounds(targetBounds, { padding: [40, 40], maxZoom: 19, animate: true, duration: 0.8 });
    }
  }, [targetBounds, map]);
  return null;
}

// Icono personalizado para ubicación del usuario (Punto morado pulsante)
const userLocationIcon = L.divIcon({
  className: 'user-gps-pulse-marker',
  html: `<div class="gps-pulse-ring"></div><div class="gps-pulse-dot"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export default function SimpleMapViewer({ onSwitchToAdmin }) {
  // 1. Cargar todos los territorios locales empaquetados
  const allTerritories = useMemo(() => getAllLocalTerritories(), []);

  // 2. Estado de selección de territorios (por defecto todos seleccionados)
  const [selectedIds, setSelectedIds] = useState(() => {
    return new Set(allTerritories.map(t => t.numero_territorio));
  });

  // 3. Capa de mapa activa (Rappi por defecto)
  const [activeLayerKey, setActiveLayerKey] = useState('rappi');

  // 4. Estados de interfaz
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetBounds, setTargetBounds] = useState(null);

  // 5. GPS / Ubicación opcional
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const watchIdRef = useRef(null);

  // 6. Brújula / Giroscopio opcional
  const [isCompassActive, setIsCompassActive] = useState(false);
  const [compassHeading, setCompassHeading] = useState(0);

  // Calcular límites de todos los territorios seleccionados para centrar al inicio
  useEffect(() => {
    if (allTerritories.length > 0) {
      const allCoords = [];
      allTerritories.forEach(t => {
        if (t.limites) t.limites.forEach(pt => allCoords.push(pt));
      });
      if (allCoords.length > 0) {
        setTargetBounds(L.latLngBounds(allCoords));
      }
    }
  }, [allTerritories]);

  // Manejar activación / desactivación de GPS
  const toggleGps = () => {
    if (isGpsActive) {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsGpsActive(false);
      setUserLocation(null);
    } else {
      if (!navigator.geolocation) {
        alert("La geolocalización no es compatible con este dispositivo.");
        return;
      }
      setIsGpsActive(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);
          setUserAccuracy(pos.coords.accuracy);
          setTargetBounds(L.latLngBounds([[lat - 0.002, lng - 0.002], [lat + 0.002, lng + 0.002]]));
        },
        (err) => {
          console.warn("Error GPS:", err);
          alert("No se pudo obtener la ubicación. Verifica los permisos de GPS.");
          setIsGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setUserAccuracy(pos.coords.accuracy);
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  };

  // Manejar activación / desactivación de Brújula / Giroscopio
  const toggleCompass = () => {
    if (isCompassActive) {
      setIsCompassActive(false);
      setCompassHeading(0);
    } else {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              setIsCompassActive(true);
            } else {
              alert("Permiso de orientación denegado.");
            }
          })
          .catch(console.error);
      } else {
        setIsCompassActive(true);
      }
    }
  };

  useEffect(() => {
    if (!isCompassActive) return;

    const handleOrientation = (e) => {
      let heading = e.webkitCompassHeading || e.alpha;
      if (heading !== undefined && heading !== null) {
        setCompassHeading(Math.round(heading));
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isCompassActive]);

  // Acciones de Selección de Territorios
  const selectAll = () => {
    setSelectedIds(new Set(allTerritories.map(t => t.numero_territorio)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleTerritory = (num) => {
    const next = new Set(selectedIds);
    if (next.has(num)) {
      next.delete(num);
    } else {
      next.add(num);
    }
    setSelectedIds(next);
  };

  // "Día especial": Ver únicamente este territorio y hacer zoom a él
  const focusSingleTerritory = (t) => {
    setSelectedIds(new Set([t.numero_territorio]));
    setIsDrawerOpen(false);
    if (t.limites && t.limites.length > 0) {
      setTargetBounds(L.latLngBounds(t.limites));
    }
  };

  // Filtrado de territorios para el panel
  const filteredTerritories = allTerritories.filter(t => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return `territorio ${t.numero_territorio}`.toLowerCase().includes(q) || t.numero_territorio.includes(q);
  });

  const activeLayer = TILE_LAYERS[activeLayerKey] || TILE_LAYERS.rappi;

  return (
    <div className="simple-viewer-root">
      {/* Barra Superior Morada */}
      <header className="viewer-header">
        <div className="viewer-brand">
          <span className="brand-logo">📍</span>
          <div>
            <h1 className="brand-title">Territorios</h1>
            <span className="brand-subtitle">
              {selectedIds.size === allTerritories.length
                ? `Mostrando todos (${allTerritories.length})`
                : selectedIds.size === 1
                ? `Territorio ${Array.from(selectedIds)[0]}`
                : `${selectedIds.size} de ${allTerritories.length} seleccionados`}
            </span>
          </div>
        </div>

        <div className="header-actions">
          {/* Botón Filtro de Territorios */}
          <button 
            className="header-pill-btn"
            onClick={() => setIsDrawerOpen(true)}
            title="Seleccionar territorios"
          >
            🗺️ Filtrar ({selectedIds.size})
          </button>

          {/* Botón de acceso al editor o administración */}
          {onSwitchToAdmin && (
            <button 
              className="header-pill-btn btn-subtle"
              onClick={onSwitchToAdmin}
              title="Modo Gestión y Sincronización"
            >
              ⚙️
            </button>
          )}
        </div>
      </header>

      {/* Contenedor del Mapa con Zoom Profundo (maxZoom 22) */}
      <div className="map-viewport">
        <MapContainer
          center={[4.745, -74.095]}
          zoom={15}
          minZoom={12}
          maxZoom={22}
          zoomControl={false}
          preferCanvas={true}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Mosaico de Mapa seleccionado (Rappi / Satélite / Calles) */}
          <TileLayer
            key={activeLayerKey}
            url={activeLayer.url}
            attribution={activeLayer.attribution}
            subdomains={activeLayer.subdomains || 'abc'}
            maxNativeZoom={activeLayer.maxNativeZoom}
            maxZoom={activeLayer.maxZoom}
          />

          <MapCameraHandler targetBounds={targetBounds} />

          {/* Renderizado de Territorios y Manzanas seleccionadas */}
          {allTerritories.map(territory => {
            const isVisible = selectedIds.has(territory.numero_territorio);
            if (!isVisible) return null;

            return (
              <React.Fragment key={territory.territorio_id || territory.numero_territorio}>
                {/* Límite exterior del Territorio en Morado */}
                {territory.limites && territory.limites.length > 0 && (
                  <Polygon
                    positions={territory.limites}
                    pathOptions={{
                      color: '#7c3aed',
                      weight: 3,
                      fillColor: '#7c3aed',
                      fillOpacity: 0.03,
                      dashArray: selectedIds.size === 1 ? null : '4, 4'
                    }}
                  >
                    <Tooltip permanent direction="top" className="territory-badge-label">
                      T{territory.numero_territorio}
                    </Tooltip>
                  </Polygon>
                )}

                {/* Manzanas interiores */}
                {territory.manzanas && territory.manzanas.map(m => {
                  if (!m.puntos || m.puntos.length === 0) return null;
                  return (
                    <Polygon
                      key={m.id || m.numero}
                      positions={m.puntos}
                      pathOptions={{
                        color: '#6d28d9',
                        weight: 2,
                        fillColor: '#8b5cf6',
                        fillOpacity: 0.15
                      }}
                    >
                      <Tooltip permanent direction="center" className="manzana-num-badge">
                        {m.numero}
                      </Tooltip>
                    </Polygon>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Marcador GPS de Ubicación del Usuario */}
          {userLocation && (
            <>
              <Marker position={userLocation} icon={userLocationIcon} />
              {userAccuracy && (
                <Circle
                  center={userLocation}
                  radius={userAccuracy}
                  pathOptions={{ color: '#7c3aed', fillColor: '#8b5cf6', fillOpacity: 0.1, weight: 1 }}
                />
              )}
            </>
          )}
        </MapContainer>

        {/* Botones Flotantes Flotantes en el Mapa */}
        <div className="map-floating-controls">
          {/* 1. Selector de Capas (Rappi / Satélite / Calles) */}
          <div className="floating-layer-switcher">
            {Object.keys(TILE_LAYERS).map(key => (
              <button
                key={key}
                className={`layer-switch-btn ${activeLayerKey === key ? 'active' : ''}`}
                onClick={() => setActiveLayerKey(key)}
                title={TILE_LAYERS[key].name}
              >
                {TILE_LAYERS[key].icon}
              </button>
            ))}
          </div>

          {/* 2. Botón GPS Opcional */}
          <button
            className={`map-round-btn ${isGpsActive ? 'active-purple' : ''}`}
            onClick={toggleGps}
            title={isGpsActive ? "Desactivar GPS" : "Ver mi ubicación"}
          >
            🎯
          </button>

          {/* 3. Botón Brújula / Giroscopio Opcional */}
          <button
            className={`map-round-btn ${isCompassActive ? 'active-purple' : ''}`}
            onClick={toggleCompass}
            title={isCompassActive ? `Brújula activa (${compassHeading}°)` : "Activar brújula"}
          >
            🧭
          </button>
        </div>

        {/* Indicador de rumbo de Brújula si está activa */}
        {isCompassActive && (
          <div className="compass-heading-badge" style={{ transform: `rotate(${-compassHeading}deg)` }}>
            ⬆️ N ({compassHeading}°)
          </div>
        )}
      </div>

      {/* Panel / Drawer de Selección de Territorios */}
      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="territory-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>🗺️ Seleccionar Territorios</h2>
              <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>✕</button>
            </div>

            {/* Buscador */}
            <div className="drawer-search-box">
              <input
                type="text"
                placeholder="Buscar número (ej: 10)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Acciones Rápidas */}
            <div className="drawer-quick-actions">
              <button className="quick-btn" onClick={selectAll}>
                ✅ Ver Todos ({allTerritories.length})
              </button>
              <button className="quick-btn btn-outline" onClick={clearSelection}>
                ❌ Limpiar
              </button>
            </div>

            {/* Lista de Territorios con opción para 'Días especiales' */}
            <div className="territories-grid">
              {filteredTerritories.map(t => {
                const isSelected = selectedIds.has(t.numero_territorio);
                const blockCount = t.manzanas ? t.manzanas.length : 0;

                return (
                  <div
                    key={t.numero_territorio}
                    className={`territory-card-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div 
                      className="territory-card-main"
                      onClick={() => toggleTerritory(t.numero_territorio)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        aria-label={`Territorio ${t.numero_territorio}`}
                      />
                      <span className="t-card-name">Territorio {t.numero_territorio}</span>
                      <span className="t-card-blocks">{blockCount} mznas</span>
                    </div>

                    {/* Botón 'Solo este' para días especiales */}
                    <button
                      className="t-solo-btn"
                      onClick={() => focusSingleTerritory(t)}
                      title="Ver únicamente este territorio en el mapa"
                    >
                      Ver solo
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="drawer-footer">
              <button className="btn-done" onClick={() => setIsDrawerOpen(false)}>
                Listo ({selectedIds.size} seleccionados)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
