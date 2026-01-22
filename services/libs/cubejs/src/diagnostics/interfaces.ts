/**
 * Core diagnostic interfaces for CubeJS error diagnosis and validation system
 */

import {
  DiagnosticReport,
  SchemaValidationResult,
  ConnectionTestResult,
  QueryValidationResult,
  CubeValidationResult,
  MaterializedViewStatus,
  ConnectionResult,
  ConfigValidationResult,
  ViewAccessResult,
  SecurityContextResult,
  DashboardQueryResult,
  ErrorResponse,
  ErrorReport,
  StructuredError,
  CubeQuery,
  SecurityContext,
  SchemaDriftReport,
  SchemaSnapshot,
  SchemaDrift,
  ConnectionPoolMetrics,
  ConnectionPoolHealth,
  ConnectionLifecycleEvent
} from './types'

/**
 * Main diagnostic engine interface that orchestrates comprehensive system validation
 */
export interface DiagnosticEngine {
  /**
   * Runs a complete diagnostic check of the CubeJS system
   * @returns Promise<DiagnosticReport> Comprehensive diagnostic report
   */
  runFullDiagnosis(): Promise<DiagnosticReport>

  /**
   * Validates all cube schema definitions
   * @returns Promise<SchemaValidationResult[]> Array of schema validation results
   */
  validateSchemas(): Promise<SchemaValidationResult[]>

  /**
   * Tests database connectivity and configuration
   * @returns Promise<ConnectionTestResult> Connection test results
   */
  testConnectivity(): Promise<ConnectionTestResult>

  /**
   * Validates an array of cube queries
   * @param queries Array of CubeQuery objects to validate
   * @returns Promise<QueryValidationResult[]> Array of query validation results
   */
  validateQueries(queries: CubeQuery[]): Promise<QueryValidationResult[]>
}

/**
 * Schema validator interface for validating cube definitions against database structure
 */
export interface SchemaValidator {
  /**
   * Validates a specific cube definition
   * @param cubeName Name of the cube to validate
   * @returns Promise<CubeValidationResult> Validation result for the cube
   */
  validateCube(cubeName: string): Promise<CubeValidationResult>

  /**
   * Validates all cube definitions in the system
   * @returns Promise<CubeValidationResult[]> Array of validation results for all cubes
   */
  validateAllCubes(): Promise<CubeValidationResult[]>

  /**
   * Checks the status of all materialized views
   * @returns Promise<MaterializedViewStatus[]> Array of materialized view statuses
   */
  checkMaterializedViews(): Promise<MaterializedViewStatus[]>
}

/**
 * Connection tester interface for validating database connectivity and configuration
 */
export interface ConnectionTester {
  /**
   * Tests the database connection
   * @returns Promise<ConnectionResult> Connection test result
   */
  testDatabaseConnection(): Promise<ConnectionResult>

  /**
   * Validates the CubeJS configuration
   * @returns Promise<ConfigValidationResult> Configuration validation result
   */
  validateConfiguration(): Promise<ConfigValidationResult>

  /**
   * Checks access to all materialized views
   * @returns Promise<ViewAccessResult[]> Array of view access results
   */
  checkMaterializedViewAccess(): Promise<ViewAccessResult[]>
}

/**
 * Query validator interface for validating query structure and security context
 */
export interface QueryValidator {
  /**
   * Validates a cube query with its security context
   * @param query The CubeQuery to validate
   * @param context The SecurityContext for the query
   * @returns Promise<QueryValidationResult> Query validation result
   */
  validateQuery(query: CubeQuery, context: SecurityContext): Promise<QueryValidationResult>

  /**
   * Validates a security context
   * @param context The SecurityContext to validate
   * @returns Promise<SecurityContextResult> Security context validation result
   */
  validateSecurityContext(context: SecurityContext): Promise<SecurityContextResult>

  /**
   * Tests all known dashboard queries
   * @returns Promise<DashboardQueryResult[]> Array of dashboard query test results
   */
  testDashboardQueries(): Promise<DashboardQueryResult[]>
}

/**
 * Enhanced error handler interface for comprehensive error reporting and recovery
 */
export interface ErrorHandler {
  /**
   * Handles a query error and generates appropriate response
   * @param error The error that occurred
   * @param query The query that caused the error
   * @param context The security context when the error occurred
   * @returns ErrorResponse Structured error response
   */
  handleQueryError(error: Error, query: CubeQuery, context: SecurityContext): ErrorResponse

  /**
   * Logs a structured error with correlation ID and searchable fields
   * @param error The structured error to log
   */
  logStructuredError(error: StructuredError): void

  /**
   * Generates a comprehensive error report
   * @returns Promise<ErrorReport> Error report with statistics and recommendations
   */
  generateErrorReport(): Promise<ErrorReport>
}

/**
 * Configuration validator interface for validating CubeJS configuration
 */
export interface ConfigurationValidator {
  /**
   * Validates all CubeJS configuration aspects
   * @param options Configuration validation options
   * @returns Promise<ConfigValidationResult> Comprehensive validation result
   */
  validateConfiguration(options?: any): Promise<ConfigValidationResult>

  /**
   * Validates all required environment variables are present and valid
   * @returns Promise<any> Environment validation result
   */
  validateEnvironmentVariables(): Promise<any>

  /**
   * Validates JWT token generation and verification functionality
   * @returns Promise<any> JWT validation result
   */
  validateJWTFunctionality(): Promise<any>

  /**
   * Validates database connection parameters match the PostgreSQL service
   * @returns Promise<any> Database connection validation result
   */
  validateDatabaseConnectionParameters(): Promise<any>

  /**
   * Validates Docker volume mounts and file accessibility
   * @returns Promise<any> Volume mount validation result
   */
  validateVolumeMounts(): Promise<any>

  /**
   * Validates cube.js configuration file structure and content
   * @returns Promise<ConfigValidationResult> Configuration file validation result
   */
  validateCubeJSConfiguration(): Promise<ConfigValidationResult>

  /**
   * Generates a comprehensive configuration report
   * @returns Promise<any> Configuration report with status and recommendations
   */
  generateConfigurationReport(): Promise<any>
}

/**
 * Schema drift detector interface for monitoring database schema changes
 */
export interface SchemaDriftDetector {
  /**
   * Detects schema drift between cube definitions and actual database schema
   * @returns Promise<SchemaDriftReport> Comprehensive drift detection report
   */
  detectSchemaDrift(): Promise<SchemaDriftReport>

  /**
   * Creates a snapshot of the current database schema for a cube
   * @param cubeName Name of the cube to snapshot
   * @returns Promise<SchemaSnapshot> Schema snapshot
   */
  createSchemaSnapshot(cubeName: string): Promise<SchemaSnapshot>

  /**
   * Compares two schema snapshots to identify changes
   * @param previous Previous schema snapshot
   * @param current Current schema snapshot
   * @returns Promise<SchemaDrift[]> Array of detected schema drifts
   */
  compareSchemaSnapshots(previous: SchemaSnapshot, current: SchemaSnapshot): Promise<SchemaDrift[]>

  /**
   * Generates recommendations for resolving schema drift
   * @param drifts Array of detected schema drifts
   * @returns Promise<string[]> Array of recommendations
   */
  generateDriftRecommendations(drifts: SchemaDrift[]): Promise<string[]>
}

/**
 * Connection pool monitor interface for tracking connection pool health and performance
 */
export interface ConnectionPoolMonitor {
  /**
   * Gets current connection pool metrics
   * @returns Promise<ConnectionPoolMetrics> Current pool metrics
   */
  getPoolMetrics(): Promise<ConnectionPoolMetrics>

  /**
   * Gets connection pool health status
   * @returns Promise<ConnectionPoolHealth> Pool health assessment
   */
  getPoolHealth(): Promise<ConnectionPoolHealth>

  /**
   * Starts monitoring connection lifecycle events
   * @param callback Callback function to handle lifecycle events
   */
  startLifecycleMonitoring(callback: (event: ConnectionLifecycleEvent) => void): void

  /**
   * Stops monitoring connection lifecycle events
   */
  stopLifecycleMonitoring(): void

  /**
   * Optimizes connection pool configuration based on usage patterns
   * @returns Promise<any> Optimization recommendations
   */
  optimizePoolConfiguration(): Promise<any>

  /**
   * Generates a comprehensive pool performance report
   * @returns Promise<any> Pool performance report
   */
  generatePoolReport(): Promise<any>
}

// Type aliases for backward compatibility and convenience
export type SchemaValidationResult = CubeValidationResult[]
export type ConnectionTestResult = ConnectionResult