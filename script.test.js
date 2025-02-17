// Set up TextEncoder/Decoder first
const util = require('util');
global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;

// Then import other dependencies
const { JSDOM } = require('jsdom');

// Mock socket object
const mockSocket = {
    emit: jest.fn(),
    on: jest.fn()
};

// Mock socket.io-client
jest.mock('socket.io-client', () => {
    return jest.fn(() => mockSocket);
});

// Now import your application code
const { createRoom, joinRoom, startVoting, vote, revealVotes, init, state, CARD_VALUES } = require('./script');

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
        global.alert = jest.fn();

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
        state.isScrumMaster = false;
        state.isVoter = false;
        state.isStoryActive = false;
        state.votes.clear();
    });

    afterAll(() => {
        dom.window.close();
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
        expect(state.isScrumMaster).toBe(true);
    });

    test('createRoom should alert if username is empty', () => {
      document.getElementById('create-username').value = ''; //Empty username

      createRoom();

      expect(global.alert).toHaveBeenCalledWith('Please enter a username');
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('joinRoom should emit join event with correct parameters', () => {
        // Set necessary DOM values *after* init()
        document.getElementById('join-username').value = 'testUser';
        document.getElementById('join-room-header').textContent = 'Join Room: 1234';

        joinRoom();

        expect(mockSocket.emit).toHaveBeenCalledWith('join', {
            username: 'testUser',
            roomId: '1234',
            isScrumMaster: false,
            isVoter: true
        });
         expect(state.isVoter).toBe(true);
    });

    test('startVoting should emit start_voting event with correct parameters and change button text', () => {
        document.getElementById('story-input').value = 'Test Story';
        document.getElementById('room-display').textContent = '1234';
        const startVotingButton = document.getElementById('start-voting-button');
        startVotingButton.textContent = 'Start Voting';

        startVoting();

        expect(mockSocket.emit).toHaveBeenCalledWith('start_voting', {
            roomId: '1234',
            story: 'Test Story'
        });
        expect(startVotingButton.textContent).toBe('Cancel'); // Check button text change
        expect(document.getElementById('story-input').disabled).toBe(true);
    });

    test('startVoting should not emit if story is empty', () => {
      document.getElementById('story-input').value = '';
      document.getElementById('room-display').textContent = '1234';
      document.getElementById('start-voting-button').textContent = 'Start Voting';

      startVoting();
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Please enter a user story before starting the vote.');
    });

    test('startVoting should cancel voting', () => {
        document.getElementById('story-input').value = 'Test Story';
        document.getElementById('room-display').textContent = '1234';
        const startVotingButton = document.getElementById('start-voting-button');
        startVotingButton.textContent = 'Cancel'; // Set the button to "Cancel" state

        startVoting();

        expect(mockSocket.emit).toHaveBeenCalledWith('cancel_voting', { roomId: '1234' });
        expect(startVotingButton.textContent).toBe('Start Voting'); // Check button text change back
        expect(document.getElementById('story-input').disabled).toBe(false);
    });


    test('vote should emit vote event with correct parameters', () => {
        document.getElementById('user-display').textContent = 'testUser';
        document.getElementById('room-display').textContent = '1234';
        state.isStoryActive = true;

        const cardElement = document.createElement('div');
        cardElement.dataset.value = '5';
        cardElement.classList.add('card');
        document.getElementById('cards').appendChild(cardElement);

        vote('5', cardElement);

        expect(mockSocket.emit).toHaveBeenCalledWith('vote', {
            username: 'testUser',
            roomId: '1234',
            value: '5'
        });
        expect(cardElement.classList.contains('selected')).toBe(true);

    });
    test('vote should not emit if story is not active', () => {
        document.getElementById('user-display').textContent = 'testUser';
        document.getElementById('room-display').textContent = '1234';
        state.isStoryActive = false; // Ensure story is not active
        global.alert = jest.fn(); // Mock alert
        const cardElement = document.createElement('div');
        cardElement.dataset.value = '5';
        vote('5', cardElement);

        expect(mockSocket.emit).not.toHaveBeenCalled(); // Should not emit
        expect(global.alert).toHaveBeenCalledWith('Waiting for a story to be submitted before voting can begin.');
    });

    test('revealVotes should emit reveal_votes event with correct parameters', () => {
        document.getElementById('room-display').textContent = '1234';

        revealVotes();

        expect(mockSocket.emit).toHaveBeenCalledWith('reveal_votes', {
            roomId: '1234'
        });
    });
});