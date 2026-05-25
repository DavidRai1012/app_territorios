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

// Componente para la marca de agua escalable y dinámica
function TerritoryWatermark({ territory }) {
  const map = useMapEvents({
    zoomend: () => setZoom(map.getZoom())
  });
  const [currentZoom, setZoom] = useState(map.getZoom());

  if (!territory || !territory.limites) return null;

  // Calculamos opacidad dinámica: más lejos (zoom menor) = más opaco, más cerca = más translúcido
  // Zoom 14 -> 0.5, Zoom 15 -> 0.35, Zoom 16 -> 0.2, Zoom 17 -> 0.05
  let opacity = 0.5 - (currentZoom - 14) * 0.15;
  if (opacity < 0.03) opacity = 0.03; // Nunca desaparece por completo
  if (opacity > 0.8) opacity = 0.8;

  const bounds = L.latLngBounds(territory.limites);

  return (
    <SVGOverlay bounds={bounds} zIndexOffset={-100}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="50%" 
          y="50%" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          fontSize="40" 
          fontWeight="900" 
          fill={`rgba(0,0,0,${opacity})`}
          style={{ userSelect: 'none', transition: 'fill 0.3s' }}
        >
          {territory.numero_territorio}
        </text>
      </svg>
    </SVGOverlay>
  );
}

// Componente para ubicación en tiempo real
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

function MapComponent() {
  const [partStates, setPartStates] = useState({});
  const [territories, setTerritories] = useState([]);

  useEffect(() => {
    socket.on('initial_state', (data) => {
      setPartStates(data.states || {});
      setTerritories(data.territories || []);
    });

    socket.on('part_updated', ({ id, status }) => {
      setPartStates(prev => ({ ...prev, [id]: status }));
    });

    return () => {
      socket.off('initial_state');
      socket.off('part_updated');
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
        
        <MapBoundsFitter territories={territories} />
        <UserLocation />

        {territories.map(territory => (
          <React.Fragment key={territory.territorio_id}>
            
            <TerritoryWatermark territory={territory} />

            {/* Borde del territorio */}
            {territory.limites && territory.limites.length >= 3 && (
               <Polygon 
                 positions={territory.limites}
                 pathOptions={{ color: 'rgba(0,0,0,0.2)', weight: 2, fill: false, dashArray: '5, 5' }}
                 interactive={false}
               />
            )}

            {territory.manzanas.map(block => {
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
        ))}
      </MapContainer>
    </div>
  );
}

export default MapComponent;
