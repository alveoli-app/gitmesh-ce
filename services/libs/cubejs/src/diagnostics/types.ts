/**
 * Core diagnostic types and interfaces for CubeJS error diagnosis and validation
 */

// Schema validator interface for validating cube definitions against database structure
export interface SchemaValidator {
  validateCube(cubeName: string): Promise<CubeValidationResult>
  validateAllCubes(): Promise<CubeValidationResult[]>
  checkMaterializedViews(): Promise<MaterializedViewStatus[]>
}

// Security Context Types
export interface SecurityContext {
  tenantId: string
  segments?: string[]
  userId?: string
  permissions?: string[]
}

// Cube Query Types
export interface TimeDimension {
  dimension: string
  granularity?: string
  dateRange?: string[] | string
}

export interface Filter {
  member: string
  operator: string
  values: any[]
}

export interface CubeQuery {
  measures: string[]
  dimensions?: string[]
  timeDimensions?: TimeDimension[]
  filters?: Filter[]
  segments?: string[]
  limit?: number
  offset?: number
}

// Schema Validation Types
export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
}

export interface MaterializedViewInfo {
  viewName: string
  exists: boolean
  columns: ColumnInfo[]
  lastRefresh?: Date
  rowCount?: number
}

export interface SchemaError {
  type: 'missing_table' | 'missing_column' | 'invalid_join' | 'syntax_error'
  cubeName: string
  field: string
  message: string
  suggestion: string
}

export interface SchemaWarning {
  type: 'deprecated_field' | 'performance_concern' | 'naming_convention'
  cubeName: string
  field: string
  message: string
}

export interface CubeValidationResult {
  cubeName: string
  isValid: boolean
  errors: SchemaError[]
  warnings: SchemaWarning[]
  tableName: string
  missingColumns: string[]
  invalidJoins: string[]
}

export interface MaterializedViewStatus {
  viewName: string
  exists: boolean
  accessible: boolean
  columnCount: number
  lastChecked: Date
}

// Connection Testing Types
export interface ConnectionResult {
  isConnected: boolean
  connectionTime: number
  error?: string
  postgresVersion: string
  availableTables: string[]
}

export interface ViewAccessResult {
  viewName: string
  accessible: boolean
  error?: string
  columnCount: number
}

export interface ConfigValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  checkedItems: string[]
}

// Query Validation Types
export interface SecurityContextResult {
  isValid: boolean
  hasTenantId: boolean
  hasSegments: boolean
  errors: string[]
}

export interface QueryValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedQuery?: CubeQuery
}

export interface DashboardQueryResult {
  queryName: string
  success: boolean
  responseTime: number
  error?: string
  result?: any
}

// Error Handling Types
export interface ErrorResponse {
  statusCode: number
  message: string
  details: string
  suggestions: string[]
  debugInfo?: any
}

export interface StructuredError {
  timestamp: Date
  level: 'error' | 'warn' | 'info'
  category: 'schema' | 'query' | 'database' | 'security'
  message: string
  details: {
    query?: CubeQuery
    securityContext?: SecurityContext
    stackTrace?: string
    databaseError?: string
    suggestions?: string[]
  }
  correlationId: string
}

export interface ErrorReport {
  generatedAt: Date
  totalErrors: number
  errorsByCategory: Record<string, number>
  recentErrors: StructuredError[]
  recommendations: string[]
}

// Diagnostic Engine Types
export interface SchemaIssue {
  type: 'schema_error' | 'schema_warning'
  cubeName: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  suggestion: string
}

export interface ConnectivityIssue {
  type: 'connection_failure' | 'view_access_denied' | 'configuration_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  suggestion: string
}

export interface QueryIssue {
  type: 'query_validation_error' | 'security_context_error' | 'performance_issue'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  suggestion: string
}

export interface DiagnosticReport {
  timestamp: Date
  overallStatus: 'healthy' | 'degraded' | 'critical'
  schemaIssues: SchemaIssue[]
  connectivityIssues: ConnectivityIssue[]
  queryIssues: QueryIssue[]
  recommendations: string[]
}

// Configuration Types
export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
  poolSize?: number
}

export interface SecurityConfig {
  jwtSecret: string
  jwtAlgorithm?: string
  contextToAppId?: (context: SecurityContext) => string
  contextToOrgId?: (context: SecurityContext) => string
}

export interface CubeConfig {
  name: string
  sql: string
  measures?: Record<string, any>
  dimensions?: Record<string, any>
  joins?: Record<string, any>
}

export interface LoggingConfig {
  level: string
  structured: boolean
  correlationId: boolean
}

export interface CubeJSConfig {
  database: DatabaseConfig
  security: SecurityConfig
  cubes: CubeConfig[]
  logging: LoggingConfig
}

// Schema Drift Detection Types
export interface SchemaDrift {
  cubeName: string
  driftType: 'table_missing' | 'column_missing' | 'column_type_changed' | 'column_added' | 'table_structure_changed'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  expectedValue: string
  actualValue: string
  recommendation: string
  detectedAt: Date
}

export interface SchemaDriftReport {
  timestamp: Date
  totalDrifts: number
  driftsBySeverity: Record<string, number>
  driftsByType: Record<string, number>
  drifts: SchemaDrift[]
  recommendations: string[]
  overallStatus: 'no_drift' | 'minor_drift' | 'major_drift' | 'critical_drift'
}

export interface SchemaSnapshot {
  timestamp: Date
  cubeName: string
  tableName: string
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  constraints: ConstraintInfo[]
  checksum: string
}

export interface IndexInfo {
  name: string
  columns: string[]
  unique: boolean
  type: string
}

export interface ConstraintInfo {
  name: string
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null'
  columns: string[]
  referencedTable?: string
  referencedColumns?: string[]
}

// Connection Pool Monitoring Types
export interface ConnectionPoolMetrics {
  timestamp: Date
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingConnections: number
  maxConnections: number
  connectionErrors: number
  averageConnectionTime: number
  averageQueryTime: number
  slowQueries: number
  poolUtilization: number
}

export interface ConnectionLifecycleEvent {
  timestamp: Date
  eventType: 'connection_created' | 'connection_acquired' | 'connection_released' | 'connection_destroyed' | 'connection_error'
  connectionId: string
  duration?: number
  error?: string
  metadata?: Record<string, any>
}

export interface ConnectionPoolHealth {
  timestamp: Date
  status: 'healthy' | 'degraded' | 'critical'
  metrics: ConnectionPoolMetrics
  issues: ConnectionPoolIssue[]
  recommendations: string[]
}

export interface ConnectionPoolIssue {
  type: 'high_utilization' | 'connection_leaks' | 'slow_queries' | 'connection_errors' | 'pool_exhaustion'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  recommendation: string
  detectedAt: Date
  count: number
}