/**
 * Enhanced ErrorHandler implementation for comprehensive error reporting and recovery
 * 
 * This class provides structured error logging, error classification, and proper HTTP status code assignment
 * for CubeJS API errors. It implements Requirements 1.1, 1.2, 4.1, 4.4, 4.5.
 */

import { v4 as uuidv4 } from 'uuid'
import { getServiceChildLogger } from '@gitmesh/logging'
import type { Logger } from '@gitmesh/logging'
import {
  ErrorHandler as IErrorHandler,
  ErrorResponse,
  ErrorReport,
  StructuredError,
  CubeQuery,
  SecurityContext
} from './interfaces'
import { ErrorMessageTemplates, ErrorGuidanceGenerator } from './error-templates'

/**
 * Error categories for classification system
 */
export enum ErrorCategory {
  SCHEMA = 'schema',
  QUERY = 'query', 
  DATABASE = 'database',
  SECURITY = 'security'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Enhanced ErrorHandler class that provides comprehensive error handling and logging
 */
export class ErrorHandler implements IErrorHandler {
  private logger: Logger
  private errorHistory: StructuredError[] = []
  private readonly maxHistorySize = 1000

  constructor(logger?: Logger) {
    this.logger = logger || getServiceChildLogger('CubeJS-ErrorHandler')
  }

  /**
   * Handles a query error and generates appropriate response
   * Implements Requirements 1.1, 1.2, 4.4
   */
  handleQueryError(error: Error, query: CubeQuery, context: SecurityContext): ErrorResponse {
    const correlationId = uuidv4()
    const category = this.classifyError(error, query, context)
    const statusCode = this.determineStatusCode(category, error)
    
    // Create structured error for logging
    const structuredError: StructuredError = {
      timestamp: new Date(),
      level: statusCode >= 500 ? 'error' : 'warn',
      category,
      message: error.message,
      details: {
        query,
        securityContext: context,
        stackTrace: error.stack,
        suggestions: this.generateSuggestions(category, error, query, context)
      },
      correlationId
    }

    // Log the structured error
    this.logStructuredError(structuredError)

    // Generate user-friendly response
    const response: ErrorResponse = {
      statusCode,
      message: this.generateUserFriendlyMessage(category, error),
      details: this.generateErrorDetails(category, error, query, context),
      suggestions: structuredError.details.suggestions || [],
      debugInfo: process.env.NODE_ENV === 'development' ? {
        correlationId,
        stackTrace: error.stack,
        originalError: error.message
      } : { correlationId }
    }

    return response
  }

  /**
   * Logs a structured error with correlation ID and searchable fields
   * Implements Requirements 4.1, 4.5
   */
  logStructuredError(error: StructuredError): void {
    // Add to error history for reporting
    this.errorHistory.push(error)
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize)
    }

    // Log with structured format for easy searching
    const logData = {
      timestamp: error.timestamp.toISOString(),
      level: error.level,
      category: error.category,
      message: error.message,
      correlationId: error.correlationId,
      tenantId: error.details.securityContext?.tenantId,
      userId: error.details.securityContext?.userId,
      queryMeasures: error.details.query?.measures?.join(','),
      queryDimensions: error.details.query?.dimensions?.join(','),
      suggestions: error.details.suggestions?.join(' | '),
      stackTrace: error.details.stackTrace
    }

    // Log based on severity
    switch (error.level) {
      case 'error':
        this.logger.error('CubeJS Query Error', logData)
        break
      case 'warn':
        this.logger.warn('CubeJS Query Warning', logData)
        break
      default:
        this.logger.info('CubeJS Query Info', logData)
    }
  }

  /**
   * Generates a comprehensive error report
   * Implements Requirements 4.1, 4.5
   */
  async generateErrorReport(): Promise<ErrorReport> {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // Filter recent errors
    const recentErrors = this.errorHistory.filter(
      error => error.timestamp >= last24Hours
    )

    // Count errors by category
    const errorsByCategory = recentErrors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Generate recommendations based on error patterns
    const recommendations = this.generateReportRecommendations(recentErrors, errorsByCategory)

    return {
      generatedAt: now,
      totalErrors: recentErrors.length,
      errorsByCategory,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      recommendations
    }
  }

  /**
   * Classifies errors into categories for proper handling
   * Implements Requirements 1.2, 4.4
   */
  private classifyError(error: Error, query: CubeQuery, context: SecurityContext): ErrorCategory {
    const errorMessage = error.message.toLowerCase()
    const errorStack = error.stack?.toLowerCase() || ''

    // Security context errors
    if (!context.tenantId || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return ErrorCategory.SECURITY
    }

    // Database connection errors
    if (errorMessage.includes('connection') || 
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('pool') ||
        errorStack.includes('pg') ||
        errorStack.includes('postgres')) {
      return ErrorCategory.DATABASE
    }

    // Schema-related errors
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
        errorMessage.includes('column') && errorMessage.includes('does not exist') ||
        errorMessage.includes('table') ||
        errorMessage.includes('materialized view') ||
        errorMessage.includes('schema') ||
        errorMessage.includes('cube') && errorMessage.includes('not found')) {
      return ErrorCategory.SCHEMA
    }

    // Query structure errors (default)
    return ErrorCategory.QUERY
  }

  /**
   * Determines appropriate HTTP status code based on error category
   * Implements Requirements 4.4
   */
  private determineStatusCode(category: ErrorCategory, error: Error): number {
    switch (category) {
      case ErrorCategory.SECURITY:
        return error.message.toLowerCase().includes('unauthorized') ? 401 : 403
      case ErrorCategory.QUERY:
      case ErrorCategory.SCHEMA:
        return 400 // Bad Request - client error
      case ErrorCategory.DATABASE:
        return 500 // Internal Server Error - server error
      default:
        return 500
    }
  }

  /**
   * Generates user-friendly error messages using templates
   * Implements Requirements 4.3
   */
  private generateUserFriendlyMessage(category: ErrorCategory, error: Error): string {
    const template = ErrorMessageTemplates.getErrorTemplate(category, error)
    return template.message
  }

  /**
   * Generates detailed error information for debugging
   */
  private generateErrorDetails(category: ErrorCategory, error: Error, query: CubeQuery, context: SecurityContext): string {
    const details = [`Error Category: ${category}`]
    
    if (category === ErrorCategory.SECURITY) {
      details.push(`Tenant ID: ${context.tenantId || 'missing'}`)
      details.push(`User ID: ${context.userId || 'missing'}`)
      details.push(`Segments: ${context.segments?.length || 0} provided`)
    }
    
    if (category === ErrorCategory.QUERY) {
      details.push(`Measures: ${query.measures?.length || 0} requested`)
      details.push(`Dimensions: ${query.dimensions?.length || 0} requested`)
      details.push(`Filters: ${query.filters?.length || 0} applied`)
    }
    
    details.push(`Original Error: ${error.message}`)
    
    return details.join(' | ')
  }

  /**
   * Generates contextual suggestions for error resolution using templates
   * Implements Requirements 4.3
   */
  private generateSuggestions(category: ErrorCategory, error: Error, query: CubeQuery, context: SecurityContext): string[] {
    return ErrorMessageTemplates.generateContextualSuggestions(category, error, query, context)
  }

  /**
   * Generates recommendations for error report based on error patterns
   */
  private generateReportRecommendations(recentErrors: StructuredError[], errorsByCategory: Record<string, number>): string[] {
    const recommendations: string[] = []
    const totalErrors = recentErrors.length

    if (totalErrors === 0) {
      recommendations.push('System is operating normally with no recent errors')
      return recommendations
    }

    // High error volume
    if (totalErrors > 50) {
      recommendations.push('High error volume detected - investigate system health')
    }

    // Category-specific recommendations
    const schemaErrors = errorsByCategory[ErrorCategory.SCHEMA] || 0
    const databaseErrors = errorsByCategory[ErrorCategory.DATABASE] || 0
    const securityErrors = errorsByCategory[ErrorCategory.SECURITY] || 0
    const queryErrors = errorsByCategory[ErrorCategory.QUERY] || 0

    if (schemaErrors > totalErrors * 0.3) {
      recommendations.push('High schema error rate - review cube definitions and database schema')
    }

    if (databaseErrors > totalErrors * 0.2) {
      recommendations.push('Database connectivity issues detected - check database health and network')
    }

    if (securityErrors > totalErrors * 0.2) {
      recommendations.push('Authentication/authorization issues - review security configuration')
    }

    if (queryErrors > totalErrors * 0.4) {
      recommendations.push('Query validation issues - review client query generation logic')
    }

    // Trending analysis
    const last1Hour = new Date(Date.now() - 60 * 60 * 1000)
    const recentErrorsLastHour = recentErrors.filter(e => e.timestamp >= last1Hour)
    
    if (recentErrorsLastHour.length > totalErrors * 0.5) {
      recommendations.push('Error rate increasing - immediate investigation recommended')
    }

    return recommendations
  }

  /**
   * Gets error statistics for monitoring
   */
  getErrorStatistics(): { total: number, byCategory: Record<string, number>, last24Hours: number } {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentErrors = this.errorHistory.filter(e => e.timestamp >= last24Hours)
    
    const byCategory = recentErrors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: this.errorHistory.length,
      byCategory,
      last24Hours: recentErrors.length
    }
  }

  /**
   * Clears error history (useful for testing)
   */
  clearErrorHistory(): void {
    this.errorHistory = []
  }
}