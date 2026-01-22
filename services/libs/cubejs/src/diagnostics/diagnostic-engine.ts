/**
 * DiagnosticEngine - Orchestrates comprehensive CubeJS system validation
 * 
 * This class coordinates all diagnostic components to provide a complete
 * health assessment of the CubeJS system, including schema validation,
 * database connectivity, query processing, and configuration validation.
 */

import { Pool } from 'pg'
import {
  DiagnosticEngine as IDiagnosticEngine,
  SchemaValidator as ISchemaValidator,
  ConnectionTester,
  QueryValidator as IQueryValidator,
  ErrorHandler as IErrorHandler,
  ConfigurationValidator as IConfigurationValidator,
  SchemaDriftDetector,
  ConnectionPoolMonitor
} from './interfaces'

import {
  DiagnosticReport,
  SchemaValidationResult,
  ConnectionTestResult,
  QueryValidationResult,
  CubeQuery,
  SchemaIssue,
  ConnectivityIssue,
  QueryIssue,
  DatabaseConfig
} from './types'

import { SchemaValidator } from './schema-validator'
import { PostgreSQLConnectionTester } from './connection-tester'
import { QueryValidator } from './query-validator'
import { ErrorHandler } from './error-handler'
import { ConfigurationValidator } from './configuration-validator'
import { SchemaDriftDetectorImpl } from './schema-drift-detector'
import { ConnectionPoolMonitorImpl } from './connection-pool-monitor'
import { createDiagnosticLogger } from './logging'
import { getServiceChildLogger } from '@gitmesh/logging'

/**
 * Main diagnostic engine implementation that orchestrates all validation components
 */
export class DiagnosticEngineImpl implements IDiagnosticEngine {
  private logger = createDiagnosticLogger()
  
  private schemaValidator: ISchemaValidator
  private connectionTester: ConnectionTester
  private queryValidator: IQueryValidator
  private errorHandler: IErrorHandler
  private configurationValidator: IConfigurationValidator
  private schemaDriftDetector: SchemaDriftDetector
  private connectionPoolMonitor: ConnectionPoolMonitor
  private databasePool: Pool | null = null

  constructor() {
    // Initialize components that don't require external dependencies first
    this.errorHandler = new ErrorHandler()
    this.queryValidator = new QueryValidator()
    this.configurationValidator = new ConfigurationValidator()
    
    // Initialize database-dependent components lazily
    this.schemaValidator = null as any
    this.connectionTester = null as any
    this.schemaDriftDetector = null as any
    this.connectionPoolMonitor = null as any
  }

  /**
   * Initialize database-dependent components
   */
  private async initializeDatabaseComponents(): Promise<void> {
    if (this.databasePool) {
      return // Already initialized
    }

    try {
      // Create database configuration from environment variables
      const dbConfig: DatabaseConfig = {
        host: process.env.CUBEJS_DB_HOST || 'localhost',
        port: parseInt(process.env.CUBEJS_DB_PORT || '5432'),
        database: process.env.CUBEJS_DB_NAME || 'devspace',
        user: process.env.CUBEJS_DB_USER || 'devspace',
        password: process.env.CUBEJS_DB_PASS || 'devspace',
        ssl: process.env.CUBEJS_DB_SSL === 'true'
      }

      // Create database pool
      this.databasePool = new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl: dbConfig.ssl,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })

      // Initialize database-dependent components
      this.connectionTester = new PostgreSQLConnectionTester(dbConfig)
      this.schemaValidator = new SchemaValidator(this.databasePool)
      
      const logger = getServiceChildLogger('cubejs-diagnostics')
      this.schemaDriftDetector = new SchemaDriftDetectorImpl(this.databasePool, [], logger)
      this.connectionPoolMonitor = new ConnectionPoolMonitorImpl(this.databasePool, logger)

    } catch (error) {
      this.logger.logDiagnosticWarning('Failed to initialize database components', { error: error.message })
      throw error
    }
  }

  /**
   * Runs a comprehensive diagnostic check of the entire CubeJS system
   * @returns Promise<DiagnosticReport> Complete diagnostic report with findings and recommendations
   */
  async runFullDiagnosis(): Promise<DiagnosticReport> {
    const startTime = Date.now()
    const correlationId = this.logger.startDiagnosticSession()
    this.logger.logDiagnosticInfo('Starting full CubeJS diagnostic check')

    const report: DiagnosticReport = {
      timestamp: new Date(),
      overallStatus: 'healthy',
      schemaIssues: [],
      connectivityIssues: [],
      queryIssues: [],
      recommendations: []
    }

    try {
      // Initialize database components first
      await this.initializeDatabaseComponents()

      // 1. Configuration validation
      this.logger.logDiagnosticInfo('Validating CubeJS configuration')
      const configResult = await this.configurationValidator.validateConfiguration()
      if (!configResult.isValid) {
        report.connectivityIssues.push(...configResult.errors.map(error => ({
          type: 'configuration_error' as const,
          severity: 'high' as const,
          message: error,
          suggestion: 'Review and fix configuration issues before proceeding'
        })))
      }

      // 2. Database connectivity validation
      this.logger.logDiagnosticInfo('Testing database connectivity')
      const connectivityResult = await this.testConnectivity()
      if (!connectivityResult.isConnected) {
        report.connectivityIssues.push({
          type: 'connection_failure',
          severity: 'critical',
          message: `Database connection failed: ${connectivityResult.error}`,
          suggestion: 'Check database connection parameters and ensure PostgreSQL is running'
        })
      }

      // 3. Schema validation
      this.logger.logDiagnosticInfo('Validating cube schemas')
      const schemaResults = await this.validateSchemas()
      for (const result of schemaResults) {
        if (!result.isValid) {
          report.schemaIssues.push(...result.errors.map(error => ({
            type: 'schema_error' as const,
            cubeName: result.cubeName,
            severity: this.mapErrorSeverity(error.type),
            message: error.message,
            suggestion: error.suggestion
          })))
        }
      }

      // 4. Schema drift detection
      this.logger.logDiagnosticInfo('Detecting schema drift')
      const driftReport = await this.schemaDriftDetector.detectSchemaDrift()
      if (driftReport.totalDrifts > 0) {
        report.schemaIssues.push(...driftReport.drifts.map(drift => ({
          type: 'schema_error' as const,
          cubeName: drift.cubeName,
          severity: drift.severity,
          message: drift.description,
          suggestion: drift.recommendation
        })))
      }

      // 5. Connection pool health
      this.logger.logDiagnosticInfo('Checking connection pool health')
      const poolHealth = await this.connectionPoolMonitor.getPoolHealth()
      if (poolHealth.status !== 'healthy') {
        report.connectivityIssues.push(...poolHealth.issues.map(issue => ({
          type: 'connection_failure' as const,
          severity: issue.severity,
          message: issue.description,
          suggestion: issue.recommendation
        })))
      }

      // 6. Dashboard query validation
      this.logger.logDiagnosticInfo('Testing dashboard queries')
      const dashboardQueries = await this.generateTestQueries()
      const queryResults = await this.validateQueries(dashboardQueries)
      for (const result of queryResults) {
        if (!result.isValid) {
          report.queryIssues.push(...result.errors.map(error => ({
            type: 'query_validation_error' as const,
            severity: 'medium' as const,
            message: error,
            suggestion: 'Review query structure and security context'
          })))
        }
      }

      // 7. Generate overall status and recommendations
      report.overallStatus = this.determineOverallStatus(report)
      report.recommendations = await this.generateRecommendations(report)

      const duration = Date.now() - startTime
      this.logger.logDiagnosticInfo(`Full diagnostic completed in ${duration}ms`, {
        overallStatus: report.overallStatus,
        schemaIssues: report.schemaIssues.length,
        connectivityIssues: report.connectivityIssues.length,
        queryIssues: report.queryIssues.length
      })

      return report

    } catch (error) {
      this.logger.logDiagnosticWarning('Diagnostic check failed', { error: error.message })
      
      report.overallStatus = 'critical'
      report.connectivityIssues.push({
        type: 'configuration_error',
        severity: 'critical',
        message: `Diagnostic engine failure: ${error.message}`,
        suggestion: 'Check system configuration and logs for detailed error information'
      })
      
      return report
    } finally {
      this.logger.endDiagnosticSession()
    }
  }

  /**
   * Validates all cube schema definitions against database structure
   * @returns Promise<SchemaValidationResult[]> Array of validation results for all cubes
   */
  async validateSchemas(): Promise<SchemaValidationResult[]> {
    this.logger.logDiagnosticInfo('Starting schema validation for all cubes')
    
    try {
      await this.initializeDatabaseComponents()
      const results = await this.schemaValidator.validateAllCubes()
      
      this.logger.logDiagnosticInfo(`Schema validation completed`, {
        totalCubes: results.length,
        validCubes: results.filter(r => r.isValid).length,
        invalidCubes: results.filter(r => !r.isValid).length
      })
      
      return results
    } catch (error) {
      this.logger.logDiagnosticWarning('Schema validation failed', { error: error.message })
      throw error
    }
  }

  /**
   * Tests database connectivity and configuration
   * @returns Promise<ConnectionTestResult> Connection test results
   */
  async testConnectivity(): Promise<ConnectionTestResult> {
    this.logger.logDiagnosticInfo('Testing database connectivity')
    
    try {
      await this.initializeDatabaseComponents()
      const result = await this.connectionTester.testDatabaseConnection()
      
      this.logger.logDiagnosticInfo('Database connectivity test completed', {
        connected: result.isConnected,
        connectionTime: result.connectionTime,
        postgresVersion: result.postgresVersion,
        availableTables: result.availableTables.length
      })
      
      return result
    } catch (error) {
      this.logger.logDiagnosticWarning('Connectivity test failed', { error: error.message })
      throw error
    }
  }

  /**
   * Validates an array of cube queries
   * @param queries Array of CubeQuery objects to validate
   * @returns Promise<QueryValidationResult[]> Array of query validation results
   */
  async validateQueries(queries: CubeQuery[]): Promise<QueryValidationResult[]> {
    this.logger.logDiagnosticInfo(`Validating ${queries.length} queries`)
    
    const results: QueryValidationResult[] = []
    
    for (const query of queries) {
      try {
        // Generate a test security context for validation
        const testContext = {
          tenantId: 'test-tenant',
          segments: ['test-segment'],
          userId: 'test-user'
        }
        
        const result = await this.queryValidator.validateQuery(query, testContext)
        results.push(result)
      } catch (error) {
        this.logger.logQueryValidationError(
          'Query validation failed',
          query,
          { tenantId: 'test-tenant', segments: ['test-segment'] },
          error.message
        )
        
        results.push({
          isValid: false,
          errors: [error.message],
          warnings: []
        })
      }
    }
    
    this.logger.logDiagnosticInfo('Query validation completed', {
      totalQueries: queries.length,
      validQueries: results.filter(r => r.isValid).length,
      invalidQueries: results.filter(r => !r.isValid).length
    })
    
    return results
  }

  /**
   * Generates test queries for dashboard validation
   * @returns Promise<CubeQuery[]> Array of test queries
   */
  private async generateTestQueries(): Promise<CubeQuery[]> {
    return [
      // Organizations.count query
      {
        measures: ['Organizations.count']
      },
      
      // Members.count with filters
      {
        measures: ['Members.count'],
        filters: [
          {
            member: 'Members.isOrganization',
            operator: 'equals',
            values: ['true']
          }
        ]
      },
      
      // Members.count with isTeamMember filter
      {
        measures: ['Members.count'],
        filters: [
          {
            member: 'Members.isTeamMember',
            operator: 'equals',
            values: ['true']
          }
        ]
      },
      
      // Activities.count with time dimension
      {
        measures: ['Activities.count'],
        timeDimensions: [
          {
            dimension: 'Activities.timestamp',
            granularity: 'day',
            dateRange: ['2024-01-01', '2024-12-31']
          }
        ]
      },
      
      // Activities with sentiment and platform dimensions
      {
        measures: ['Activities.count'],
        dimensions: ['Activities.sentiment', 'Activities.platform']
      }
    ]
  }

  /**
   * Maps schema error types to severity levels
   * @param errorType The type of schema error
   * @returns Severity level
   */
  private mapErrorSeverity(errorType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorType) {
      case 'missing_table':
        return 'critical'
      case 'missing_column':
        return 'high'
      case 'invalid_join':
        return 'medium'
      case 'syntax_error':
        return 'high'
      default:
        return 'medium'
    }
  }

  /**
   * Determines overall system status based on diagnostic findings
   * @param report The diagnostic report
   * @returns Overall status
   */
  private determineOverallStatus(report: DiagnosticReport): 'healthy' | 'degraded' | 'critical' {
    const criticalIssues = [
      ...report.schemaIssues.filter(i => i.severity === 'critical'),
      ...report.connectivityIssues.filter(i => i.severity === 'critical'),
      ...report.queryIssues.filter(i => i.severity === 'critical')
    ]
    
    if (criticalIssues.length > 0) {
      return 'critical'
    }
    
    const highIssues = [
      ...report.schemaIssues.filter(i => i.severity === 'high'),
      ...report.connectivityIssues.filter(i => i.severity === 'high'),
      ...report.queryIssues.filter(i => i.severity === 'high')
    ]
    
    if (highIssues.length > 0) {
      return 'degraded'
    }
    
    return 'healthy'
  }

  /**
   * Generates recommendations based on diagnostic findings
   * @param report The diagnostic report
   * @returns Array of recommendations
   */
  private async generateRecommendations(report: DiagnosticReport): Promise<string[]> {
    const recommendations: string[] = []
    
    // Schema-related recommendations
    if (report.schemaIssues.length > 0) {
      const criticalSchemaIssues = report.schemaIssues.filter(i => i.severity === 'critical')
      if (criticalSchemaIssues.length > 0) {
        recommendations.push('CRITICAL: Fix missing table references in cube definitions immediately')
      }
      
      const missingColumns = report.schemaIssues.filter(i => i.message.includes('missing column'))
      if (missingColumns.length > 0) {
        recommendations.push('Update cube definitions to match current database schema')
      }
    }
    
    // Connectivity-related recommendations
    if (report.connectivityIssues.length > 0) {
      const connectionFailures = report.connectivityIssues.filter(i => i.type === 'connection_failure')
      if (connectionFailures.length > 0) {
        recommendations.push('Verify database connection parameters and PostgreSQL service status')
      }
      
      const configErrors = report.connectivityIssues.filter(i => i.type === 'configuration_error')
      if (configErrors.length > 0) {
        recommendations.push('Review and fix CubeJS configuration before proceeding')
      }
    }
    
    // Query-related recommendations
    if (report.queryIssues.length > 0) {
      recommendations.push('Review dashboard query structures and security context validation')
    }
    
    // General recommendations based on overall status
    if (report.overallStatus === 'critical') {
      recommendations.unshift('IMMEDIATE ACTION REQUIRED: System has critical issues that prevent normal operation')
    } else if (report.overallStatus === 'degraded') {
      recommendations.unshift('System performance may be impacted - address high-priority issues')
    } else {
      recommendations.push('System is healthy - continue regular monitoring')
    }
    
    return recommendations
  }
}

// Export the implementation
export { DiagnosticEngineImpl as DiagnosticEngine }