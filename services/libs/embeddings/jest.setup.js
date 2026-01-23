// Jest setup file for embeddings library
global.console = {
  ...console,
  // Suppress debug logs during tests
  debug: jest.fn(),
};