import React, { useState, memo } from 'react';

// Chip memoizado para evitar re-renders cuando el mapa se mueve
const TerritoryChip = memo(function TerritoryChip({
  id,
  nombre,
  numero,
  color,
  isSelected,
  onToggle
}) {
  return (
    <button
      className={`territory-chip ${isSelected ? 'active' : ''}`}
      onClick={() => onToggle(id)}
      style={{
        '--chip-color': color || '#7c3aed'
      }}
    >
      <span className="chip-dot" style={{ backgroundColor: color || '#7c3aed' }} />
      <div className="chip-text">
        <span className="chip-name">{nombre}</span>
        {numero && <span className="chip-number">#{numero}</span>}
      </div>
    </button>
  );
});

export default function FilterDrawer({
  isOpen,
  onClose,
  territories,
  selectedIds,
  onToggleTerritory,
  onSelectAll,
  onClearAll,
  onInvertSelection,
  groups,
  onSaveGroup,
  onApplyGroup,
  onDeleteGroup
}) {
  const [search, setSearch] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [showGroupInput, setShowGroupInput] = useState(false);

  if (!isOpen) return null;

  const filtered = territories.filter(t => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (t.nombre || '').toLowerCase().includes(q);
    const numMatch = t.numero != null && String(t.numero).includes(q);
    return nameMatch || numMatch;
  });

  const handleCreateGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    onSaveGroup(name);
    setNewGroupName('');
    setShowGroupInput(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sheet-modal filter-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div>
            <h2>🗺️ Territorios</h2>
            <span className="sheet-header-badge">
              {selectedIds.size} de {territories.length} activos
            </span>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Buscador */}
        <div className="filter-search-row">
          <input
            type="text"
            placeholder="Buscar por nombre o número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-search-input"
          />
        </div>

        {/* Acciones fijas */}
        <div className="filter-actions-row">
          <button className="btn btn-sm btn-outline" onClick={onSelectAll}>
            Todos
          </button>
          <button className="btn btn-sm btn-outline" onClick={onClearAll}>
            Ninguno
          </button>
          <button className="btn btn-sm btn-outline" onClick={onInvertSelection}>
            Invertir
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setShowGroupInput(!showGroupInput)}
          >
            💾 Guardar grupo
          </button>
        </div>

        {/* Creador de grupos */}
        {showGroupInput && (
          <div className="group-input-bar">
            <input
              type="text"
              placeholder="Nombre del grupo (ej: Campaña)..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <button className="btn btn-sm btn-primary" onClick={handleCreateGroup}>
              Guardar
            </button>
          </div>
        )}

        {/* Chips de Grupos Guardados */}
        {groups && groups.length > 0 && (
          <div className="groups-pills-row">
            <span className="groups-title">Grupos:</span>
            {groups.map((g) => (
              <span key={g.id} className="group-pill">
                <span onClick={() => onApplyGroup(g)} style={{ cursor: 'pointer' }}>
                  👥 {g.nombre} ({g.territorios ? g.territorios.length : 0})
                </span>
                <button
                  className="group-delete-btn"
                  onClick={() => onDeleteGroup(g.id)}
                  title="Eliminar grupo"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Cuadrícula de 2 columnas con chips táctiles */}
        <div className="filter-chips-grid">
          {filtered.map((t) => (
            <TerritoryChip
              key={t.id}
              id={t.id}
              nombre={t.nombre || `Territorio ${t.numero || ''}`}
              numero={t.numero}
              color={t.color}
              isSelected={selectedIds.has(t.id)}
              onToggle={onToggleTerritory}
            />
          ))}
          {filtered.length === 0 && (
            <p className="no-results-msg">No se encontraron territorios.</p>
          )}
        </div>

        <div className="sheet-footer">
          <button className="btn btn-primary btn-block" onClick={onClose}>
            Listo ({selectedIds.size} seleccionados)
          </button>
        </div>
      </div>
    </div>
  );
}
