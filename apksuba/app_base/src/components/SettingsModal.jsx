import React, { useState } from 'react';
import { APP_THEMES, SALON_COLORES } from '../config/mapa';

export default function SettingsModal({
  isOpen,
  onClose,
  themeId,
  onSelectTheme,
  darkMode,
  onSelectDarkMode,
  defaultBaseMap,
  onSelectDefaultBaseMap,
  tiltEnabled,
  onToggleTilt,
  autoFitEnabled,
  onToggleAutoFit,
  onImportFile,
  onExportJSON,
  onRestoreFactory,
  onToggleDemoData,
  hasDemoData,
  dataVersionDate,
  territoriesCount,
  // Salones del Reino
  salonColor,
  onSelectSalonColor,
  salonesVisible,
  onToggleSalonesVisible,
  salones3D,
  onToggleSalones3D,
  salonesCount,
  // Mapa base online/offline
  mapSourceMode,
  onSelectMapSourceMode,
  online,
  fuenteMapa
}) {
  const [importSummary, setImportSummary] = useState(null);
  const [pendingImportData, setPendingImportData] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const { summary, processed } = parseUploadedFile(parsed);
        setPendingImportData(processed);
        setImportSummary(summary);
      } catch (err) {
        alert('Archivo JSON inválido: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = (mode) => {
    if (!pendingImportData) return;
    onImportFile(pendingImportData, mode);
    setImportSummary(null);
    setPendingImportData(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sheet-modal settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>⚙️ Ajustes</h2>
          <button className="sheet-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="sheet-body">
          {/* 1. Color del Tema */}
          <section className="setting-section">
            <label className="setting-label">Color del Tema</label>
            <div className="theme-circles-row">
              {APP_THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-circle ${themeId === t.id ? 'active' : ''}`}
                  style={{ backgroundColor: t.color }}
                  onClick={() => onSelectTheme(t.id)}
                  title={t.nombre}
                >
                  {themeId === t.id && '✓'}
                </button>
              ))}
            </div>
          </section>

          {/* 2. Modo Oscuro */}
          <section className="setting-section">
            <label className="setting-label">Apariencia</label>
            <div className="segmented-control">
              <button
                className={darkMode === 'light' ? 'active' : ''}
                onClick={() => onSelectDarkMode('light')}
              >
                ☀️ Claro
              </button>
              <button
                className={darkMode === 'dark' ? 'active' : ''}
                onClick={() => onSelectDarkMode('dark')}
              >
                🌙 Oscuro
              </button>
              <button
                className={darkMode === 'auto' ? 'active' : ''}
                onClick={() => onSelectDarkMode('auto')}
              >
                ⚙️ Sistema
              </button>
            </div>
          </section>

          {/* 3. Mapa y Visualización */}
          <section className="setting-section">
            <label className="setting-label">Mapa Base por Defecto</label>
            <div className="segmented-control">
              <button
                className={defaultBaseMap === 'calles' ? 'active' : ''}
                onClick={() => onSelectDefaultBaseMap('calles')}
              >
                🗺️ Calles (OpenFreeMap)
              </button>
              <button
                className={defaultBaseMap === 'sat' ? 'active' : ''}
                onClick={() => onSelectDefaultBaseMap('sat')}
              >
                🛰️ Satélite Híbrido
              </button>
            </div>

            <div className="toggle-row" style={{ marginTop: 12 }}>
              <span>Inclinación 3D del mapa (gesto con 2 dedos)</span>
              <input
                type="checkbox"
                checked={tiltEnabled}
                onChange={(e) => onToggleTilt(e.target.checked)}
                className="ios-switch"
              />
            </div>

            <div className="toggle-row" style={{ marginTop: 10 }}>
              <span>Encuadrar automáticamente al cambiar filtros</span>
              <input
                type="checkbox"
                checked={autoFitEnabled}
                onChange={(e) => onToggleAutoFit(e.target.checked)}
                className="ios-switch"
              />
            </div>

            <label className="setting-label" style={{ marginTop: 14 }}>
              Datos del mapa de calles
            </label>
            <div className="segmented-control">
              <button
                className={mapSourceMode === 'auto' ? 'active' : ''}
                onClick={() => onSelectMapSourceMode && onSelectMapSourceMode('auto')}
                title="Usa internet si hay conexión; si no, el mapa sin conexión"
              >
                ⚙️ Automático
              </button>
              <button
                className={mapSourceMode === 'online' ? 'active' : ''}
                onClick={() => onSelectMapSourceMode && onSelectMapSourceMode('online')}
                title="Siempre por internet (mejor detalle)"
              >
                🌐 Internet
              </button>
              <button
                className={mapSourceMode === 'offline' ? 'active' : ''}
                onClick={() => onSelectMapSourceMode && onSelectMapSourceMode('offline')}
                title="Siempre sin conexión (ahorra datos)"
              >
                📴 Sin conexión
              </button>
            </div>
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 6 }}>
              {fuenteMapa && fuenteMapa.tipo === 'calles' && fuenteMapa.esLocal
                ? 'Ahora mismo el mapa de calles funciona sin conexión.'
                : 'Ahora mismo el mapa de calles usa internet.'}
              {' '}
              El mapa satélite siempre necesita internet.
            </p>
          </section>

          {/* 4. Salones del Reino */}
          <section className="setting-section">
            <label className="setting-label">
              Salones del Reino ({salonesCount || 0})
            </label>

            <div className="toggle-row">
              <span>Mostrar salones en el mapa</span>
              <input
                type="checkbox"
                checked={salonesVisible}
                onChange={(e) => onToggleSalonesVisible(e.target.checked)}
                className="ios-switch"
              />
            </div>

            <div className="toggle-row" style={{ marginTop: 10 }}>
              <span>Relieve 3D de los salones</span>
              <input
                type="checkbox"
                checked={salones3D}
                onChange={(e) => onToggleSalones3D(e.target.checked)}
                className="ios-switch"
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Color de los salones</span>
              <div className="theme-circles-row" style={{ marginTop: 8 }}>
                {SALON_COLORES.map((c) => (
                  <button
                    key={c.id}
                    className={`theme-circle ${(salonColor || '').toLowerCase() === c.color.toLowerCase() ? 'active' : ''}`}
                    style={{ backgroundColor: c.color }}
                    onClick={() => onSelectSalonColor(c.color)}
                    title={c.nombre}
                  >
                    {(salonColor || '').toLowerCase() === c.color.toLowerCase() && '✓'}
                  </button>
                ))}
                <label
                  className="theme-circle"
                  style={{
                    background: 'conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  title="Color personalizado"
                >
                  <input
                    type="color"
                    value={salonColor || '#4a6da7'}
                    onChange={(e) => onSelectSalonColor(e.target.value)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* 5. Gestión de Territorios */}
          <section className="setting-section">
            <label className="setting-label">
              Datos de Territorios ({territoriesCount} cargados)
            </label>

            <div className="settings-btn-grid">
              <label className="btn btn-outline" style={{ cursor: 'pointer', textAlign: 'center' }}>
                📁 Actualizar territorios (JSON)
                <input
                  type="file"
                  accept=".json,.geojson"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </label>

              <button className="btn btn-outline" onClick={onExportJSON}>
                📥 Exportar JSON (v3)
              </button>

              <button className="btn btn-outline" onClick={onToggleDemoData}>
                {hasDemoData ? '🗑️ Quitar 18 zonas demo' : '✨ Cargar 18 zonas demo'}
              </button>

              <button className="btn btn-danger" onClick={onRestoreFactory}>
                🔄 Restaurar datos de fábrica
              </button>
            </div>
          </section>

          {/* 6. Acerca de */}
          <section className="setting-section about-section">
            <p><strong>Visor de Territorios Suba</strong></p>
            <p className="text-muted">Versión 1.4.1 • Motor MapLibre GL 3D</p>
            <p className="text-muted">Actualizado: {dataVersionDate || 'Octubre 2026'}</p>
          </section>
        </div>

        {/* Diálogo emergente para confirmar importación */}
        {importSummary && (
          <div className="import-confirm-overlay">
            <div className="import-confirm-card">
              <h3>Importar Archivo</h3>
              <p>{importSummary.message}</p>
              <div className="import-confirm-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => confirmImport('merge')}
                >
                  Combinar (agregar y actualizar)
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => confirmImport('replace')}
                >
                  Reemplazar todo
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setImportSummary(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Analizador tolerante de archivos JSON / GeoJSON
function parseUploadedFile(raw) {
  let list = [];

  if (raw && Array.isArray(raw.territorios)) {
    // Bundle v3
    list = raw.territorios;
  } else if (raw && raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
    // GeoJSON FeatureCollection
    list = raw.features.map((f, i) => {
      const p = f.properties || {};
      const geom = f.geometry || {};
      let rings = [];

      if (geom.type === 'Polygon') {
        rings = geom.coordinates.map(ring => ring.map(pt => [pt[1], pt[0]])); // a [lat, lng]
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach(poly => {
          poly.forEach(ring => {
            rings.push(ring.map(pt => [pt[1], pt[0]]));
          });
        });
      }

      return {
        id: f.id || p.id || `t-${i + 1}`,
        nombre: p.nombre || p.name || `Territorio ${i + 1}`,
        numero: p.numero || null,
        localidad: p.localidad || '',
        descripcion: p.descripcion || '',
        limites_texto: p.limites_texto || { norte: '', sur: '', oriente: '', occidente: '' },
        calles: p.calles || [],
        color: p.color || null,
        poligonos: rings,
        puntos_interes: []
      };
    });
  } else if (Array.isArray(raw)) {
    list = raw;
  } else {
    throw new Error('Formato no reconocido. Debe ser un bundle v3 o FeatureCollection GeoJSON.');
  }

  const valid = list.filter(t => t && t.poligonos && t.poligonos.length > 0);
  if (valid.length === 0) {
    throw new Error('No se encontraron polígonos válidos en el archivo.');
  }

  return {
    summary: {
      message: `Se detectaron ${valid.length} territorios válidos en el archivo.`
    },
    processed: valid
  };
}
