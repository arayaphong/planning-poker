// jest.config.js
module.exports = {
    testEnvironment: 'jsdom',
    setupFiles: ['./jest.setup.js'],
    moduleDirectories: ['node_modules', 'src'],
    testMatch: ['<rootDir>/*.test.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '*.js',
        '!dom.js',
        '!*.test.js',
        '!*.config.js',
        '!*.setup.js'
    ],
    testTimeout: 10000,
    verbose: true,
    globals: {
        TextEncoder: require('util').TextEncoder,
        TextDecoder: require('util').TextDecoder
    }
};
