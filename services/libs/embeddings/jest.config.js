module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  moduleNameMapping: {
    '^@gitmesh/(.*)$': '<rootDir>/../$1/src',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};