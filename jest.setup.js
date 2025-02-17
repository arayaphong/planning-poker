// jest.setup.js
const { TextEncoder, TextDecoder } = require('util');
const { URL } = require('url');

// Set up global encoders
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.URL = URL;

// Set up WebSocket mock
global.WebSocket = class MockWebSocket {
    constructor() {
        this.CLOSED = 3;
        this.CLOSING = 2;
        this.CONNECTING = 0;
        this.OPEN = 1;
    }
    addEventListener() { }
    removeEventListener() { }
    close() { }
};

// Set up XMLHttpRequest mock
global.XMLHttpRequest = class MockXMLHttpRequest {
    open() { }
    send() { }
    setRequestHeader() { }
};

// Set up other browser globals
Object.defineProperty(global, 'location', {
    value: {
        origin: 'http://localhost',
        protocol: 'http:',
        host: 'localhost',
        pathname: '/',
        search: '',
        hash: ''
    },
    writable: true
});

// Set up performance mock
global.performance = {
    now: () => Date.now(),
    timing: {},
    getEntries: () => [],
    mark: () => { },
    measure: () => { }
};

// Set up requestAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id);
