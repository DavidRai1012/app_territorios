import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Popup, Marker, useMap, SVGOverlay, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';

const socket = io(import.meta.env.DEV ? 'http://localhost:3000' : '/');

// Componente para ajustar la vista del mapa cuando llegan los datos
function MapBoundsFitter({ territories }) {
  const map = useMap();
  useEffect(() => {
    if (territories && territories.length > 0 && territories[0].limites) {
      const bounds = L.latLngBounds(territories[0].limites);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [territories, map]);
  return null;
}

// Componente para rastrear el zoom globalmente
function ZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom())
  });
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  return null;
}

// Componente para la marca de agua dinámica
function TerritoryWatermark({ territory, currentZoom }) {
  if (!territory || !territory.limites || territory.limites.length === 0) return null;

  // Calculamos el centro aproximado del territorio
  let latSum = 0, lngSum = 0;
  territory.limites.forEach(p => { latSum += p[0]; lngSum += p[1]; });
  const centerLat = latSum / territory.limites.length;
  const centerLng = lngSum / territory.limites.length;
  const center = [centerLat, centerLng];

  const opacity = currentZoom <= 16 ? 1 : 0.15;
  const fontSize = currentZoom <= 16 ? '5rem' : '3rem';

  const icon = L.divIcon({
    className: 'territory-watermark-icon',
    html: `<div style="font-size: ${fontSize}; font-weight: 900; color: rgba(0,0,0,${opacity}); text-shadow: 2px 2px 4px rgba(255,255,255,0.8); user-select: none; transition: all 0.3s; text-align: center; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;">${territory.numero_territorio}</div>`,
    iconSize: [200, 200],
    iconAnchor: [100, 100]
  });

  return (
    <Marker position={center} icon={icon} interactive={false} zIndexOffset={currentZoom <= 16 ? 100 : -100} />
  );
}

function UserLocation() {
  const [position, setPosition] = useState(null);
  
  const map = useMapEvents({
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 18);
    },
    locationerror(e) {
      alert("No se pudo obtener la ubicación. Verifica los permisos de tu navegador o GPS.");
    }
  });

  return (
    <>
      <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000 }}>
        <button 
          onClick={() => map.locate()}
          style={{ 
            padding: '10px 15px', 
            background: 'white', 
            border: '2px solid rgba(0,0,0,0.2)', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontSize: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
          title="Mi ubicación"
        >
          📍
        </button>
      </div>
      {position && (
        <Marker position={position}>
          <Popup>Estás aquí</Popup>
        </Marker>
      )}
    </>
  );
}

function ClearAllButton({ onConfirm }) {
  const [step, setStep] = useState(0);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    let timer;
    if (step === 1 && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleStart = () => {
    setStep(1);
    setCountdown(15);
  };

  return (
    <>
      <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 1000 }}>
        <button 
          onClick={handleStart} 
          style={{ 
            padding: '10px 15px', 
            background: 'white', 
            border: '2px solid red', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            color: 'red', 
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          Limpiar
        </button>
      </div>

      {step === 1 && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>¿Seguro que quiere limpiar todas las manzanas?</h2>
            <p>Esta acción borrará el progreso de todos los territorios. Por favor espere {countdown} segundos para confirmar.</p>
            <button 
              disabled={countdown > 0} 
              onClick={() => setStep(2)}
              style={countdown === 0 ? { background: '#ef4444', color: 'white' } : {}}
            >
              {countdown > 0 ? `Esperar ${countdown}s` : 'Continuar'}
            </button>
            <button onClick={() => setStep(0)}>Cancelar</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>ÚLTIMA ADVERTENCIA</h2>
            <p>Oprima el botón rojo para limpiar TODAS las manzanas.</p>
            <button 
              style={{ background: 'red', color: 'white', fontWeight: 'bold' }}
              onClick={() => {
                onConfirm();
                setStep(0);
              }}
            >
              Borrar Todo Definitivamente
            </button>
            <button onClick={() => setStep(0)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}

// Modal para pedir la contraseña
function PasswordModal({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (password === 'Sal8318') {
      onSuccess();
    } else {
      setError('Contraseña incorrecta');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content name-modal">
        <h2 style={{ color: '#2563eb' }}>Acceso Restringido</h2>
        <p>Ingrese la contraseña para acceder:</p>
        <div className="password-wrapper">
          <input 
            type={showPwd ? 'text' : 'password'}
            value={password} 
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Contraseña"
            className="name-modal-input"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button 
            type="button" 
            className="toggle-pwd-btn"
            onClick={() => setShowPwd(!showPwd)}
          >
            {showPwd ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '5px 0' }}>{error}</p>}
        <button 
          onClick={handleSubmit}
          style={{ background: '#2563eb', color: 'white' }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

// Modal para pedir el nombre al entrar
function NameModal({ onSubmit }) {
  const [name, setName] = useState(localStorage.getItem('userName') || '');
  
  return (
    <div className="modal-overlay">
      <div className="modal-content name-modal">
        <h2 style={{ color: '#2563eb' }}>Bienvenido</h2>
        <p>Ingrese su nombre para registrar los cambios que realice:</p>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          placeholder="Su nombre"
          className="name-modal-input"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && (() => { localStorage.setItem('userName', name.trim()); onSubmit(name.trim()); })()}
        />
        <button 
          onClick={() => {
            if (name.trim()) {
              localStorage.setItem('userName', name.trim());
              onSubmit(name.trim());
            }
          }}
          disabled={!name.trim()}
          style={name.trim() ? { background: '#2563eb', color: 'white' } : {}}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

// Formatea fecha ISO a formato legible
function formatDate(isoDate) {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

// Devuelve emoji y texto según el tipo de evento
function getLogLabel(entry) {
  switch (entry.type) {
    case 'completar_manzana':
      return { emoji: '🟢', text: `Completar manzana ${entry.blockNum}` };
    case 'parcial_manzana':
      return { emoji: '🟡', text: `Realizar parcial manzana ${entry.blockNum}` };
    case 'terminar_parcial':
      return { emoji: '✅', text: `Terminar parcial manzana ${entry.blockNum}` };
    case 'territorio_completo':
      return { emoji: '🏆', text: `¡Territorio ${entry.territoryNum} COMPLETADO!` };
    case 'limpiar_todo':
      return { emoji: '🗑️', text: 'Limpiar todo' };
    default:
      return { emoji: '📝', text: 'Cambio' };
  }
}

// Panel del registro de actividad
function LogPanel({ log, onClose }) {
  const reversed = [...log].reverse();

  return (
    <div className="log-panel-overlay" onClick={onClose}>
      <div className="log-panel" onClick={(e) => e.stopPropagation()}>
        <div className="log-panel-header">
          <h3>📋 Registro de Actividad</h3>
          <button className="log-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="log-panel-body">
          {reversed.length === 0 && <p className="log-empty">No hay actividad registrada aún.</p>}
          {reversed.map((entry, i) => {
            const { emoji, text } = getLogLabel(entry);
            return (
              <div key={i} className={`log-entry log-type-${entry.type}`}>
                <span className="log-emoji">{emoji}</span>
                <div className="log-info">
                  <strong>{text}</strong>
                  {entry.territoryNum && entry.type !== 'territorio_completo' && (
                    <span className="log-territory"> (Territorio {entry.territoryNum})</span>
                  )}
                  <div className="log-meta">
                    {entry.userName} — {formatDate(entry.date)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MapComponent() {
  const [partStates, setPartStates] = useState({});
  const [territories, setTerritories] = useState([]);
  const [currentZoom, setCurrentZoom] = useState(16);
  const [userName, setUserName] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [nameEdit, setNameEdit] = useState('');
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    socket.on('initial_state', (data) => {
      setPartStates(data.states || {});
      setTerritories(data.territories || []);
      if (data.activityLog) setActivityLog(data.activityLog);
    });

    socket.on('part_updated', ({ id, status }) => {
      setPartStates(prev => ({ ...prev, [id]: status }));
    });

    socket.on('activity_log', (log) => {
      setActivityLog(log);
    });

    return () => {
      socket.off('initial_state');
      socket.off('part_updated');
      socket.off('activity_log');
    };
  }, []);

  const togglePart = (territoryId, blockId, partIndex, currentStatus) => {
    const id = `${territoryId}_${blockId}_p${partIndex}`;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setPartStates(prev => ({ ...prev, [id]: newStatus }));
    socket.emit('update_part', { id, territory_id: territoryId, block_id: blockId, part_index: partIndex, status: newStatus, userName });
  };

  const getBlockStatus = (territoryId, blockId, numSides) => {
    let completedCount = 0;
    for (let i = 0; i < numSides; i++) {
      if (partStates[`${territoryId}_${blockId}_p${i}`] === 'completed') completedCount++;
    }
    return completedCount;
  };

  // Pantalla de contraseña
  if (showPassword) {
    return (
      <PasswordModal onSuccess={() => {
        setShowPassword(false);
        setShowNameModal(true);
      }} />
    );
  }

  // Modal de nombre
  if (showNameModal) {
    return (
      <NameModal onSubmit={(name) => {
        setUserName(name);
        setNameEdit(name);
        setShowNameModal(false);
      }} />
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer 
        center={[4.7425, -74.090]}
        zoom={16} 
        minZoom={14}
        maxZoom={22}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19}
        />
        
        <ZoomTracker onZoomChange={setCurrentZoom} />
        <MapBoundsFitter territories={territories} />
        <UserLocation />

        {territories.map(territory => {
          // Calculamos el estado general del territorio
          let totalParts = 0;
          let completedParts = 0;
          
          if (territory.manzanas) {
            territory.manzanas.forEach(block => {
              const numSides = block.puntos.length;
              totalParts += numSides;
              for (let i = 0; i < numSides; i++) {
                if (partStates[`${territory.territorio_id}_${block.id}_p${i}`] === 'completed') {
                  completedParts++;
                }
              }
            });
          }

          // Determinamos el color del contorno del territorio
          let territoryColor = 'rgba(0,0,0,0.4)';
          if (completedParts > 0 && completedParts < totalParts) {
            territoryColor = '#eab308';
          } else if (completedParts === totalParts && totalParts > 0) {
            territoryColor = '#22c55e';
          }

          return (
          <React.Fragment key={territory.territorio_id}>
            
            <TerritoryWatermark territory={territory} currentZoom={currentZoom} />

            {/* Borde del territorio */}
            {territory.limites && territory.limites.length >= 3 && (
               <Polygon 
                 positions={territory.limites}
                 pathOptions={{ 
                   color: territoryColor, 
                   weight: currentZoom <= 16 ? 5 : 3, 
                   fill: currentZoom <= 16,
                   fillColor: territoryColor,
                   fillOpacity: 0.2,
                   dashArray: '5, 5',
                   opacity: 0.9
                 }}
                 interactive={false}
               />
            )}

            {/* Solo renderizamos las manzanas si el zoom es lo suficientemente cerca (> 16) */}
            {currentZoom > 16 && territory.manzanas.map(block => {
              const numSides = block.puntos.length;
              const completedCount = getBlockStatus(territory.territorio_id, block.id, numSides);
              const isFullyCompleted = completedCount === numSides;
              const isPartiallyCompleted = completedCount > 0 && completedCount < numSides;

              const fillColor = isFullyCompleted ? '#22c55e' : isPartiallyCompleted ? '#fbbf24' : '#3b82f6';
              const fillOpacity = isFullyCompleted ? 0.6 : isPartiallyCompleted ? 0.4 : 0.0;

              // Para el número en el centro de la manzana
              const blockCenter = L.latLngBounds(block.puntos).getCenter();
              const blockIcon = L.divIcon({
                className: 'block-number-label',
                html: `<span>${block.numero}</span>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });

              return (
                <React.Fragment key={block.id}>
                  {/* Número en el centro (siempre visible) */}
                  <Marker position={blockCenter} icon={blockIcon} interactive={false} />

                  {/* Polígono de relleno */}
                  <Polygon 
                    positions={block.puntos}
                    pathOptions={{ stroke: false, fillColor, fillOpacity }}
                  >
                    <Popup>
                      <div className="popup-content">
                        <h3>Manzana {block.numero}</h3>
                        <p>Progreso: {completedCount}/{numSides} lados</p>
                        <div className="sides-grid">
                          {block.puntos.map((_, i) => {
                            const id = `${territory.territorio_id}_${block.id}_p${i}`;
                            const isDone = partStates[id] === 'completed';
                            return (
                              <button 
                                key={i} 
                                className={`side-btn ${isDone ? 'done' : ''}`}
                                onClick={() => togglePart(territory.territorio_id, block.id, i, partStates[id])}
                              >
                                Cara {i + 1} {isDone ? '✓' : ''}
                              </button>
                            );
                          })}
                        </div>
                        <button 
                          className="complete-all-btn"
                          onClick={() => {
                            const targetState = completedCount === numSides ? 'pending' : 'completed';
                            block.puntos.forEach((_, i) => {
                              const id = `${territory.territorio_id}_${block.id}_p${i}`;
                              setPartStates(prev => ({ ...prev, [id]: targetState }));
                              socket.emit('update_part', { 
                                id, 
                                territory_id: territory.territorio_id, 
                                block_id: block.id, 
                                part_index: i, 
                                status: targetState,
                                userName
                              });
                            });
                          }}
                        >
                          {completedCount === numSides ? 'Desmarcar Todo' : 'Marcar Todo'}
                        </button>
                      </div>
                    </Popup>
                  </Polygon>

                  {/* Líneas de borde individuales */}
                  {block.puntos.map((point, i) => {
                    const nextI = (i + 1) % numSides;
                    const linePositions = [point, block.puntos[nextI]];
                    const isLineDone = partStates[`${territory.territorio_id}_${block.id}_p${i}`] === 'completed';
                    
                    return (
                      <Polyline
                        key={`line_${i}`}
                        positions={linePositions}
                        pathOptions={{
                          color: isLineDone ? '#16a34a' : '#ef4444',
                          weight: isLineDone ? 6 : 3,
                          opacity: 0.9
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}

          </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Botón menú hamburguesa (debajo de ubicación) */}
      <div style={{ position: 'absolute', top: 70, right: 15, zIndex: 10000 }}>
        <button 
          className="hamburger-btn"
          onClick={() => setShowLogPanel(true)}
          title="Registro de actividad"
        >
          ☰
        </button>
      </div>

      {/* Nombre del usuario actual + edición */}
      <div className="user-name-bar">
        {!editingName ? (
          <>
            <span>Usuario: {userName}</span>
            <button className="name-edit-btn" onClick={() => { setEditingName(true); setNameEdit(userName); }}>Editar</button>
          </>
        ) : (
          <>
            <input 
              type="text"
              className="name-edit-input"
              value={nameEdit}
              onChange={(e) => setNameEdit(e.target.value)}
              autoFocus
            />
            <button className="name-save-btn" onClick={() => {
              if (nameEdit.trim()) {
                setUserName(nameEdit.trim());
                localStorage.setItem('userName', nameEdit.trim());
              }
              setEditingName(false);
            }}>✓</button>
            <button className="name-cancel-btn" onClick={() => setEditingName(false)}>✕</button>
          </>
        )}
      </div>

      {/* Botón de limpiar todo */}
      <ClearAllButton onConfirm={() => socket.emit('clear_all', { userName })} />

      {/* Panel de registro de actividad */}
      {showLogPanel && <LogPanel log={activityLog} onClose={() => setShowLogPanel(false)} />}
    </div>
  );
}

export default MapComponent;
