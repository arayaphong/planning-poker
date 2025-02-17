// State management using a single object
const state = {
    isScrumMaster: false,
    isVoter: false,
    isStoryActive: false,
    votes: new Set(),
    socket: null
};

// Card setup
const CARD_VALUES = ['1', '2', '3', '5', '8', '13', '21', '34', '?'];

// Initialize elements object as null initially
let elements = null;

// Initialize application
function init() {
    // Initialize socket
    state.socket = io('http://localhost:3000');

    // Initialize DOM elements
    elements = {
        screens: {
            login: document.getElementById('login-screen'),
            join: document.getElementById('join-screen'),
            game: document.getElementById('game-screen')
        },
        inputs: {
            createUsername: document.getElementById('create-username'),
            joinUsername: document.getElementById('join-username'),
            story: document.getElementById('story-input'),
            voterToggle: document.getElementById('voter-toggle')
        },
        displays: {
            user: document.getElementById('user-display'),
            room: document.getElementById('room-display'),
            joinRoomHeader: document.getElementById('join-room-header'),
            storyContent: document.getElementById('story-content'),
            results: document.getElementById('results-section'),
            players: document.getElementById('players')
        },
        sections: {
            scrumMaster: document.getElementById('scrum-master-controls'),
            voting: document.getElementById('voting-section'),
            cards: document.getElementById('cards')
        },
        buttons: {
            startVoting: document.getElementById('start-voting-button'),
            revealVotes: document.getElementById('reveal-votes-button')
        }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');

    if (roomId) {
        elements.screens.login.remove();
        elements.displays.joinRoomHeader.textContent = `Join Room: ${roomId}`;
    } else {
        elements.screens.join.remove();
    }

    setupSocketListeners();
}

// Socket event handlers
function setupSocketListeners() {
    state.socket.on('players_update', ({ players }) => {
        updatePlayersList(players);
        updateRevealButton();
    });

    state.socket.on('votes_revealed', ({ votes }) => {
        showResults(votes);
        disableVoting();
    });

    state.socket.on('voting_started', ({ story }) => {
        startNewVote(story);
    });

    state.socket.on('voting_cancelled', () => {
        resetVoting();
    });
}

// Room management
function createRoom() {
    const username = elements.inputs.createUsername.value;
    state.isVoter = elements.inputs.voterToggle?.checked;

    if (!username) {
        alert('Please enter a username');
        return;
    }

    const roomId = String(Math.floor(1000 + Math.random() * 9000));
    state.isScrumMaster = true;
    joinRoom(username, roomId);
}

function joinRoom(username = null, roomId = null) {
    username = username || elements.inputs.joinUsername.value;
    if (!username) {
        alert('Please enter a username');
        return;
    }

    roomId = roomId || elements.displays.joinRoomHeader.textContent.split(':')[1].trim();
    state.isVoter = true;

    state.socket.emit('join', {
        username,
        roomId,
        isScrumMaster: state.isScrumMaster,
        isVoter: state.isVoter
    });

    showGameScreen(username, roomId);
}

// UI management
function showGameScreen(username, roomId) {
    Object.values(elements.screens).forEach(screen => screen.style.display = 'none');
    elements.screens.game.style.display = 'block';

    elements.displays.room.textContent = roomId;
    elements.displays.user.textContent = username;

    elements.sections.scrumMaster.style.display = state.isScrumMaster ? 'block' : 'none';
    elements.buttons.revealVotes.style.display = state.isScrumMaster ? 'block' : 'none';

    if (state.isVoter) {
        elements.sections.voting.style.display = 'block';
        createCards();
    }
}

function createCards() {
    elements.sections.cards.innerHTML = CARD_VALUES.map(value => `
        <div class="card disabled" data-value="${value}">
            ${value}
        </div>
    `).join('');

    elements.sections.cards.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        if (!card) return;
        vote(card.dataset.value, card);
    });
}

// Voting management
function vote(value, cardElement) {
    if (!state.isStoryActive) {
        alert('Waiting for a story to be submitted before voting can begin.');
        return;
    }

    state.socket.emit('vote', {
        username: elements.displays.user.textContent,
        roomId: elements.displays.room.textContent,
        value
    });

    document.querySelectorAll('.card').forEach(card => card.classList.remove('selected'));
    cardElement.classList.add('selected');
    state.votes.add(elements.displays.user.textContent);
    updateRevealButton();
}

function startVoting() {
    const isStarting = elements.buttons.startVoting.textContent === 'Start Voting';

    if (isStarting) {
        const story = elements.inputs.story.value.trim();
        if (!story) {
            alert('Please enter a user story before starting the vote.');
            return;
        }
        state.socket.emit('start_voting', {
            roomId: elements.displays.room.textContent,
            story
        });

        elements.inputs.story.disabled = true;
        elements.buttons.startVoting.textContent = 'Cancel';
    } else {
        state.socket.emit('cancel_voting', {
            roomId: elements.displays.room.textContent
        });
        resetVoting();
    }
}

// Helper functions
function updatePlayersList(players) {
    elements.displays.players.innerHTML = players.map(player => `
        <li>${player.username}
            ${player.isScrumMaster ? ' (Scrum Master)' : ''}
            ${player.hasVoted ? ' [voted]' : ''}
        </li>
    `).join('');

    players.forEach(player => {
        player.hasVoted ? state.votes.add(player.username) : state.votes.delete(player.username);
    });
}

function updateRevealButton() {
    elements.buttons.revealVotes.disabled =
        !(state.isScrumMaster && state.isStoryActive && state.votes.size > 0);
}

function showResults(votes) {
    elements.displays.results.innerHTML = `
        <h3>Voting Results:</h3>
        ${votes.map(vote => `<p>${vote.username}: ${vote.value}</p>`).join('')}
    `;
}

function resetVoting() {
    elements.inputs.story.disabled = false;
    elements.buttons.startVoting.textContent = 'Start Voting';
    elements.displays.storyContent.textContent = 'Waiting for story...';
    disableVoting();
}

function startNewVote(story) {
    elements.displays.storyContent.textContent = story;
    elements.displays.results.innerHTML = '';
    if (state.isVoter) {
        enableVoting();
    }
}

function enableVoting() {
    state.isStoryActive = true;
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('disabled');
        card.classList.add('active');
    });
}

function disableVoting() {
    state.isStoryActive = false;
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('active', 'selected');
        card.classList.add('disabled');
    });
}

function copyInviteLink() {
    const link = `${window.location.origin}${window.location.pathname}?room=${elements.displays.room.textContent}`;
    navigator.clipboard.writeText(link)
        .then(() => alert('Invite link copied to clipboard!'));
}

function revealVotes() {
    elements.buttons.revealVotes.disabled = true;
    state.votes.clear();
    state.socket.emit('reveal_votes', {
        roomId: elements.displays.room.textContent
    });
}

// Initialize on load
window.onload = init;

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createRoom,
        joinRoom,
        startVoting,
        vote,
        revealVotes,
        init,
        state
    };
}
