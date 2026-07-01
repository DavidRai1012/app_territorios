import React from 'react';
import MapComponent from './MapComponent';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Bienvenido a su app de territorios</h1>
        <div className="status-indicator">
          <span className="dot live"></span> Sincronizado en tiempo real
        </div>
      </header>
      <main className="map-wrapper">
        <MapComponent />
      </main>
    </div>
  );
}

export default App;
