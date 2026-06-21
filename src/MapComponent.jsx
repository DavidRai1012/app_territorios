import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Popup, Marker, useMap, SVGOverlay, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const socket = io(import.meta.env.DEV ? 'http://localhost:3000' : '/');

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

function ZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom())
  });
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  return null;
}

function TerritoryWatermark({ territory, currentZoom, businessLayerActive }) {
  if (!territory || !territory.limites) return null;

  const opacity = businessLayerActive ? 0.15 : (currentZoom <= 16 ? 1 : 0.15);
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
          className="icon-btn"
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

  return (
    <>
      <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 1000 }}>
        <button 
          onClick={() => { setStep(1); setCountdown(15); }} 
          style={{ padding: '10px 15px', background: 'white', border: '2px solid red', borderRadius: '8px', cursor: 'pointer', color: 'red', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
        >
          Limpiar
        </button>
      </div>

      {step === 1 && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>¿Seguro que quiere limpiar todas las manzanas?</h2>
            <p>Esta acción borrará el progreso de todos los territorios. Por favor espere {countdown} segundos para confirmar.</p>
            <button disabled={countdown > 0} onClick={() => setStep(2)} style={countdown === 0 ? { background: '#ef4444', color: 'white' } : {}}>
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
            <button style={{ background: 'red', color: 'white', fontWeight: 'bold' }} onClick={() => { onConfirm(); setStep(0); }}>
              Borrar Todo Definitivamente
            </button>
            <button onClick={() => setStep(0)}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}

function PasswordModal({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (password === 'Sal8318') onSuccess();
    else setError('Contraseña incorrecta');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content name-modal">
        <h2 style={{ color: '#2563eb' }}>Acceso Restringido</h2>
        <p>Ingrese la contraseña para acceder:</p>
        <div className="password-wrapper">
          <input 
            type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Contraseña" className="name-modal-input" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button type="button" className="toggle-pwd-btn" onClick={() => setShowPwd(!showPwd)}>
            {showPwd ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '5px 0' }}>{error}</p>}
        <button onClick={handleSubmit} style={{ background: '#2563eb', color: 'white' }}>Entrar</button>
      </div>
    </div>
  );
}

function NameModal({ onSubmit }) {
  const [name, setName] = useState(localStorage.getItem('userName') || '');
  return (
    <div className="modal-overlay">
      <div className="modal-content name-modal">
        <h2 style={{ color: '#2563eb' }}>Bienvenido</h2>
        <p>Ingrese su nombre para registrar los cambios que realice:</p>
        <input 
          type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Su nombre"
          className="name-modal-input" autoFocus onKeyDown={(e) => e.key === 'Enter' && name.trim() && (() => { localStorage.setItem('userName', name.trim()); onSubmit(name.trim()); })()}
        />
        <button onClick={() => { if (name.trim()) { localStorage.setItem('userName', name.trim()); onSubmit(name.trim()); } }} disabled={!name.trim()} style={name.trim() ? { background: '#2563eb', color: 'white' } : {}}>
          Continuar
        </button>
      </div>
    </div>
  );
}

function DocxModal({ onClose, onGenerate }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Descargar Registro DOCX</h2>
        <p>Seleccione el Año de servicio:</p>
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 0 }}>Ej: Año 2026 = Sept 2025 a Ago 2026</p>
        <select className="name-modal-input" value={year} onChange={(e) => setYear(e.target.value)} style={{ marginTop: '10px' }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button style={{ background: '#2563eb', color: 'white', marginTop: 15 }} onClick={() => { onGenerate(year); onClose(); }}>Generar DOCX</button>
        <button onClick={onClose} style={{ marginTop: 5 }}>Cancelar</button>
      </div>
    </div>
  );
}

const generateDocx = async (year, activityLog) => {
  try {
    // Año fiscal: "Año 2026" = 1 Sept 2025 hasta 31 Ago 2026
    const yearNum = parseInt(year);
    const fiscalStart = new Date(yearNum - 1, 8, 1); // Sept 1 del año anterior
    const fiscalEnd = new Date(yearNum, 7, 31, 23, 59, 59, 999); // Ago 31 del año seleccionado

    const data = {};
    for (let i = 1; i <= 40; i++) {
      data[i] = { fman: '', completions: [] };
    }

    const currentNames = {};

    activityLog.forEach(log => {
      const tNum = parseInt(log.territoryNum);
      if (!tNum || tNum > 40) return;

      const logDate = new Date(log.date);

      if (!currentNames[tNum]) currentNames[tNum] = new Set();

      if (['completar_manzana', 'terminar_parcial', 'parcial_manzana'].includes(log.type)) {
        if (log.userName && log.userName !== 'Desconocido') {
          currentNames[tNum].add(log.userName);
        }
      } else if (log.type === 'territorio_completo') {
        // Solo incluir completados dentro del año fiscal seleccionado
        if (logDate >= fiscalStart && logDate <= fiscalEnd) {
          const dateStr = `${logDate.getDate()}/${logDate.getMonth() + 1}/${logDate.getFullYear()}`;

          const namesArray = Array.from(currentNames[tNum]);
          const formattedNames = namesArray.map(name => {
            const parts = name.trim().split(' ');
            if (parts.length === 1) return parts[0];
            return parts[0] + ' ' + parts[1][0] + '.';
          }).join('-');

          data[tNum].completions.push({ date: dateStr, names: formattedNames });
          data[tNum].fman = dateStr;
        }
        currentNames[tNum].clear();
      }
    });

    const response = await fetch('/plantilla.docx');
    if (!response.ok) throw new Error('Plantilla no encontrada');
    const arrayBuffer = await response.arrayBuffer();

    const docxOptions = {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' }
    };

    const createDocData = (offset) => {
      const docData = {};
      for (let i = 1; i <= 40; i++) {
        if (i <= 37) {
          docData[`tn${i}`] = i.toString();
          docData[`fman${i}`] = data[i].fman;
          for (let r = 0; r < 4; r++) {
            const comp = data[i].completions[offset + r];
            docData[`Ntn${i}R${r}`] = comp ? comp.names : '';
            docData[`ftn${i}R${r}`] = comp ? comp.date : '';
          }
        } else {
          docData[`tn${i}`] = '';
          docData[`fman${i}`] = '';
          for (let r = 0; r < 4; r++) {
            docData[`Ntn${i}R${r}`] = '';
            docData[`ftn${i}R${r}`] = '';
          }
        }
      }
      return docData;
    };

    let maxComps = 0;
    for (let i = 1; i <= 37; i++) {
      maxComps = Math.max(maxComps, data[i].completions.length);
    }
    const numFiles = Math.max(1, Math.ceil(maxComps / 4));

    if (numFiles === 1) {
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, docxOptions);
      doc.render(createDocData(0));
      const out = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(out, `Registro_Año_${year}.docx`);
    } else {
      const outZip = new JSZip();
      for (let f = 0; f < numFiles; f++) {
        const zip = new PizZip(arrayBuffer);
        const doc = new Docxtemplater(zip, docxOptions);
        doc.render(createDocData(f * 4));
        const out = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        outZip.file(`Registro_Año_${year}_Parte${f+1}.docx`, out);
      }
      const content = await outZip.generateAsync({ type: 'blob' });
      saveAs(content, `Registro_Año_${year}_Completo.zip`);
    }
  } catch (error) {
    console.error('Error generando DOCX:', error);
    alert('Hubo un error al generar el archivo. Verifica la consola.');
  }
};

function LogPanel({ log, onClose, onDownloadDocx, userName }) {
  const reversed = [...log].reverse();
  return (
    <div className="log-panel-overlay" onClick={onClose}>
      <div className="log-panel" onClick={(e) => e.stopPropagation()}>
        <div className="log-panel-header">
          <h3>📋 Registro de Actividad</h3>
          <button className="log-close-btn" onClick={onClose}>✕</button>
        </div>
        {userName === 'Superintendente Nel' && (
          <div style={{ padding: '10px' }}>
            <button onClick={onDownloadDocx} className="docx-btn">📄 Descargar Registro DOCX</button>
          </div>
        )}
        <div className="log-panel-body">
          {reversed.length === 0 && <p className="log-empty">No hay actividad registrada aún.</p>}
          {reversed.map((entry, i) => {
            const emoji = entry.type === 'completar_manzana' ? '🟢' : entry.type === 'parcial_manzana' ? '🟡' : entry.type === 'terminar_parcial' ? '✅' : entry.type === 'territorio_completo' ? '🏆' : entry.type === 'limpiar_todo' ? '🗑️' : '📝';
            const text = entry.type === 'completar_manzana' ? `Completar manzana ${entry.blockNum}` : entry.type === 'parcial_manzana' ? `Realizar parcial manzana ${entry.blockNum}` : entry.type === 'terminar_parcial' ? `Terminar parcial manzana ${entry.blockNum}` : entry.type === 'territorio_completo' ? `¡Territorio ${entry.territoryNum} COMPLETADO!` : entry.type === 'limpiar_todo' ? 'Limpiar todo' : 'Cambio';
            return (
              <div key={i} className={`log-entry log-type-${entry.type}`}>
                <span className="log-emoji">{emoji}</span>
                <div className="log-info">
                  <strong>{text}</strong>
                  {entry.territoryNum && entry.type !== 'territorio_completo' && <span className="log-territory"> (Territorio {entry.territoryNum})</span>}
                  <div className="log-meta">{entry.userName} — {new Date(entry.date).toLocaleString()}</div>
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
  const [showDocxModal, setShowDocxModal] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [nameEdit, setNameEdit] = useState('');
  const [editingName, setEditingName] = useState(false);
  
  // Capa de negocios
  const [businessLayerActive, setBusinessLayerActive] = useState(false);

  useEffect(() => {
    socket.on('initial_state', (data) => {
      setPartStates(data.states || {});
      setTerritories(data.territories || []);
      if (data.activityLog) setActivityLog(data.activityLog);
    });
    socket.on('part_updated', ({ id, status }) => {
      setPartStates(prev => ({ ...prev, [id]: status }));
    });
    socket.on('face_type_updated', ({ id, type }) => {
      setPartStates(prev => ({ ...prev, [`type_${id}`]: type }));
    });
    socket.on('activity_log', (log) => setActivityLog(log));

    return () => {
      socket.off('initial_state'); socket.off('part_updated'); socket.off('face_type_updated'); socket.off('activity_log');
    };
  }, []);

  const togglePart = (territoryId, blockId, partIndex, currentStatus) => {
    const id = `${territoryId}_${blockId}_p${partIndex}`;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setPartStates(prev => ({ ...prev, [id]: newStatus }));
    socket.emit('update_part', { id, territory_id: territoryId, block_id: blockId, part_index: partIndex, status: newStatus, userName });
  };

  const toggleFaceType = (territoryId, blockId, partIndex, currentType) => {
    const id = `${territoryId}_${blockId}_p${partIndex}`;
    const newType = currentType === 'business' ? 'normal' : 'business';
    setPartStates(prev => ({ ...prev, [`type_${id}`]: newType }));
    socket.emit('update_face_type', { id, type: newType, territory_id: territoryId, block_id: blockId, userName });
  };

  if (showPassword) return <PasswordModal onSuccess={() => { setShowPassword(false); setShowNameModal(true); }} />;
  if (showNameModal) return <NameModal onSubmit={(name) => { setUserName(name); setNameEdit(name); setShowNameModal(false); }} />;
  if (showDocxModal) return <DocxModal onClose={() => setShowDocxModal(false)} onGenerate={(y) => generateDocx(y, activityLog)} />;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer center={[4.7425, -74.090]} zoom={16} minZoom={14} maxZoom={22} style={{ width: '100%', height: '100%', zIndex: 1 }} zoomControl={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} />
        <ZoomTracker onZoomChange={setCurrentZoom} />
        <MapBoundsFitter territories={territories} />
        <UserLocation />

        {territories.map(territory => {
          let totalNormalParts = 0;
          let completedNormalParts = 0;
          let totalBusinessParts = 0;
          let completedBusinessParts = 0;
          
          if (territory.manzanas) {
            territory.manzanas.forEach(block => {
              const numSides = block.puntos.length;
              for (let i = 0; i < numSides; i++) {
                const isBusiness = partStates[`type_${territory.territorio_id}_${block.id}_p${i}`] === 'business';
                const isCompleted = partStates[`${territory.territorio_id}_${block.id}_p${i}`] === 'completed';
                if (isBusiness) {
                  totalBusinessParts++;
                  if (isCompleted) completedBusinessParts++;
                } else {
                  totalNormalParts++;
                  if (isCompleted) completedNormalParts++;
                }
              }
            });
          }

          let territoryColor = 'rgba(0,0,0,0.4)';
          if (completedNormalParts > 0 && completedNormalParts < totalNormalParts) territoryColor = '#eab308';
          else if (completedNormalParts === totalNormalParts && totalNormalParts > 0) territoryColor = '#22c55e';

          let territoryBagColor = null;
          if (totalBusinessParts > 0) {
            if (completedBusinessParts === totalBusinessParts) territoryBagColor = '#3b82f6';
            else if (completedBusinessParts > 0) territoryBagColor = '#f97316';
            else territoryBagColor = '#9ca3af';
          }

          let territoryCenter = null;
          if (territory.limites && territory.limites.length >= 3) {
            territoryCenter = L.latLngBounds(territory.limites).getCenter();
          }

          return (
          <React.Fragment key={territory.territorio_id}>
            <TerritoryWatermark territory={territory} currentZoom={currentZoom} businessLayerActive={businessLayerActive} />

            {/* Marcador del maletín del territorio (Solo en zoom out y si hay negocios) */}
            {territoryCenter && territoryBagColor && currentZoom <= 16 && (
              <Marker 
                position={territoryCenter} 
                icon={L.divIcon({
                  className: 'territory-bag-container',
                  html: `<div class="block-bag" style="background:${territoryBagColor}; padding: 6px 10px; font-size: 22px; border-radius: 8px;">💼</div>`,
                  iconSize: [46, 40],
                  // Centrado en x (23), desplazado hacia abajo en y (-15 mueve el icono hacia abajo respecto a su ancla)
                  iconAnchor: [23, -20] 
                })} 
                interactive={false}
              />
            )}

            {/* Borde del territorio, se oculta un poco si la capa de negocios está activa */}
            {territory.limites && territory.limites.length >= 3 && !businessLayerActive && (
               <Polygon positions={territory.limites} pathOptions={{ color: territoryColor, weight: currentZoom <= 16 ? 5 : 3, fill: currentZoom <= 16, fillColor: territoryColor, fillOpacity: 0.2, dashArray: '5, 5', opacity: 0.9 }} interactive={false} />
            )}

            {(currentZoom > 16 || businessLayerActive) && territory.manzanas.map(block => {
              const numSides = block.puntos.length;
              let normalCount = 0;
              let normalCompletedCount = 0;
              let businessCount = 0;
              let businessCompletedCount = 0;

              for (let i = 0; i < numSides; i++) {
                const id = `${territory.territorio_id}_${block.id}_p${i}`;
                const isBusiness = partStates[`type_${id}`] === 'business';
                const isDone = partStates[id] === 'completed';
                if (isBusiness) {
                  businessCount++;
                  if (isDone) businessCompletedCount++;
                } else {
                  normalCount++;
                  if (isDone) normalCompletedCount++;
                }
              }

              // Color del maletín
              let bagColor = '#9ca3af'; // Gris
              if (businessCount > 0) {
                if (businessCompletedCount === businessCount) bagColor = '#3b82f6'; // Azul
                else if (businessCompletedCount > 0) bagColor = '#f97316'; // Naranja
              }

              // Si estamos en la capa de negocios y no hay negocios, ocultamos la manzana
              if (businessLayerActive && businessCount === 0) return null;

              // En la vista normal
              const isFullyCompletedNormal = normalCount > 0 && normalCompletedCount === normalCount;
              const isPartiallyCompletedNormal = normalCompletedCount > 0 && normalCompletedCount < normalCount;
              let fillColor = isFullyCompletedNormal ? '#22c55e' : isPartiallyCompletedNormal ? '#fbbf24' : '#3b82f6';
              let fillOpacity = isFullyCompletedNormal ? 0.6 : isPartiallyCompletedNormal ? 0.4 : 0.0;
              if (normalCount === 0) {
                fillColor = '#3b82f6';
                fillOpacity = 0.0;
              }

              // Relleno para capa de negocios: SIN RELLENO
              if (businessLayerActive) {
                fillOpacity = 0.0;
              }

              const blockCenter = L.latLngBounds(block.puntos).getCenter();
              const bagHtml = businessCount > 0 ? `<div class="block-bag" style="background:${bagColor};">💼</div>` : '';
              const blockIcon = L.divIcon({
                className: 'block-number-container',
                html: `<div class="block-number-label"><span>${block.numero}</span></div>${!businessLayerActive ? bagHtml : ''}`,
                iconSize: [24, 40],
                iconAnchor: [12, 12]
              });

              // Determinar si mostrar bordes en la capa de negocios (solo si es naranja)
              const showBordersInBusinessLayer = bagColor === '#f97316';

              return (
                <React.Fragment key={block.id}>
                  <Marker position={blockCenter} icon={blockIcon} interactive={false} />

                  {/* Polígono de relleno (sin relleno en capa de negocios) */}
                  <Polygon positions={block.puntos} pathOptions={{ stroke: false, fillColor, fillOpacity }} interactive={!businessLayerActive}>
                    <Popup>
                      <div className="popup-content">
                        <h3>Manzana {block.numero}</h3>
                        <p>Normales: {normalCompletedCount}/{normalCount} | Negocios: {businessCompletedCount}/{businessCount}</p>
                        <div className="sides-grid">
                          {block.puntos.map((_, i) => {
                            const id = `${territory.territorio_id}_${block.id}_p${i}`;
                            const isDone = partStates[id] === 'completed';
                            const isBusiness = partStates[`type_${id}`] === 'business';
                            return (
                              <div key={i} style={{ display: 'flex', gap: '5px' }}>
                                <button className={`side-btn ${isDone ? 'done' : ''}`} style={{ flex: 1, background: isBusiness && !isDone ? '#3b82f6' : '' }} onClick={() => togglePart(territory.territorio_id, block.id, i, partStates[id])}>
                                  Cara {i + 1} {isDone ? '✓' : ''}
                                </button>
                                {userName === 'Superintendente Nel' && (
                                  <button className="type-toggle-btn" style={{ background: isBusiness ? '#4b5563' : '#e5e7eb', color: isBusiness ? 'white' : 'black' }} onClick={() => toggleFaceType(territory.territorio_id, block.id, i, isBusiness ? 'business' : 'normal')} title="Marcar como negocio">
                                    💼
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <button 
                          className="complete-all-btn"
                          onClick={() => {
                            const targetState = normalCompletedCount === normalCount ? 'pending' : 'completed';
                            block.puntos.forEach((_, i) => {
                              const isBusiness = partStates[`type_${territory.territorio_id}_${block.id}_p${i}`] === 'business';
                              if (!isBusiness) {
                                const id = `${territory.territorio_id}_${block.id}_p${i}`;
                                setPartStates(prev => ({ ...prev, [id]: targetState }));
                                socket.emit('update_part', { id, territory_id: territory.territorio_id, block_id: block.id, part_index: i, status: targetState, userName });
                              }
                            });
                          }}
                        >
                          {normalCompletedCount === normalCount ? 'Desmarcar Normales' : 'Marcar Normales'}
                        </button>
                        
                        {businessCount > 0 && (
                          <button 
                            className="complete-all-btn"
                            style={{ marginTop: '5px', background: businessCompletedCount === businessCount ? '#f87171' : '#3b82f6' }}
                            onClick={() => {
                              const targetState = businessCompletedCount === businessCount ? 'pending' : 'completed';
                              block.puntos.forEach((_, i) => {
                                const isBusiness = partStates[`type_${territory.territorio_id}_${block.id}_p${i}`] === 'business';
                                if (isBusiness) {
                                  const id = `${territory.territorio_id}_${block.id}_p${i}`;
                                  setPartStates(prev => ({ ...prev, [id]: targetState }));
                                  socket.emit('update_part', { id, territory_id: territory.territorio_id, block_id: block.id, part_index: i, status: targetState, userName });
                                }
                              });
                            }}
                          >
                            {businessCompletedCount === businessCount ? 'Desmarcar Negocios' : 'Completar Negocios'}
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Polygon>

                  {/* Líneas de borde */}
                  {block.puntos.map((point, i) => {
                    const nextI = (i + 1) % numSides;
                    const linePositions = [point, block.puntos[nextI]];
                    const isDone = partStates[`${territory.territorio_id}_${block.id}_p${i}`] === 'completed';
                    const isBusiness = partStates[`type_${territory.territorio_id}_${block.id}_p${i}`] === 'business';
                    
                    // En capa de negocios, SOLO mostramos las caras que son negocios
                    if (businessLayerActive && !isBusiness) {
                      return null;
                    }

                    let lineColor = isDone ? '#16a34a' : '#ef4444';
                    if (isBusiness) lineColor = isDone ? '#16a34a' : '#3b82f6';
                    
                    return (
                      <Polyline
                        key={`line_${i}`}
                        positions={linePositions}
                        pathOptions={{ color: lineColor, weight: isDone ? 6 : 3, opacity: 0.9 }}
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

      {/* Botón de Capa de Negocios */}
      <div style={{ position: 'absolute', top: 120, right: 15, zIndex: 10000 }}>
        <button 
          className="icon-btn"
          style={{ background: businessLayerActive ? '#4b5563' : 'white', color: businessLayerActive ? 'white' : 'black' }}
          onClick={() => setBusinessLayerActive(!businessLayerActive)}
          title="Capa de Negocios"
        >
          💼
        </button>
      </div>

      <div style={{ position: 'absolute', top: 70, right: 15, zIndex: 10000 }}>
        <button className="icon-btn" onClick={() => setShowLogPanel(true)} title="Menú principal">☰</button>
      </div>

      <div className="user-name-bar">
        {!editingName ? (
          <>
            <span>Usuario: {userName}</span>
            <button className="name-edit-btn" onClick={() => { setEditingName(true); setNameEdit(userName); }}>Editar</button>
          </>
        ) : (
          <>
            <input type="text" className="name-edit-input" value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} autoFocus />
            <button className="name-save-btn" onClick={() => { if (nameEdit.trim()) { setUserName(nameEdit.trim()); localStorage.setItem('userName', nameEdit.trim()); } setEditingName(false); }}>✓</button>
            <button className="name-cancel-btn" onClick={() => setEditingName(false)}>✕</button>
          </>
        )}
      </div>

      <ClearAllButton onConfirm={() => socket.emit('clear_all', { userName })} />

      {showLogPanel && <LogPanel log={activityLog} onClose={() => setShowLogPanel(false)} onDownloadDocx={() => { setShowLogPanel(false); setShowDocxModal(true); }} userName={userName} />}
    </div>
  );
}

export default MapComponent;
