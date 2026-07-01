import React, { createContext, useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

export const TerritoriesContext = createContext();

const socket = io(import.meta.env.DEV ? 'http://localhost:3000' : '/');

export const TerritoriesProvider = ({ children }) => {
  const [partStates, setPartStates] = useState({});
  const [territories, setTerritories] = useState([]);
  const [currentZoom, setCurrentZoom] = useState(16);
  const [mapBounds, setMapBounds] = useState(null);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [activityLog, setActivityLog] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [businessLayerActive, setBusinessLayerActive] = useState(false);

  useEffect(() => {
    socket.on('initial_state', ({ states, territories, activityLog }) => {
      setPartStates(states);
      setTerritories(territories);
      if (activityLog) setActivityLog(activityLog);
    });

    socket.on('part_updated', ({ id, status }) => {
      setPartStates(prev => ({ ...prev, [id]: status }));
    });

    socket.on('face_type_updated', ({ id, type }) => {
      setPartStates(prev => ({ ...prev, [`type_${id}`]: type }));
    });

    socket.on('bag_position_updated', ({ territory_id, position }) => {
      setPartStates(prev => ({ ...prev, [`bag_pos_${territory_id}`]: position }));
    });

    socket.on('activity_log', (log) => setActivityLog(log));

    return () => {
      socket.off('initial_state');
      socket.off('part_updated');
      socket.off('face_type_updated');
      socket.off('bag_position_updated');
      socket.off('activity_log');
    };
  }, []);

  const togglePart = useCallback((territoryId, blockId, partIndex, currentStatus) => {
    const id = `${territoryId}_${blockId}_p${partIndex}`;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setPartStates(prev => ({ ...prev, [id]: newStatus }));
    socket.emit('update_part', { id, territory_id: territoryId, block_id: blockId, part_index: partIndex, status: newStatus, userName });
  }, [userName]);

  const toggleFaceType = useCallback((territoryId, blockId, partIndex, currentType) => {
    const id = `${territoryId}_${blockId}_p${partIndex}`;
    const newType = currentType === 'business' ? 'normal' : 'business';
    setPartStates(prev => ({ ...prev, [`type_${id}`]: newType }));
    socket.emit('update_face_type', { id, type: newType, territory_id: territoryId, block_id: blockId, userName });
  }, [userName]);

  return (
    <TerritoriesContext.Provider value={{
      socket,
      partStates, setPartStates,
      territories, setTerritories,
      currentZoom, setCurrentZoom,
      mapBounds, setMapBounds,
      userName, setUserName,
      activityLog, setActivityLog,
      isReadOnly, setIsReadOnly,
      businessLayerActive, setBusinessLayerActive,
      togglePart, toggleFaceType
    }}>
      {children}
    </TerritoriesContext.Provider>
  );
};
