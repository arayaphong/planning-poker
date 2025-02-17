// test-setup.test.js

// Set up TextEncoder and TextDecoder first
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Now we can safely require other dependencies
const { JSDOM } = require('jsdom');
const express = require('express');

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    referrer: 'http://localhost',
    contentType: 'text/html',
    includeNodeLocations: true,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
});

// Set up the global environment to mimic a browser
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.history = dom.window.history;

// Create event emitter for socket events
class SocketEventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(...args));
        }
    }
}

// Create shared event bus for client-server communication
const eventBus = new SocketEventEmitter();

// Mock Socket.IO client
const mockClientSocket = {
    on: jest.fn((event, callback) => eventBus.on(event, callback)),
    emit: jest.fn((event, ...args) => {
        // When client emits, server listeners should receive
        if (mockServerSocket.listeners[event]) {
            mockServerSocket.listeners[event].forEach(cb => cb(...args));
        }
    }),
    disconnect: jest.fn(),
    connected: true,
    id: 'client-socket-id',
    listeners: {}
};

// Mock Socket.IO server socket (individual connection)
const mockServerSocket = {
    on: jest.fn((event, callback) => {
        if (!mockServerSocket.listeners[event]) {
            mockServerSocket.listeners[event] = [];
        }
        mockServerSocket.listeners[event].push(callback);
    }),
    emit: jest.fn((event, ...args) => {
        // When server emits, client listeners should receive
        eventBus.emit(event, ...args);
    }),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    id: 'server-socket-id',
    listeners: {}
};

// Mock Socket.IO server
const mockIO = {
    on: jest.fn((event, callback) => {
        if (event === 'connection') {
            callback(mockServerSocket);
        }
    }),
    emit: jest.fn(),
    close: jest.fn(cb => cb && cb()),
    sockets: {
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis()
    }
};

// Set up mocks
jest.mock('socket.io', () => ({
    Server: jest.fn(() => mockIO)
}));

jest.mock('socket.io-client', () => ({
    io: jest.fn(() => mockClientSocket)
}));

describe('Your Test Suite', () => {
    let io;
    let clientSocket;
    let serverSocket;

    beforeEach(() => {
        // Clear all mocks and listeners
        jest.clearAllMocks();
        mockServerSocket.listeners = {};
        mockClientSocket.listeners = {};

        // Initialize Socket.IO server
        const { Server } = require('socket.io');
        io = new Server();

        // Initialize Socket.IO client
        const { io: Client } = require('socket.io-client');
        clientSocket = Client('http://localhost');

        // Set up server socket
        serverSocket = mockServerSocket;
    });

    afterEach(() => {
        io.close();
        clientSocket.disconnect();
    });

    test('should handle DOM manipulation', () => {
        const div = document.createElement('div');
        div.innerHTML = 'Test content';
        document.body.appendChild(div);
        expect(document.body.innerHTML).toContain('Test content');
    });

    test('should handle socket communication', () => {
        const testData = { message: 'Hello!' };
        let receivedData = null;

        // Set up server listener
        serverSocket.on('test event', (data) => {
            receivedData = data;
        });

        // Emit from client
        clientSocket.emit('test event', testData);

        // Verify the data was received
        expect(receivedData).toEqual(testData);
        expect(serverSocket.on).toHaveBeenCalledWith('test event', expect.any(Function));
        expect(clientSocket.emit).toHaveBeenCalledWith('test event', testData);
    });

    test('should handle DOM and socket interaction', () => {
        let socketData = null;

        // Set up server listener
        serverSocket.on('button clicked', (data) => {
            socketData = data;
        });

        // Create DOM button and handler
        const button = document.createElement('button');
        button.id = 'testButton';
        document.body.appendChild(button);

        button.addEventListener('click', () => {
            clientSocket.emit('button clicked', { clicked: true });
        });

        // Simulate click
        button.click();

        // Verify the interaction
        expect(socketData).toEqual({ clicked: true });
        expect(clientSocket.emit).toHaveBeenCalledWith('button clicked', { clicked: true });
        expect(serverSocket.on).toHaveBeenCalledWith('button clicked', expect.any(Function));
    });
});