import React from 'react';
import { calculateAreaKm2 } from '../utils/geoUtils';

export default function TerritoryDetailSheet({
  territory,
  onClose,
  onFitBounds,
  isSingleSelected,
  onToggleSolo,
  onChangeColor,
  onPrev,
  onNext,
  hasPrev,
  hasNext
}) {
  if (!territory) return null;

  const area = calculateAreaKm2(territory.poligonos);
  const limites = territory.limites_texto || {};
  const hasLimites = limites.norte || limites.sur || limites.oriente || limites.occidente;
  const calles = territory.calles || [];

  // Paleta de colores rápidos para elegir
  const QUICK_COLORS = [
    '#8b5cf6', // Violeta
    '#f97316', // Naranja
    '#10b981', // Verde
    '#06b6d4', // Cyan
    '#ec4899', // Rosa
    '#eab308', // Amarillo
    '#ef4444', // Rojo
    '#3b82f6', // Azul
    '#14b8a6', // Turquesa
    '#6366f1'  // Índigo
  ];

  return (
    <div className="detail-sheet-backdrop" onClick={onClose}>
      <div className="sheet-modal detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="detail-title-group">
            <label
              className="detail-color-pill"
              style={{
                backgroundColor: territory.color || '#7c3aed',
                cursor: 'pointer',
                position: 'relative'
              }}
              title="Haz clic para cambiar el color"
            >
              <input
                type="color"
                value={territory.color || '#7c3aed'}
                onChange={(e) => onChangeColor && onChangeColor(territory.id, e.target.value)}
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
            <div>
              <h2 className="detail-title">
                {territory.nombre || `Territorio ${territory.numero || ''}`}
              </h2>
              {territory.localidad && (
                <span className="detail-subtitle">{territory.localidad}</span>
              )}
            </div>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="sheet-body">
          {/* Selector interactivo de color */}
          <div className="detail-card" style={{ padding: '8px 12px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text, #333)' }}>
                🎨 Color en el mapa:
              </span>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                cursor: 'pointer',
                color: 'var(--primary, #7c3aed)',
                fontWeight: 600
              }}>
                Personalizado
                <input
                  type="color"
                  value={territory.color || '#7c3aed'}
                  onChange={(e) => onChangeColor && onChangeColor(territory.id, e.target.value)}
                  style={{ width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer', verticalAlign: 'middle' }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUICK_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChangeColor && onChangeColor(territory.id, c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: (territory.color || '').toLowerCase() === c.toLowerCase() ? '3px solid #000' : '2px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transform: (territory.color || '').toLowerCase() === c.toLowerCase() ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div className="detail-actions-row">
            <button className="btn btn-primary" onClick={onFitBounds}>
              🎯 Encuadrar
            </button>
            <button
              className={`btn ${isSingleSelected ? 'btn-danger' : 'btn-outline'}`}
              onClick={onToggleSolo}
            >
              {isSingleSelected ? '🌐 Ver todos' : '⭐ Solo este'}
            </button>
          </div>

          {/* Área y métricas */}
          <div className="detail-metrics-badge">
            <span>Área aproximada: <strong>{area} km²</strong></span>
            {territory.numero && <span>Número: <strong>{territory.numero}</strong></span>}
          </div>

          {/* Descripción */}
          {territory.descripcion && (
            <div className="detail-card">
              <h3>Descripción</h3>
              <p>{territory.descripcion}</p>
            </div>
          )}

          {/* Límites geográficos Norte / Sur / Oriente / Occidente */}
          {hasLimites ? (
            <div className="detail-card">
              <h3>Límites</h3>
              <div className="limits-grid">
                <div className="limit-box">
                  <span className="limit-dir">⬆️ Norte</span>
                  <span className="limit-val">{limites.norte || '—'}</span>
                </div>
                <div className="limit-box">
                  <span className="limit-dir">⬇️ Sur</span>
                  <span className="limit-val">{limites.sur || '—'}</span>
                </div>
                <div className="limit-box">
                  <span className="limit-dir">➡️ Oriente</span>
                  <span className="limit-val">{limites.oriente || '—'}</span>
                </div>
                <div className="limit-box">
                  <span className="limit-dir">⬅️ Occidente</span>
                  <span className="limit-val">{limites.occidente || '—'}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted" style={{ fontSize: '0.82rem', fontStyle: 'italic', margin: '8px 0' }}>
              Sin descripción de límites registrada todavía.
            </p>
          )}

          {/* Calles principales */}
          {calles.length > 0 && (
            <div className="detail-card">
              <h3>Calles principales ({calles.length})</h3>
              <div className="streets-list">
                {calles.map((c, i) => (
                  <div key={i} className="street-row">
                    <span className="street-name">{c.nombre}</span>
                    {(c.desde || c.hasta) && (
                      <span className="street-range">
                        {c.desde ? `de ${c.desde}` : ''} {c.hasta ? `a ${c.hasta}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navegación Anterior / Siguiente en pie de página */}
        <div className="detail-footer-nav">
          <button
            className="btn btn-secondary nav-btn"
            disabled={!hasPrev}
            onClick={onPrev}
          >
            ‹ Anterior
          </button>
          <button
            className="btn btn-secondary nav-btn"
            disabled={!hasNext}
            onClick={onNext}
          >
            Siguiente ›
          </button>
        </div>
      </div>
    </div>
  );
}
