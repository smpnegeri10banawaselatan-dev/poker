const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;
const rooms = {}; // { roomId: [socketId1, socketId2] }

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('New user:', socket.id);

  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) rooms[roomId] = [];

    const room = rooms[roomId];
    if (room.length >= 2) {
      socket.emit('roomFull');
      return;
    }

    room.push(socket.id);
    socket.join(roomId);
    console.log(`${socket.id} joined ${roomId}`);

    socket.emit('joinedRoom', { roomId, playerNumber: room.length });
    io.to(roomId).emit('updatePlayers', room);

    if (room.length === 2) {
      io.to(roomId).emit('startGame');
    }
  });

  socket.on('playerAction', ({ roomId, action }) => {
    socket.to(roomId).emit('opponentAction', action);
  });

  socket.on('disconnect', () => {
    for (const [roomId, players] of Object.entries(rooms)) {
      const index = players.indexOf(socket.id);
      if (index !== -1) {
        players.splice(index, 1);
        socket.to(roomId).emit('opponentLeft');
        if (players.length === 0) delete rooms[roomId];
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
