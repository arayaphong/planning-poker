const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors());

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Store room data
const rooms = new Map();

function updatePlayersInRoom(roomId) {
    const room = rooms.get(roomId);
    if (room) {
        const players = Array.from(room.users.values()).map(user => ({
            username: user.username,
            isScrumMaster: user.isScrumMaster,
            hasVoted: room.votes.has(user.username)
        }));
        io.to(roomId).emit('players_update', { players });
    }
}

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join', ({ username, roomId, isScrumMaster, isVoter }) => {
        socket.join(roomId);
        if (!rooms.has(roomId)) {
            rooms.set(roomId, { users: new Map(), votes: new Map(), currentStory: '' });
        }
        rooms.get(roomId).users.set(socket.id, { username, isScrumMaster, isVoter });
        console.log(`${username} joined room ${roomId}`);
        updatePlayersInRoom(roomId);
    });

    socket.on('vote', ({ username, roomId, value }) => {
        const room = rooms.get(roomId);
        if (room && room.votes) {
            room.votes.set(username, value);
            updatePlayersInRoom(roomId);
        } else {
            console.error(`Room ${roomId} not found or votes not initialized`);
        }
    });


    socket.on('reveal_votes', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room) {
            const votes = Array.from(room.votes, ([username, value]) => ({ username, value }));
            io.to(roomId).emit('votes_revealed', { votes });
        }
    });

    socket.on('start_voting', ({ roomId, story }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.currentStory = story;
            room.votes.clear();
            io.to(roomId).emit('voting_started', { story });
        }
    });

    socket.on('cancel_voting', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.currentStory = '';
            // Don't clear votes here
            io.to(roomId).emit('voting_cancelled');
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        rooms.forEach((room, roomId) => {
            if (room.users.has(socket.id)) {
                const username = room.users.get(socket.id).username;
                room.users.delete(socket.id);
                room.votes.delete(username);
                console.log(`${username} left room ${roomId}`);
                updatePlayersInRoom(roomId);
                if (room.users.size === 0) {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted`);
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
