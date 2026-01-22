/**
 * CubeJS Diagnostic System
 * 
 * This module provides comprehensive diagnostic capabilities for CubeJS API error diagnosis,
 * including schema validation, connection testing, query validation, and structured logging.
 */

// Core interfaces
export * from './interfaces'

// Type definitions
export * from './types'

// Logging utilities
export * from './logging'

// Connection testing with retry logic
export * from './connection-tester'
export * from './retry-logic'

// Schema validation and correction
export * from './schema-validator'
export * from './schema-corrector'

// Schema drift detection
export * from './schema-drift-detector'

// Connection pool monitoring
export * from './connection-pool-monitor'

// Query validation
export * from './query-validator'

// Configuration validation
export * from './configuration-validator'

// Error handling and templates
export * from './error-handler'
export * from './error-templates'

// Diagnostic engine orchestration
export * from './diagnostic-engine'

// Re-export commonly used types for convenience
export type {
  DiagnosticEngine,
  SchemaValidator,
  ConnectionTester,
  QueryValidator,
  ErrorHandler,
  ConfigurationValidator,
  SchemaDriftDetector,
  ConnectionPoolMonitor
} from './interfaces'

export type {
  DiagnosticReport,
  CubeQuery,
  SecurityContext,
  StructuredError,
  ErrorResponse,
  SchemaDriftReport,
  SchemaSnapshot,
  SchemaDrift,
  ConnectionPoolMetrics,
  ConnectionPoolHealth,
  ConnectionLifecycleEvent
} from './types'