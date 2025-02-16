// jest.config.js
module.exports = {
    testEnvironment: 'jsdom',
    // setupFiles: ['<rootDir>/dom.js'],
    moduleDirectories: ['node_modules', 'src'],
    testMatch: ['<rootDir>/*.test.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '*.js',
        '!dom.js',
        '!*.test.js'
    ]
};