import React, { useState } from 'react';
import SimpleMapViewer from './SimpleMapViewer';
import MapComponent from './MapComponent';
import './SimpleMapViewer.css';

function App() {
  // 'viewer': Modo Mapa Sencillo (Morado, sin marcas, con filtro y alto zoom)
  // 'management': Modo Gestión Completo (Sincronización en tiempo real, marcar caras, reportes)
  const [viewMode, setViewMode] = useState('viewer');

  if (viewMode === 'management') {
    return (
      <div className="app-container">
        <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Control y Sincronización de Territorios</h1>
            <div className="status-indicator">
              <span className="dot live"></span> Sincronizado en tiempo real
            </div>
          </div>
          <button 
            onClick={() => setViewMode('viewer')}
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
          >
            🗺️ Volver al Modo Mapa
          </button>
        </header>
        <main className="map-wrapper">
          <MapComponent />
        </main>
      </div>
    );
  }

  return (
    <SimpleMapViewer onSwitchToAdmin={() => setViewMode('management')} />
  );
}

export default App;
