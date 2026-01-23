// Test setup file
// Set development environment to avoid AWS dependencies
process.env.NODE_ENV = 'development';
process.env.IS_DEV_ENV = 'true';

// Increase test timeout for classification operations
jest.setTimeout(30000);