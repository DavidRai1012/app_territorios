const io = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected');
});

socket.on('initial_state', (data) => {
  console.log('Initial state received:');
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.log('Error:', err);
  process.exit(1);
});
