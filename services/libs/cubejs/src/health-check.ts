/**
 * CubeJS Health Check Integration
 * 
 * This module provides health check endpoints that integrate with the diagnostic engine
 * to provide comprehensive system health status including database connectivity,
 * schema validation, and query processing capabilities.
 */

import { DiagnosticEngine } from './diagnostics/diagnostic-engine'
import { DiagnosticReport } from './diagnostics/types'
import { createDiagnosticLogger } from './diagnostics/logging'

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: HealthCheckStatus
    schema: HealthCheckStatus
    queries: HealthCheckStatus
    configuration: HealthCheckStatus
  }
  diagnostics?: DiagnosticReport
  message: string
}

interface HealthCheckStatus {
  status: 'pass' | 'warn' | 'fail'
  message: string
  details?: any
}

/**
 * CubeJS Health Check Service
 */
export class CubeJSHealthCheck {
  private diagnosticEngine: DiagnosticEngine
  private logger = createDiagnosticLogger()
  private startTime: number

  constructor() {
    this.diagnosticEngine = new DiagnosticEngine()
    this.startTime = Date.now()
  }

  /**
   * Basic readiness probe - lightweight check for Kubernetes
   * @returns Promise<HealthCheckResponse> Basic health status
   */
  async readinessProbe(): Promise<HealthCheckResponse> {
    const startTime = Date.now()
    
    try {
      // Perform lightweight checks for readiness
      const databaseCheck = await this.checkDatabaseConnectivity()
      const configCheck = await this.checkConfiguration()
      
      const status = this.determineOverallStatus([databaseCheck, configCheck])
      
      const response: HealthCheckResponse = {
        status,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: Date.now() - this.startTime,
        checks: {
          database: databaseCheck,
          schema: { status: 'pass', message: 'Schema validation skipped in readiness probe' },
          queries: { status: 'pass', message: 'Query validation skipped in readiness probe' },
          configuration: configCheck
        },
        message: this.getStatusMessage(status)
      }

      const duration = Date.now() - startTime
      this.logger.logDiagnosticInfo(`Readiness probe completed in ${duration}ms`, {
        status,
        databaseStatus: databaseCheck.status,
        configStatus: configCheck.status
      })

      return response

    } catch (error) {
      this.logger.logDiagnosticWarning('Readiness probe failed', { error: error.message })
      
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: Date.now() - this.startTime,
        checks: {
          database: { status: 'fail', message: 'Database check failed' },
          schema: { status: 'fail', message: 'Schema check failed' },
          queries: { status: 'fail', message: 'Query check failed' },
          configuration: { status: 'fail', message: 'Configuration check failed' }
        },
        message: `Health check failed: ${error.message}`
      }
    }
  }

  /**
   * Comprehensive health check with full diagnostic report
   * @returns Promise<HealthCheckResponse> Complete health status with diagnostics
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const startTime = Date.now()
    
    try {
      this.logger.logDiagnosticInfo('Starting comprehensive health check')
      
      // Run full diagnostic check
      const diagnosticReport = await this.diagnosticEngine.runFullDiagnosis()
      
      // Convert diagnostic report to health check format
      const checks = this.convertDiagnosticToHealthChecks(diagnosticReport)
      
      const response: HealthCheckResponse = {
        status: diagnosticReport.overallStatus,
        timestamp: diagnosticReport.timestamp.toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: Date.now() - this.startTime,
        checks,
        diagnostics: diagnosticReport,
        message: this.getStatusMessage(diagnosticReport.overallStatus)
      }

      const duration = Date.now() - startTime
      this.logger.logDiagnosticInfo(`Comprehensive health check completed in ${duration}ms`, {
        status: diagnosticReport.overallStatus,
        schemaIssues: diagnosticReport.schemaIssues.length,
        connectivityIssues: diagnosticReport.connectivityIssues.length,
        queryIssues: diagnosticReport.queryIssues.length
      })

      return response

    } catch (error) {
      this.logger.logDiagnosticWarning('Comprehensive health check failed', { error: error.message })
      
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: Date.now() - this.startTime,
        checks: {
          database: { status: 'fail', message: 'Health check system failure' },
          schema: { status: 'fail', message: 'Health check system failure' },
          queries: { status: 'fail', message: 'Health check system failure' },
          configuration: { status: 'fail', message: 'Health check system failure' }
        },
        message: `Health check system failed: ${error.message}`
      }
    }
  }

  /**
   * Lightweight database connectivity check
   * @returns Promise<HealthCheckStatus> Database connectivity status
   */
  private async checkDatabaseConnectivity(): Promise<HealthCheckStatus> {
    try {
      const result = await this.diagnosticEngine.testConnectivity()
      
      if (result.isConnected) {
        return {
          status: 'pass',
          message: `Connected to PostgreSQL ${result.postgresVersion}`,
          details: {
            connectionTime: result.connectionTime,
            availableTables: result.availableTables.length
          }
        }
      } else {
        return {
          status: 'fail',
          message: `Database connection failed: ${result.error}`,
          details: { error: result.error }
        }
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Database connectivity check failed: ${error.message}`,
        details: { error: error.message }
      }
    }
  }

  /**
   * Basic configuration validation check
   * @returns Promise<HealthCheckStatus> Configuration status
   */
  private async checkConfiguration(): Promise<HealthCheckStatus> {
    try {
      // Check essential environment variables
      const requiredEnvVars = [
        'CUBEJS_DB_HOST',
        'CUBEJS_DB_PORT',
        'CUBEJS_DB_NAME',
        'CUBEJS_DB_USER',
        'CUBEJS_DB_PASS',
        'CUBEJS_API_SECRET'
      ]

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
      
      if (missingVars.length > 0) {
        return {
          status: 'fail',
          message: `Missing required environment variables: ${missingVars.join(', ')}`,
          details: { missingVariables: missingVars }
        }
      }

      return {
        status: 'pass',
        message: 'Configuration validation passed',
        details: { checkedVariables: requiredEnvVars.length }
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Configuration check failed: ${error.message}`,
        details: { error: error.message }
      }
    }
  }

  /**
   * Converts diagnostic report to health check format
   * @param report DiagnosticReport
   * @returns Health check status object
   */
  private convertDiagnosticToHealthChecks(report: DiagnosticReport) {
    return {
      database: {
        status: report.connectivityIssues.length === 0 ? 'pass' : 
                report.connectivityIssues.some(i => i.severity === 'critical') ? 'fail' : 'warn',
        message: report.connectivityIssues.length === 0 ? 
                'Database connectivity healthy' : 
                `${report.connectivityIssues.length} connectivity issues detected`,
        details: report.connectivityIssues
      },
      schema: {
        status: report.schemaIssues.length === 0 ? 'pass' : 
                report.schemaIssues.some(i => i.severity === 'critical') ? 'fail' : 'warn',
        message: report.schemaIssues.length === 0 ? 
                'Schema validation passed' : 
                `${report.schemaIssues.length} schema issues detected`,
        details: report.schemaIssues
      },
      queries: {
        status: report.queryIssues.length === 0 ? 'pass' : 
                report.queryIssues.some(i => i.severity === 'critical') ? 'fail' : 'warn',
        message: report.queryIssues.length === 0 ? 
                'Query validation passed' : 
                `${report.queryIssues.length} query issues detected`,
        details: report.queryIssues
      },
      configuration: {
        status: 'pass', // Configuration is checked separately in readiness probe
        message: 'Configuration validation included in diagnostic report'
      }
    }
  }

  /**
   * Determines overall status from individual check results
   * @param checks Array of health check statuses
   * @returns Overall health status
   */
  private determineOverallStatus(checks: HealthCheckStatus[]): 'healthy' | 'degraded' | 'critical' {
    const hasFailures = checks.some(check => check.status === 'fail')
    const hasWarnings = checks.some(check => check.status === 'warn')
    
    if (hasFailures) {
      return 'critical'
    } else if (hasWarnings) {
      return 'degraded'
    } else {
      return 'healthy'
    }
  }

  /**
   * Gets human-readable status message
   * @param status Health status
   * @returns Status message
   */
  private getStatusMessage(status: 'healthy' | 'degraded' | 'critical'): string {
    switch (status) {
      case 'healthy':
        return 'CubeJS is operating normally'
      case 'degraded':
        return 'CubeJS is operational but has some issues that may impact performance'
      case 'critical':
        return 'CubeJS has critical issues that prevent normal operation'
      default:
        return 'Unknown status'
    }
  }
}

/**
 * Factory function to create health check instance
 * @returns CubeJSHealthCheck instance
 */
export function createHealthCheck(): CubeJSHealthCheck {
  return new CubeJSHealthCheck()
}

/**
 * Express middleware for readiness probe endpoint
 * @param req Express request
 * @param res Express response
 */
export async function readinessHandler(req: any, res: any) {
  const healthCheck = createHealthCheck()
  
  try {
    const result = await healthCheck.readinessProbe()
    
    // Set appropriate HTTP status code
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'degraded' ? 200 : 503
    
    res.status(statusCode).json(result)
  } catch (error) {
    res.status(503).json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      message: `Readiness probe failed: ${error.message}`,
      error: error.message
    })
  }
}

/**
 * Express middleware for comprehensive health check endpoint
 * @param req Express request
 * @param res Express response
 */
export async function healthHandler(req: any, res: any) {
  const healthCheck = createHealthCheck()
  
  try {
    const result = await healthCheck.healthCheck()
    
    // Set appropriate HTTP status code
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'degraded' ? 200 : 503
    
    res.status(statusCode).json(result)
  } catch (error) {
    res.status(503).json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      message: `Health check failed: ${error.message}`,
      error: error.message
    })
  }
}