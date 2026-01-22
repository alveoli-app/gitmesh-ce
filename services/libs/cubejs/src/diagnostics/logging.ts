/**
 * Structured logging utilities for CubeJS diagnostic system
 * Provides correlation IDs, searchable fields, and structured error logging
 */

import { Logger, getServiceChildLogger } from '@gitmesh/logging'
import { v4 as uuidv4 } from 'uuid'
import { StructuredError, CubeQuery, SecurityContext } from './types'

/**
 * Correlation ID context for tracking related log entries
 */
export class CorrelationContext {
  private static instance: CorrelationContext
  private correlationId: string | null = null

  private constructor() {}

  public static getInstance(): CorrelationContext {
    if (!CorrelationContext.instance) {
      CorrelationContext.instance = new CorrelationContext()
    }
    return CorrelationContext.instance
  }

  public setCorrelationId(id: string): void {
    this.correlationId = id
  }

  public getCorrelationId(): string {
    if (!this.correlationId) {
      this.correlationId = uuidv4()
    }
    return this.correlationId
  }

  public generateNewCorrelationId(): string {
    this.correlationId = uuidv4()
    return this.correlationId
  }

  public clearCorrelationId(): void {
    this.correlationId = null
  }
}

/**
 * Structured logger for CubeJS diagnostic system
 */
export class DiagnosticLogger {
  private logger: Logger
  private correlationContext: CorrelationContext

  constructor(logger: Logger) {
    this.logger = logger
    this.correlationContext = CorrelationContext.getInstance()
  }

  /**
   * Logs a structured error with all required diagnostic fields
   */
  public logStructuredError(error: StructuredError): void {
    const logEntry = {
      timestamp: error.timestamp.toISOString(),
      level: error.level,
      category: error.category,
      message: error.message,
      correlationId: error.correlationId,
      details: {
        ...error.details,
        // Sanitize sensitive information
        query: error.details.query ? this.sanitizeQuery(error.details.query) : undefined,
        securityContext: error.details.securityContext ? this.sanitizeSecurityContext(error.details.securityContext) : undefined
      },
      // Searchable fields for log analysis
      searchable: {
        errorCategory: error.category,
        hasQuery: !!error.details.query,
        hasSecurityContext: !!error.details.securityContext,
        hasSuggestions: !!(error.details.suggestions && error.details.suggestions.length > 0),
        tenantId: error.details.securityContext?.tenantId || 'unknown'
      }
    }

    switch (error.level) {
      case 'error':
        this.logger.error(logEntry, error.message)
        break
      case 'warn':
        this.logger.warn(logEntry, error.message)
        break
      case 'info':
        this.logger.info(logEntry, error.message)
        break
    }
  }

  /**
   * Logs a query validation error with full context
   */
  public logQueryValidationError(
    message: string,
    query: CubeQuery,
    context: SecurityContext,
    error?: Error,
    suggestions: string[] = []
  ): void {
    const structuredError: StructuredError = {
      timestamp: new Date(),
      level: 'error',
      category: 'query',
      message,
      details: {
        query,
        securityContext: context,
        stackTrace: error?.stack,
        suggestions
      },
      correlationId: this.correlationContext.getCorrelationId()
    }

    this.logStructuredError(structuredError)
  }

  /**
   * Logs a schema validation error with cube context
   */
  public logSchemaValidationError(
    message: string,
    cubeName: string,
    error?: Error,
    suggestions: string[] = []
  ): void {
    const structuredError: StructuredError = {
      timestamp: new Date(),
      level: 'error',
      category: 'schema',
      message,
      details: {
        cubeName,
        stackTrace: error?.stack,
        suggestions
      },
      correlationId: this.correlationContext.getCorrelationId()
    }

    this.logStructuredError(structuredError)
  }

  /**
   * Logs a database connectivity error
   */
  public logDatabaseError(
    message: string,
    databaseError: string,
    suggestions: string[] = []
  ): void {
    const structuredError: StructuredError = {
      timestamp: new Date(),
      level: 'error',
      category: 'database',
      message,
      details: {
        databaseError,
        suggestions
      },
      correlationId: this.correlationContext.getCorrelationId()
    }

    this.logStructuredError(structuredError)
  }

  /**
   * Logs a security context validation error
   */
  public logSecurityError(
    message: string,
    context: SecurityContext,
    suggestions: string[] = []
  ): void {
    const structuredError: StructuredError = {
      timestamp: new Date(),
      level: 'error',
      category: 'security',
      message,
      details: {
        securityContext: context,
        suggestions
      },
      correlationId: this.correlationContext.getCorrelationId()
    }

    this.logStructuredError(structuredError)
  }

  /**
   * Logs diagnostic information with correlation ID
   */
  public logDiagnosticInfo(message: string, details: any = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      correlationId: this.correlationContext.getCorrelationId(),
      details,
      searchable: {
        isDiagnostic: true,
        hasDetails: Object.keys(details).length > 0
      }
    }

    this.logger.info(logEntry, message)
  }

  /**
   * Logs diagnostic warning with correlation ID
   */
  public logDiagnosticWarning(message: string, details: any = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      correlationId: this.correlationContext.getCorrelationId(),
      details,
      searchable: {
        isDiagnostic: true,
        isWarning: true,
        hasDetails: Object.keys(details).length > 0
      }
    }

    this.logger.warn(logEntry, message)
  }

  /**
   * Creates a new correlation ID for a diagnostic session
   */
  public startDiagnosticSession(): string {
    const correlationId = this.correlationContext.generateNewCorrelationId()
    this.logDiagnosticInfo('Starting diagnostic session', { correlationId })
    return correlationId
  }

  /**
   * Ends a diagnostic session
   */
  public endDiagnosticSession(): void {
    const correlationId = this.correlationContext.getCorrelationId()
    this.logDiagnosticInfo('Ending diagnostic session', { correlationId })
    this.correlationContext.clearCorrelationId()
  }

  /**
   * Sanitizes query object for logging (removes sensitive data)
   */
  private sanitizeQuery(query: CubeQuery): Partial<CubeQuery> {
    return {
      measures: query.measures,
      dimensions: query.dimensions,
      timeDimensions: query.timeDimensions?.map(td => ({
        dimension: td.dimension,
        granularity: td.granularity,
        // Remove actual date values for privacy
        dateRange: td.dateRange ? '[REDACTED]' : undefined
      })),
      filters: query.filters?.map(f => ({
        member: f.member,
        operator: f.operator,
        // Remove actual filter values for privacy
        values: '[REDACTED]'
      })),
      segments: query.segments,
      limit: query.limit,
      offset: query.offset
    }
  }

  /**
   * Sanitizes security context for logging (removes sensitive data)
   */
  private sanitizeSecurityContext(context: SecurityContext): Partial<SecurityContext> {
    return {
      tenantId: context.tenantId,
      // Keep segments as they're usually not sensitive
      segments: context.segments,
      // Remove userId and permissions for privacy
      userId: context.userId ? '[REDACTED]' : undefined,
      permissions: context.permissions ? '[REDACTED]' : undefined
    }
  }
}

/**
 * Factory function to create a diagnostic logger instance
 */
export function createDiagnosticLogger(logger?: Logger): DiagnosticLogger {
  const loggerInstance = logger || getServiceChildLogger('cubejs-diagnostics')
  return new DiagnosticLogger(loggerInstance)
}

/**
 * Utility function to generate correlation ID
 */
export function generateCorrelationId(): string {
  return uuidv4()
}

/**
 * Utility function to create searchable log fields
 */
export function createSearchableFields(
  category: string,
  additionalFields: Record<string, any> = {}
): Record<string, any> {
  return {
    category,
    timestamp: new Date().toISOString(),
    isDiagnostic: true,
    ...additionalFields
  }
}