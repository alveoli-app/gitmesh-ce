/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The root directory that Jest should scan for tests and modules within
  rootDir: './src',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/__tests__/**/*.(test|spec).ts",
    "**/*.(test|spec).ts"
  ],
  
  // An array of file extensions your modules use
  moduleFileExtensions: [
    "ts",
    "tsx", 
    "js",
    "jsx",
    "json",
    "node"
  ],
  
  // A map from regular expressions to paths to transformers
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false,
  
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",
  
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/"
  ],
  
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  
  // The maximum amount of workers used to run your tests
  maxWorkers: "50%",
  
  // The number of seconds after which a test is considered as slow
  slowTestThreshold: 10
};

module.exports = config;
