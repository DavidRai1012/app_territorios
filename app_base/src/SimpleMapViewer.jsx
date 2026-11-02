import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MapLibreMap from './components/MapLibreMap';
import FilterDrawer from './components/FilterDrawer';
import TerritoryDetailSheet from './components/TerritoryDetailSheet';
import SettingsModal from './components/SettingsModal';
import { STORAGE_KEYS, APP_THEMES } from './config/mapa';
import defaultBundle from './data/territorios.json';
import { generateDemoTerritories } from './utils/geoUtils';

export default function SimpleMapViewer() {
  // 1. Cargar territorios (localStorage o fábrica)
  const [territories, setTerritories] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TERRITORIOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error leyendo territorios de storage:', e);
    }
    return defaultBundle.territorios || [];
  });

  // 2. Selección de territorios activos
  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_IDS);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch (e) {}
    return new Set((defaultBundle.territorios || []).map(t => t.id));
  });

  // 3. Tema de color (por defecto 'morado')
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'morado';
  });

  // 4. Modo oscuro ('light' | 'dark' | 'auto')
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.DARK_MODE) || 'auto';
  });

  // 5. Capa base ('calles' | 'sat')
  const [baseMapType, setBaseMapType] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.MAP_STYLE) || 'calles';
  });

  // 6. Inclinación 3D habilitada
  const [tiltEnabled, setTiltEnabled] = useState(() => {
    const val = localStorage.getItem(STORAGE_KEYS.MAP_TILT);
    return val !== null ? val === 'true' : true;
  });

  // 7. Auto-encuadrar al cambiar filtros
  const [autoFitEnabled, setAutoFitEnabled] = useState(() => {
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_FIT);
    return val !== null ? val === 'true' : true;
  });

  // 8. Grupos de territorios
  const [groups, setGroups] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GROUPS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultBundle.grupos || [];
  });

  // Estados de modales y hojas
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTerritoryDetail, setSelectedTerritoryDetail] = useState(null);
  const [autoFitTrigger, setAutoFitTrigger] = useState(1);
  const [hasDemoData, setHasDemoData] = useState(() => {
    return territories.some(t => t.id && t.id.startsWith('demo-'));
  });

  // Aplicar tema de color en <html> y barra de estado
  useEffect(() => {
    const theme = APP_THEMES.find(t => t.id === themeId) || APP_THEMES[0];
    document.documentElement.setAttribute('data-color', theme.id);
    document.documentElement.style.setProperty('--primary', theme.color);
    document.documentElement.style.setProperty('--primary-hover', theme.hover);
    document.documentElement.style.setProperty('--primary-light', theme.light);
    document.documentElement.style.setProperty('--primary-border', theme.border);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', theme.color);

    localStorage.setItem(STORAGE_KEYS.THEME, themeId);
  }, [themeId]);

  // Aplicar modo oscuro
  useEffect(() => {
    document.documentElement.setAttribute('data-dark-mode', darkMode);
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, darkMode);
  }, [darkMode]);

  // Persistir selección
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_IDS, JSON.stringify(Array.from(selectedIds)));
    } catch (e) {}
  }, [selectedIds]);

  // Manejadores de selección
  const toggleTerritory = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (autoFitEnabled) setAutoFitTrigger(c => c + 1);
  }, [autoFitEnabled]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(territories.map(t => t.id)));
    if (autoFitEnabled) setAutoFitTrigger(c => c + 1);
  }, [territories, autoFitEnabled]);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const invertSelection = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set();
      territories.forEach(t => {
        if (!prev.has(t.id)) next.add(t.id);
      });
      return next;
    });
    if (autoFitEnabled) setAutoFitTrigger(c => c + 1);
  }, [territories, autoFitEnabled]);

  // Ver sólo un territorio (para días especiales)
  const handleToggleSolo = useCallback((t) => {
    if (!t) return;
    const isSingle = selectedIds.size === 1 && selectedIds.has(t.id);
    if (isSingle) {
      // Restaurar todos
      selectAll();
    } else {
      // Dejar sólo este
      setSelectedIds(new Set([t.id]));
      setAutoFitTrigger(c => c + 1);
    }
  }, [selectedIds, selectAll]);

  // Navegación Anterior / Siguiente en la Ficha
  const currentDetailIndex = useMemo(() => {
    if (!selectedTerritoryDetail) return -1;
    return territories.findIndex(t => t.id === selectedTerritoryDetail.id);
  }, [selectedTerritoryDetail, territories]);

  const handlePrevTerritory = () => {
    if (currentDetailIndex > 0) {
      const prev = territories[currentDetailIndex - 1];
      setSelectedTerritoryDetail(prev);
      if (selectedIds.size === 1) {
        setSelectedIds(new Set([prev.id]));
        setAutoFitTrigger(c => c + 1);
      }
    }
  };

  const handleNextTerritory = () => {
    if (currentDetailIndex < territories.length - 1) {
      const next = territories[currentDetailIndex + 1];
      setSelectedTerritoryDetail(next);
      if (selectedIds.size === 1) {
        setSelectedIds(new Set([next.id]));
        setAutoFitTrigger(c => c + 1);
      }
    }
  };

  // Guardar y Aplicar Grupos
  const handleSaveGroup = (name) => {
    const newGroup = {
      id: 'grp-' + Date.now(),
      nombre: name,
      territorios: Array.from(selectedIds)
    };
    const updated = [...groups, newGroup];
    setGroups(updated);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(updated));
  };

  const handleApplyGroup = (grp) => {
    if (grp && Array.isArray(grp.territorios)) {
      setSelectedIds(new Set(grp.territorios));
      setAutoFitTrigger(c => c + 1);
      setIsFilterOpen(false);
    }
  };

  const handleDeleteGroup = (id) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(updated));
  };

  // Importar / Exportar / Restaurar datos
  const handleImportFile = (newList, mode) => {
    let finalTerritories = [];
    if (mode === 'replace') {
      finalTerritories = newList;
    } else {
      // merge por id
      const map = new Map();
      territories.forEach(t => map.set(t.id, t));
      newList.forEach(t => map.set(t.id, t));
      finalTerritories = Array.from(map.values());
    }

    setTerritories(finalTerritories);
    setSelectedIds(new Set(finalTerritories.map(t => t.id)));
    localStorage.setItem(STORAGE_KEYS.TERRITORIOS, JSON.stringify(finalTerritories));
    setAutoFitTrigger(c => c + 1);
    setIsSettingsOpen(false);
    alert(`✅ Importación completada. Total de territorios: ${finalTerritories.length}`);
  };

  const handleExportJSON = () => {
    const bundle = {
      version: 3,
      actualizado: new Date().toISOString().split('T')[0],
      grupos: groups,
      territorios: territories
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `territorios_v3_${bundle.actualizado}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleRestoreFactory = () => {
    if (!confirm('¿Restaurar los 13 territorios de fábrica originales?')) return;
    localStorage.removeItem(STORAGE_KEYS.TERRITORIOS);
    const factory = defaultBundle.territorios || [];
    setTerritories(factory);
    setSelectedIds(new Set(factory.map(t => t.id)));
    setHasDemoData(false);
    setAutoFitTrigger(c => c + 1);
    setIsSettingsOpen(false);
  };

  const handleToggleDemoData = () => {
    if (hasDemoData) {
      // Quitar demos
      const withoutDemo = territories.filter(t => !t.id.startsWith('demo-'));
      setTerritories(withoutDemo);
      setSelectedIds(new Set(withoutDemo.map(t => t.id)));
      localStorage.setItem(STORAGE_KEYS.TERRITORIOS, JSON.stringify(withoutDemo));
      setHasDemoData(false);
    } else {
      // Cargar 18 demos
      const demos = generateDemoTerritories();
      const combined = [...territories.filter(t => !t.id.startsWith('demo-')), ...demos];
      setTerritories(combined);
      setSelectedIds(new Set(combined.map(t => t.id)));
      localStorage.setItem(STORAGE_KEYS.TERRITORIOS, JSON.stringify(combined));
      setHasDemoData(true);
    }
    setAutoFitTrigger(c => c + 1);
    setIsSettingsOpen(false);
  };

  // Subtítulo de cabecera
  const subtitle = useMemo(() => {
    if (selectedIds.size === territories.length) {
      return `Mostrando todos (${territories.length})`;
    }
    if (selectedIds.size === 1) {
      const singleId = Array.from(selectedIds)[0];
      const single = territories.find(t => t.id === singleId);
      return single ? single.nombre : '1 seleccionado';
    }
    return `${selectedIds.size} de ${territories.length} seleccionados`;
  }, [selectedIds, territories]);

  const activeTheme = APP_THEMES.find(t => t.id === themeId) || APP_THEMES[0];

  return (
    <div className="app-viewport-root">
      {/* 1. Cabecera Principal */}
      <header className="app-topbar">
        <div className="topbar-brand">
          <img src="/icon.png" alt="Icono" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
          <div className="brand-texts">
            <h1 className="brand-heading">territorios suba</h1>
            <span className="brand-subtext">{subtitle}</span>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Conmutador Calles / Satélite */}
          <button
            className="topbar-pill-btn"
            onClick={() => {
              const next = baseMapType === 'calles' ? 'sat' : 'calles';
              setBaseMapType(next);
              localStorage.setItem(STORAGE_KEYS.MAP_STYLE, next);
            }}
            title="Cambiar mapa base"
          >
            {baseMapType === 'calles' ? '🗺️ Calles' : '🛰️ Satélite'}
          </button>

          {/* Botón Filtro */}
          <button
            className="topbar-pill-btn"
            onClick={() => setIsFilterOpen(true)}
            title="Filtrar territorios"
          >
            🔍 ({selectedIds.size})
          </button>

          {/* Botón ⚙️ Ajustes */}
          <button
            className="topbar-icon-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Ajustes de la app"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* 2. Mapa Principal con MapLibre GL */}
      <main className="app-map-area">
        <MapLibreMap
          territories={territories}
          selectedIds={selectedIds}
          onSelectTerritory={(t) => setSelectedTerritoryDetail(t)}
          baseMapType={baseMapType}
          tiltEnabled={tiltEnabled}
          autoFitTrigger={autoFitTrigger}
          themeColor={activeTheme.color}
        />
      </main>

      {/* 3. Panel de Filtros */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        territories={territories}
        selectedIds={selectedIds}
        onToggleTerritory={toggleTerritory}
        onSelectAll={selectAll}
        onClearAll={clearAll}
        onInvertSelection={invertSelection}
        groups={groups}
        onSaveGroup={handleSaveGroup}
        onApplyGroup={handleApplyGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      {/* 4. Ficha de Territorio */}
      <TerritoryDetailSheet
        territory={selectedTerritoryDetail}
        onClose={() => setSelectedTerritoryDetail(null)}
        onFitBounds={() => {
          if (selectedTerritoryDetail) {
            setSelectedIds(new Set([selectedTerritoryDetail.id]));
            setAutoFitTrigger(c => c + 1);
          }
        }}
        isSingleSelected={
          selectedTerritoryDetail
            ? selectedIds.size === 1 && selectedIds.has(selectedTerritoryDetail.id)
            : false
        }
        onToggleSolo={() => handleToggleSolo(selectedTerritoryDetail)}
        onPrev={handlePrevTerritory}
        onNext={handleNextTerritory}
        hasPrev={currentDetailIndex > 0}
        hasNext={currentDetailIndex < territories.length - 1}
      />

      {/* 5. Modal de Ajustes */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        themeId={themeId}
        onSelectTheme={setThemeId}
        darkMode={darkMode}
        onSelectDarkMode={setDarkMode}
        defaultBaseMap={baseMapType}
        onSelectDefaultBaseMap={(st) => {
          setBaseMapType(st);
          localStorage.setItem(STORAGE_KEYS.MAP_STYLE, st);
        }}
        tiltEnabled={tiltEnabled}
        onToggleTilt={(val) => {
          setTiltEnabled(val);
          localStorage.setItem(STORAGE_KEYS.MAP_TILT, String(val));
        }}
        autoFitEnabled={autoFitEnabled}
        onToggleAutoFit={(val) => {
          setAutoFitEnabled(val);
          localStorage.setItem(STORAGE_KEYS.AUTO_FIT, String(val));
        }}
        onImportFile={handleImportFile}
        onExportJSON={handleExportJSON}
        onRestoreFactory={handleRestoreFactory}
        onToggleDemoData={handleToggleDemoData}
        hasDemoData={hasDemoData}
        dataVersionDate={defaultBundle.actualizado}
        territoriesCount={territories.length}
      />
    </div>
  );
}
