const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const dataFile = path.join(__dirname, 'data.json');
const mapasDir = path.join(__dirname, 'data', 'mapas');
const logFile = path.join(__dirname, 'activity_log.json');

if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}));
if (!fs.existsSync(mapasDir)) fs.mkdirSync(mapasDir, { recursive: true });
if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, JSON.stringify([]));

function loadPartStates() {
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); }
  catch (e) { return {}; }
}

function savePartStates(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function loadTerritories() {
  const territories = [];
  try {
    const files = fs.readdirSync(mapasDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(mapasDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        territories.push(data);
      }
    }
  } catch (err) {
    console.error("Error reading maps dir:", err);
  }
  return territories;
}

function loadActivityLog() {
  try { return JSON.parse(fs.readFileSync(logFile, 'utf8')); }
  catch (e) { return []; }
}

function saveActivityLog(log) {
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
}

// Calcula el estado de una manzana basado SOLO en caras normales: 'none', 'partial', 'complete'
function getBlockState(states, territoryId, blockId, numSides) {
  let normalCompleted = 0;
  let normalCount = 0;
  for (let i = 0; i < numSides; i++) {
    const faceId = `${territoryId}_${blockId}_p${i}`;
    const isBusiness = states[`type_${faceId}`] === 'business';
    if (!isBusiness) {
      normalCount++;
      if (states[faceId] === 'completed') normalCompleted++;
    }
  }
  if (normalCount === 0) return 'none'; // Si no tiene caras normales
  if (normalCompleted === 0) return 'none';
  if (normalCompleted === normalCount) return 'complete';
  return 'partial';
}

// Debounce para agrupar clics rápidos (ej: "Marcar Todo") en un solo registro
const pendingChecks = {};

function scheduleBlockCheck(territoryId, blockId, prevState, userName) {
  const key = `${territoryId}_${blockId}`;

  if (!pendingChecks[key]) {
    pendingChecks[key] = { prevState, userName };
  }
  if (pendingChecks[key].timer) clearTimeout(pendingChecks[key].timer);
  pendingChecks[key].userName = userName;

  pendingChecks[key].timer = setTimeout(() => {
    const info = pendingChecks[key];
    delete pendingChecks[key];

    const states = loadPartStates();
    const territories = loadTerritories();
    const territory = territories.find(t => t.territorio_id === territoryId);
    const block = territory ? territory.manzanas.find(b => b.id === blockId) : null;
    if (!block || !territory) return;

    const newState = getBlockState(states, territoryId, blockId, block.puntos.length);
    if (info.prevState === newState) return;

    const log = loadActivityLog();
    let type = null;

    if (newState === 'complete' && info.prevState === 'none') type = 'completar_manzana';
    else if (newState === 'complete' && info.prevState === 'partial') type = 'terminar_parcial';
    else if (newState === 'partial' && info.prevState === 'none') type = 'parcial_manzana';

    if (type) {
      log.push({
        type,
        userName: info.userName || 'Desconocido',
        date: new Date().toISOString(),
        territoryNum: territory.numero_territorio,
        blockNum: block.numero
      });

      // Verificar si todo el territorio quedó completo
      if (newState === 'complete') {
        const allComplete = territory.manzanas.every(b =>
          getBlockState(states, territoryId, b.id, b.puntos.length) === 'complete'
        );
        if (allComplete) {
          log.push({
            type: 'territorio_completo',
            userName: info.userName || 'Desconocido',
            date: new Date().toISOString(),
            territoryNum: territory.numero_territorio,
            blockNum: null
          });
        }
      }

      saveActivityLog(log);
      io.emit('activity_log', log);
    }
  }, 400);
}

io.on('connection', (socket) => {
  console.log('Usuario conectado');

  const states = loadPartStates();
  const territories = loadTerritories();
  const activityLog = loadActivityLog();

  socket.emit('initial_state', { states, territories, activityLog });

  socket.on('update_part', ({ id, territory_id, block_id, part_index, status, userName }) => {
    const currentStates = loadPartStates();

    // Guardar estado previo de la manzana ANTES de aplicar el cambio
    const territories = loadTerritories();
    const territory = territories.find(t => t.territorio_id === territory_id);
    const block = territory ? territory.manzanas.find(b => b.id === block_id) : null;
    const key = `${territory_id}_${block_id}`;
    let prevState = 'none';
    if (block && !pendingChecks[key]) {
      prevState = getBlockState(currentStates, territory_id, block_id, block.puntos.length);
    } else if (pendingChecks[key]) {
      prevState = pendingChecks[key].prevState;
    }

    // Aplicar el cambio
    currentStates[id] = status;
    savePartStates(currentStates);
    io.emit('part_updated', { id, status });

    // Programar verificación de cambio de estado (con debounce)
    if (block) {
      scheduleBlockCheck(territory_id, block_id, prevState, userName);
    }
  });

  socket.on('update_face_type', ({ id, type, territory_id, block_id, userName }) => {
    const currentStates = loadPartStates();
    
    // Guardar estado previo para la verificación
    const territories = loadTerritories();
    const territory = territories.find(t => t.territorio_id === territory_id);
    const block = territory ? territory.manzanas.find(b => b.id === block_id) : null;
    const key = `${territory_id}_${block_id}`;
    let prevState = 'none';
    if (block && !pendingChecks[key]) {
      prevState = getBlockState(currentStates, territory_id, block_id, block.puntos.length);
    } else if (pendingChecks[key]) {
      prevState = pendingChecks[key].prevState;
    }

    currentStates[`type_${id}`] = type;
    savePartStates(currentStates);
    io.emit('face_type_updated', { id, type });

    // Programar verificación porque al cambiar el tipo, puede completarse la manzana (si las normales restantes ya estaban completas)
    if (block) {
      scheduleBlockCheck(territory_id, block_id, prevState, userName);
    }
  });

  socket.on('update_bag_position', ({ territory_id, position }) => {
    const currentStates = loadPartStates();
    currentStates[`bag_pos_${territory_id}`] = position;
    savePartStates(currentStates);
    io.emit('bag_position_updated', { territory_id, position });
  });

  socket.on('clear_all', ({ userName } = {}) => {
    const currentStates = loadPartStates();
    const newStates = {};
    for (const key in currentStates) {
      if (key.startsWith('type_') || key.startsWith('bag_pos_')) {
        newStates[key] = currentStates[key];
      }
    }
    savePartStates(newStates);
    
    // Forzar sincronización de todos los clientes con el nuevo estado parcial
    const territories = loadTerritories();
    const log = loadActivityLog();
    io.emit('initial_state', { states: newStates, territories, activityLog: log });
    log.push({
      type: 'limpiar_todo',
      userName: userName || 'Desconocido',
      date: new Date().toISOString(),
      territoryNum: null,
      blockNum: null
    });
    saveActivityLog(log);
    io.emit('initial_state', { states: newStates, territories, activityLog: log });
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
