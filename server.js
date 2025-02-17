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

// Event handlers
function handleJoin(socket, { username, roomId, isScrumMaster, isVoter }) {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
        rooms.set(roomId, { users: new Map(), votes: new Map(), currentStory: '' });
    }
    rooms.get(roomId).users.set(socket.id, { username, isScrumMaster, isVoter });
    console.log(`${username} joined room ${roomId}`);
    updatePlayersInRoom(roomId);
}

function handleVote(socket, { username, roomId, value }) {
    const room = rooms.get(roomId);
    if (room && room.votes) {
        room.votes.set(username, value);
        updatePlayersInRoom(roomId);
    } else {
        console.error(`Room ${roomId} not found or votes not initialized`);
    }
}

function handleRevealVotes(socket, { roomId }) {
    const room = rooms.get(roomId);
    if (room) {
        const votes = Array.from(room.votes, ([username, value]) => ({ username, value }));
        io.to(roomId).emit('votes_revealed', { votes });
    }
}

function handleStartVoting(socket, { roomId, story }) {
    const room = rooms.get(roomId);
    if (room) {
        room.currentStory = story;
        room.votes.clear();
        io.to(roomId).emit('voting_started', { story });
    }
}

function handleCancelVoting(socket, { roomId }) {
    const room = rooms.get(roomId);
    if (room) {
        room.currentStory = '';
        io.to(roomId).emit('voting_cancelled');
    }
}

function handleDisconnect(socket) {
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
}

// Socket connection setup
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join', (data) => handleJoin(socket, data));
    socket.on('vote', (data) => handleVote(socket, data));
    socket.on('reveal_votes', (data) => handleRevealVotes(socket, data));
    socket.on('start_voting', (data) => handleStartVoting(socket, data));
    socket.on('cancel_voting', (data) => handleCancelVoting(socket, data));
    socket.on('disconnect', () => handleDisconnect(socket));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
