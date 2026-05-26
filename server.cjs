const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'dist'))); // Serve Vite dist

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const dataFile = path.join(__dirname, 'data.json');
const mapasDir = path.join(__dirname, 'data', 'mapas');

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({}));
}
if (!fs.existsSync(mapasDir)) {
  fs.mkdirSync(mapasDir, { recursive: true });
}

function loadPartStates() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (e) {
    return {};
  }
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

io.on('connection', (socket) => {
  console.log('Usuario conectado');
  
  // Send current state and map definitions
  const states = loadPartStates();
  const territories = loadTerritories();
  
  socket.emit('initial_state', { states, territories });

  socket.on('update_part', ({ id, territory_id, block_id, part_index, status }) => {
    const states = loadPartStates();
    // Unique ID combining territory, block, and part
    states[id] = status;
    savePartStates(states);
    
    io.emit('part_updated', { id, status });
  });

  socket.on('clear_all', () => {
    savePartStates({});
    const territories = loadTerritories();
    io.emit('initial_state', { states: {}, territories });
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
