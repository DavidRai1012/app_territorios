import React from 'react';
import { calculateAreaKm2 } from '../utils/geoUtils';

export default function TerritoryDetailSheet({
  territory,
  onClose,
  onFitBounds,
  isSingleSelected,
  onToggleSolo,
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

  return (
    <div className="detail-sheet-backdrop" onClick={onClose}>
      <div className="sheet-modal detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="detail-title-group">
            <span
              className="detail-color-pill"
              style={{ backgroundColor: territory.color || '#7c3aed' }}
            />
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
