// Set up TextEncoder/Decoder first
const util = require('util');
global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;

// Then import other dependencies
const { JSDOM } = require('jsdom');

// Create mock socket object
const mockSocket = {
    emit: jest.fn(),
    on: jest.fn()
};

// Mock socket.io-client
jest.mock('socket.io-client', () => {
    return jest.fn(() => mockSocket);
});

// Now import your application code
const { createRoom, joinRoom, startVoting, vote, revealVotes, init, state } = require('./script');

describe('Planning Poker', () => {
    let dom;

    beforeAll(() => {
        // Set up JSDOM
        dom = new JSDOM(`<!DOCTYPE html><body></body>`, {
            url: 'http://localhost',
            runScripts: 'dangerously',
            resources: 'usable'
        });

        // Set up globals
        global.window = dom.window;
        global.document = dom.window.document;
        global.io = jest.fn(() => mockSocket);
        global.navigator = {
            clipboard: {
                writeText: jest.fn().mockResolvedValue(undefined)
            }
        };

        // Set up the DOM structure
        document.body.innerHTML = `
            <div id="login-screen"></div>
            <div id="join-screen"></div>
            <div id="game-screen"></div>
            <input id="create-username" />
            <input id="join-username" />
            <input id="story-input" />
            <input id="voter-toggle" type="checkbox" />
            <div id="user-display"></div>
            <div id="room-display"></div>
            <div id="join-room-header"></div>
            <div id="story-content"></div>
            <div id="results-section"></div>
            <div id="players"></div>
            <div id="scrum-master-controls"></div>
            <div id="voting-section"></div>
            <div id="cards"></div>
            <button id="start-voting-button"></button>
            <button id="reveal-votes-button"></button>
        `;

        // Initialize the application
        init();
    });

    beforeEach(() => {
        // Clear all mock function calls before each test
        jest.clearAllMocks();
    });

    afterAll(() => {
        dom.window.close();
    });

    test.skip('init function should set up the initial state and socket listeners', () => {
        expect(mockSocket.on).toHaveBeenCalledWith('players_update', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('votes_revealed', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('voting_started', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('voting_cancelled', expect.any(Function));
    });

    test('createRoom should emit join event with correct parameters', () => {
        document.getElementById('create-username').value = 'testUser';
        document.getElementById('voter-toggle').checked = true;

        createRoom();

        expect(mockSocket.emit).toHaveBeenCalledWith('join', {
            username: 'testUser',
            roomId: expect.any(String),
            isScrumMaster: true,
            isVoter: true
        });
    });

    test.skip('joinRoom should emit join event with correct parameters', () => {
        document.getElementById('join-username').value = 'testUser';
        document.getElementById('join-room-header').textContent = 'Join Room: 1234';

        joinRoom();

        expect(mockSocket.emit).toHaveBeenCalledWith('join', {
            username: 'testUser',
            roomId: '1234',
            isScrumMaster: false,
            isVoter: true
        });
    });

    test.skip('startVoting should emit start_voting event with correct parameters', () => {
        document.getElementById('story-input').value = 'Test Story';
        document.getElementById('room-display').textContent = '1234';

        startVoting();

        expect(mockSocket.emit).toHaveBeenCalledWith('start_voting', {
            roomId: '1234',
            story: 'Test Story'
        });
    });

    test('vote should emit vote event with correct parameters', () => {
        document.getElementById('user-display').textContent = 'testUser';
        document.getElementById('room-display').textContent = '1234';
        state.isStoryActive = true;

        const cardElement = document.createElement('div');
        cardElement.dataset.value = '5';

        vote('5', cardElement);

        expect(mockSocket.emit).toHaveBeenCalledWith('vote', {
            username: 'testUser',
            roomId: '1234',
            value: '5'
        });
    });

    test('revealVotes should emit reveal_votes event with correct parameters', () => {
        document.getElementById('room-display').textContent = '1234';

        revealVotes();

        expect(mockSocket.emit).toHaveBeenCalledWith('reveal_votes', {
            roomId: '1234'
        });
    });
});