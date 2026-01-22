/**
 * Jest test setup for CubeJS diagnostic system
 * Configures property-based testing with fast-check and common test utilities
 */

import * as fc from 'fast-check'

// Configure fast-check for property-based testing
// Minimum 100 iterations per property test as specified in requirements
fc.configureGlobal({
  numRuns: 100,
  verbose: true,
  seed: 42, // Fixed seed for reproducible tests
  endOnFailure: true
})

// Global test timeout for property-based tests
jest.setTimeout(30000)

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Test utilities for property-based testing
export const testConfig = {
  propertyTestRuns: 100,
  timeout: 30000,
  seed: 42
}

// Export fast-check for use in tests
export { fc }