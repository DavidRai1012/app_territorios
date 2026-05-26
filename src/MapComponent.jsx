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
  // Inicializar en el montaje
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  return null;
}

// Componente para la marca de agua dinámica
function TerritoryWatermark({ territory, currentZoom }) {
  if (!territory || !territory.limites) return null;

  // Lógica: Si el zoom es <= 15, se ve nítido (opacidad 1).
  // Si el zoom es > 15 (cerca), podemos ocultarlo o hacerlo muy transparente
  // para que no estorbe con los números de las manzanas.
  const opacity = currentZoom <= 16 ? 1 : 0.15;
  // Reducimos el tamaño de fuente para que no se salga de los límites de la caja
  const fontSize = currentZoom <= 16 ? "40" : "20"; 

  const bounds = L.latLngBounds(territory.limites);

  return (
    <SVGOverlay bounds={bounds} zIndexOffset={currentZoom <= 16 ? 100 : -100}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="50%" 
          y="50%" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          fontSize={fontSize}
          fontWeight="900" 
          fill={`rgba(0,0,0,${opacity})`}
          style={{ userSelect: 'none', transition: 'all 0.3s', textShadow: '2px 2px 4px rgba(255,255,255,0.8)' }}
        >
          {territory.numero_territorio}
        </text>
      </svg>
    </SVGOverlay>
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
          🗑️ Limpiar Todo
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

function MapComponent() {
  const [partStates, setPartStates] = useState({});
  const [territories, setTerritories] = useState([]);
  const [currentZoom, setCurrentZoom] = useState(16); // Estado global del zoom
  const [captain, setCaptain] = useState("");

  useEffect(() => {
    socket.on('initial_state', (data) => {
      setPartStates(data.states || {});
      setTerritories(data.territories || []);
      if (data.captainName !== undefined) {
        setCaptain(data.captainName);
      }
    });

    socket.on('part_updated', ({ id, status }) => {
      setPartStates(prev => ({ ...prev, [id]: status }));
    });

    socket.on('captain_updated', (name) => {
      setCaptain(name);
    });

    return () => {
      socket.off('initial_state');
      socket.off('part_updated');
      socket.off('captain_updated');
    };
  }, []);

  const togglePart = (territoryId, blockId, partIndex, currentStatus) => {
    const id = `${territoryId}_${blockId}_p${partIndex}`;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setPartStates(prev => ({ ...prev, [id]: newStatus }));
    socket.emit('update_part', { id, territory_id: territoryId, block_id: blockId, part_index: partIndex, status: newStatus });
  };

  const getBlockStatus = (territoryId, blockId, numSides) => {
    let completedCount = 0;
    for (let i = 0; i < numSides; i++) {
      if (partStates[`${territoryId}_${blockId}_p${i}`] === 'completed') completedCount++;
    }
    return completedCount;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer 
        center={[4.7425, -74.090]}
        zoom={16} 
        minZoom={14}
        maxZoom={22} /* Permite hacer zoom hasta 22 (estirando el mapa en lugar de grises) */
        style={{ width: '100%', height: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19} /* Tope real de las imágenes gratuitas */
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
          let territoryColor = 'rgba(0,0,0,0.4)'; // Gris por defecto ("ningún color")
          if (completedParts > 0 && completedParts < totalParts) {
            territoryColor = '#eab308'; // Amarillo (Progreso parcial)
          } else if (completedParts === totalParts && totalParts > 0) {
            territoryColor = '#22c55e'; // Verde (Todo completo)
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
                                Lado ${i + 1} {isDone ? '✓' : ''}
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
                                status: targetState 
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

      {/* Input del Capitán - fuera del mapa para que sea visible */}
      <div className="captain-container">
        <input 
          type="text" 
          className="captain-input" 
          placeholder="Nombre del Capitán" 
          value={captain}
          onChange={(e) => setCaptain(e.target.value)}
        />
        <button 
          className="captain-submit-btn"
          onClick={() => socket.emit('update_captain', captain)}
        >
          Subir
        </button>
      </div>

      {/* Botón de limpiar todo - fuera del mapa para que el modal no quede tapado */}
      <ClearAllButton onConfirm={() => socket.emit('clear_all')} />
    </div>
  );
}

export default MapComponent;
