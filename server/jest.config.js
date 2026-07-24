module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  verbose: true,
  // US-28: server/middleware/error-handler.js now persists every handled
  // error to app_errors via the real Supabase client (server/db/client.js).
  // Redirect that one module to a stub everywhere in the test suite so
  // error-response test cases (there are many, across nearly every route
  // test file) don't make real network calls to the fake project URL in
  // tests/setup.js. See tests/__mocks__/db-client.js.
  moduleNameMapper: {
    '(.*)[\\\\/]db[\\\\/]client$': '<rootDir>/tests/__mocks__/db-client.js',
  },
};
