/**
 * Error message templates and guidance system for user-friendly error responses
 * 
 * This module provides structured error message templates with specific guidance
 * for common error scenarios. Implements Requirements 4.3.
 */

import { ErrorCategory } from './error-handler'
import { CubeQuery, SecurityContext } from './interfaces'

/**
 * Error template structure for consistent messaging
 */
export interface ErrorTemplate {
  title: string
  message: string
  suggestions: string[]
  documentation?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Error message templates organized by category and specific error types
 */
export class ErrorMessageTemplates {
  
  /**
   * Security-related error templates
   */
  private static readonly SECURITY_TEMPLATES: Record<string, ErrorTemplate> = {
    MISSING_TENANT_ID: {
      title: 'Missing Tenant ID',
      message: 'Your request is missing a required tenant identifier. This is needed to ensure you can only access data you\'re authorized to see.',
      suggestions: [
        'Ensure you\'re logged in to your organization',
        'Check that your session hasn\'t expired',
        'Contact your administrator if you continue to see this error'
      ],
      documentation: 'https://docs.gitmesh.com/authentication#tenant-context',
      severity: 'high'
    },

    INVALID_TENANT_ID: {
      title: 'Invalid Tenant ID',
      message: 'The tenant identifier in your request is not valid or you don\'t have access to this organization.',
      suggestions: [
        'Verify you\'re accessing the correct organization',
        'Check that you haven\'t been removed from this organization',
        'Try logging out and logging back in'
      ],
      documentation: 'https://docs.gitmesh.com/authentication#tenant-access',
      severity: 'high'
    },

    MISSING_SEGMENTS: {
      title: 'Missing User Segments',
      message: 'Your user profile is missing required access segments. This determines what data you can view.',
      suggestions: [
        'Contact your organization administrator to configure your access',
        'Ensure your user role is properly assigned',
        'Try refreshing your browser to reload your permissions'
      ],
      documentation: 'https://docs.gitmesh.com/permissions#user-segments',
      severity: 'medium'
    },

    EXPIRED_TOKEN: {
      title: 'Authentication Token Expired',
      message: 'Your authentication token has expired and needs to be refreshed.',
      suggestions: [
        'Please log out and log back in',
        'Clear your browser cache and cookies',
        'Contact support if the problem persists'
      ],
      documentation: 'https://docs.gitmesh.com/authentication#token-refresh',
      severity: 'medium'
    },

    INSUFFICIENT_PERMISSIONS: {
      title: 'Insufficient Permissions',
      message: 'You don\'t have permission to access the requested data or perform this action.',
      suggestions: [
        'Contact your organization administrator to request access',
        'Verify you\'re using the correct user account',
        'Check if your role includes analytics permissions'
      ],
      documentation: 'https://docs.gitmesh.com/permissions#analytics-access',
      severity: 'medium'
    }
  }

  /**
   * Schema-related error templates
   */
  private static readonly SCHEMA_TEMPLATES: Record<string, ErrorTemplate> = {
    MISSING_TABLE: {
      title: 'Data Source Not Found',
      message: 'The requested data source doesn\'t exist in the database. This might be due to a recent schema change.',
      suggestions: [
        'Check if the data source name is spelled correctly',
        'Verify that the materialized view exists and is accessible',
        'Contact your administrator if this data was recently available',
        'Try refreshing the page to reload the latest schema'
      ],
      documentation: 'https://docs.gitmesh.com/troubleshooting#missing-data-sources',
      severity: 'high'
    },

    MISSING_COLUMN: {
      title: 'Data Field Not Available',
      message: 'A requested data field is not available in the current data source. The field may have been renamed or removed.',
      suggestions: [
        'Check if similar fields are available in the data source',
        'Verify the field name spelling and capitalization',
        'Contact your administrator about recent schema changes',
        'Try using alternative fields that provide similar information'
      ],
      documentation: 'https://docs.gitmesh.com/troubleshooting#missing-fields',
      severity: 'medium'
    },

    INVALID_JOIN: {
      title: 'Data Relationship Error',
      message: 'There\'s an issue with how different data sources are connected. This prevents combining data from multiple sources.',
      suggestions: [
        'Try querying each data source separately',
        'Contact your administrator about data relationship configuration',
        'Check if the related data sources are available',
        'Use simpler queries that don\'t require data joins'
      ],
      documentation: 'https://docs.gitmesh.com/troubleshooting#data-relationships',
      severity: 'high'
    },

    SCHEMA_DRIFT: {
      title: 'Data Structure Changed',
      message: 'The underlying data structure has changed since this query was created. The query needs to be updated.',
      suggestions: [
        'Refresh the page to load the latest data structure',
        'Recreate your query using the current available fields',
        'Contact your administrator about recent database changes',
        'Check the system status page for maintenance notifications'
      ],
      documentation: 'https://docs.gitmesh.com/troubleshooting#schema-changes',
      severity: 'medium'
    }
  }

  /**
   * Query-related error templates
   */
  private static readonly QUERY_TEMPLATES: Record<string, ErrorTemplate> = {
    INVALID_SYNTAX: {
      title: 'Query Format Error',
      message: 'The query format is not valid. This usually happens when required fields are missing or incorrectly formatted.',
      suggestions: [
        'Ensure at least one measure (metric) is selected',
        'Check that all filter values are properly formatted',
        'Verify date ranges are in the correct format (YYYY-MM-DD)',
        'Try simplifying the query by removing some filters or dimensions'
      ],
      documentation: 'https://docs.gitmesh.com/analytics#query-format',
      severity: 'medium'
    },

    MISSING_MEASURES: {
      title: 'No Metrics Selected',
      message: 'Your query doesn\'t include any metrics to calculate. At least one metric (like count, sum, or average) is required.',
      suggestions: [
        'Select at least one metric from the available options',
        'Common metrics include: Count, Total, Average, Maximum, Minimum',
        'Check the widget configuration to ensure metrics are properly selected',
        'Try using a pre-built dashboard widget as a starting point'
      ],
      documentation: 'https://docs.gitmesh.com/analytics#metrics',
      severity: 'low'
    },

    INVALID_FILTER: {
      title: 'Filter Configuration Error',
      message: 'One or more filters in your query are not configured correctly.',
      suggestions: [
        'Check that all filters have valid values',
        'Ensure date filters use the correct date format',
        'Verify that filter values exist in the data',
        'Remove complex filters and add them back one at a time'
      ],
      documentation: 'https://docs.gitmesh.com/analytics#filters',
      severity: 'medium'
    },

    QUERY_TOO_COMPLEX: {
      title: 'Query Too Complex',
      message: 'Your query is too complex and may take too long to process or use too many resources.',
      suggestions: [
        'Reduce the number of dimensions and measures',
        'Add more specific filters to limit the data range',
        'Break complex queries into smaller, simpler ones',
        'Consider using pre-aggregated data or summary views'
      ],
      documentation: 'https://docs.gitmesh.com/analytics#performance',
      severity: 'medium'
    },

    TIMEOUT: {
      title: 'Query Timeout',
      message: 'Your query took too long to process and was cancelled to prevent system overload.',
      suggestions: [
        'Add more specific filters to reduce the amount of data processed',
        'Try querying a smaller date range',
        'Reduce the number of dimensions in your query',
        'Contact support if you need to analyze large datasets regularly'
      ],
      documentation: 'https://docs.gitmesh.com/analytics#timeouts',
      severity: 'medium'
    }
  }

  /**
   * Database-related error templates
   */
  private static readonly DATABASE_TEMPLATES: Record<string, ErrorTemplate> = {
    CONNECTION_FAILED: {
      title: 'Database Connection Error',
      message: 'Unable to connect to the data source. This is usually a temporary issue.',
      suggestions: [
        'Wait a moment and try again',
        'Check your internet connection',
        'Try refreshing the page',
        'Contact support if the problem persists for more than a few minutes'
      ],
      documentation: 'https://docs.gitmesh.com/troubleshooting#connectivity',
      severity: 'high'
    },

    CONNECTION_TIMEOUT: {
      title: 'Database Connection Timeout',
      message: 'The connection to the data source timed out. This might be due to high system load.',
      suggestions: [
        'Wait a few minutes and try again',
        'Try during off-peak hours for better performance',
        'Simplify your query to reduce processing time',
        'Contact support if timeouts occur frequently'
      ],
      documentation: 'https://docs.gitmesh.com/troubleshooting#timeouts',
      severity: 'medium'
    },

    MAINTENANCE_MODE: {
      title: 'System Maintenance',
      message: 'The analytics system is currently undergoing maintenance. Some features may be temporarily unavailable.',
      suggestions: [
        'Check the system status page for maintenance schedules',
        'Try again after the maintenance window',
        'Use cached data if available',
        'Subscribe to status updates for maintenance notifications'
      ],
      documentation: 'https://status.gitmesh.com',
      severity: 'low'
    },

    RESOURCE_EXHAUSTED: {
      title: 'System Resources Unavailable',
      message: 'The system is currently at capacity and cannot process additional requests.',
      suggestions: [
        'Wait a few minutes and try again',
        'Try during off-peak hours',
        'Use simpler queries that require fewer resources',
        'Contact support if you consistently see this error'
      ],
      documentation: 'https://docs.gitmesh.com/troubleshooting#capacity',
      severity: 'high'
    }
  }

  /**
   * Gets an appropriate error template based on error details
   */
  static getErrorTemplate(
    category: ErrorCategory,
    error: Error,
    query?: CubeQuery,
    context?: SecurityContext
  ): ErrorTemplate {
    const errorMessage = error.message.toLowerCase()
    
    switch (category) {
      case ErrorCategory.SECURITY:
        return this.getSecurityTemplate(errorMessage, context)
      case ErrorCategory.SCHEMA:
        return this.getSchemaTemplate(errorMessage, error)
      case ErrorCategory.QUERY:
        return this.getQueryTemplate(errorMessage, query)
      case ErrorCategory.DATABASE:
        return this.getDatabaseTemplate(errorMessage, error)
      default:
        return this.getGenericTemplate(error)
    }
  }

  /**
   * Gets security-specific error template
   */
  private static getSecurityTemplate(errorMessage: string, context?: SecurityContext): ErrorTemplate {
    if (!context?.tenantId) {
      return this.SECURITY_TEMPLATES.MISSING_TENANT_ID
    }
    
    if (errorMessage.includes('expired') || errorMessage.includes('invalid token')) {
      return this.SECURITY_TEMPLATES.EXPIRED_TOKEN
    }
    
    if (errorMessage.includes('forbidden') || errorMessage.includes('insufficient')) {
      return this.SECURITY_TEMPLATES.INSUFFICIENT_PERMISSIONS
    }
    
    if (!context.segments || context.segments.length === 0) {
      return this.SECURITY_TEMPLATES.MISSING_SEGMENTS
    }
    
    if (errorMessage.includes('tenant') && errorMessage.includes('invalid')) {
      return this.SECURITY_TEMPLATES.INVALID_TENANT_ID
    }
    
    return this.SECURITY_TEMPLATES.INSUFFICIENT_PERMISSIONS
  }

  /**
   * Gets schema-specific error template
   */
  private static getSchemaTemplate(errorMessage: string, error: Error): ErrorTemplate {
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return this.SCHEMA_TEMPLATES.MISSING_TABLE
    }
    
    if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      return this.SCHEMA_TEMPLATES.MISSING_COLUMN
    }
    
    if (errorMessage.includes('join') || errorMessage.includes('relationship')) {
      return this.SCHEMA_TEMPLATES.INVALID_JOIN
    }
    
    if (errorMessage.includes('schema') && errorMessage.includes('changed')) {
      return this.SCHEMA_TEMPLATES.SCHEMA_DRIFT
    }
    
    return this.SCHEMA_TEMPLATES.MISSING_TABLE
  }

  /**
   * Gets query-specific error template
   */
  private static getQueryTemplate(errorMessage: string, query?: CubeQuery): ErrorTemplate {
    if (!query?.measures || query.measures.length === 0) {
      return this.QUERY_TEMPLATES.MISSING_MEASURES
    }
    
    if (errorMessage.includes('timeout')) {
      return this.QUERY_TEMPLATES.TIMEOUT
    }
    
    if (errorMessage.includes('complex') || errorMessage.includes('too many')) {
      return this.QUERY_TEMPLATES.QUERY_TOO_COMPLEX
    }
    
    if (errorMessage.includes('filter') || errorMessage.includes('invalid value')) {
      return this.QUERY_TEMPLATES.INVALID_FILTER
    }
    
    if (errorMessage.includes('syntax') || errorMessage.includes('parse')) {
      return this.QUERY_TEMPLATES.INVALID_SYNTAX
    }
    
    return this.QUERY_TEMPLATES.INVALID_SYNTAX
  }

  /**
   * Gets database-specific error template
   */
  private static getDatabaseTemplate(errorMessage: string, error: Error): ErrorTemplate {
    if (errorMessage.includes('timeout')) {
      return this.DATABASE_TEMPLATES.CONNECTION_TIMEOUT
    }
    
    if (errorMessage.includes('maintenance') || errorMessage.includes('unavailable')) {
      return this.DATABASE_TEMPLATES.MAINTENANCE_MODE
    }
    
    if (errorMessage.includes('capacity') || errorMessage.includes('resource')) {
      return this.DATABASE_TEMPLATES.RESOURCE_EXHAUSTED
    }
    
    if (errorMessage.includes('connection') || errorMessage.includes('connect')) {
      return this.DATABASE_TEMPLATES.CONNECTION_FAILED
    }
    
    return this.DATABASE_TEMPLATES.CONNECTION_FAILED
  }

  /**
   * Gets generic error template for unclassified errors
   */
  private static getGenericTemplate(error: Error): ErrorTemplate {
    return {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred while processing your request. Our team has been notified.',
      suggestions: [
        'Try refreshing the page and attempting your request again',
        'Check if the issue persists with a simpler query',
        'Contact support if you continue to experience problems',
        'Include the error ID when contacting support for faster resolution'
      ],
      documentation: 'https://docs.gitmesh.com/troubleshooting#general',
      severity: 'medium'
    }
  }

  /**
   * Generates contextual suggestions based on error patterns
   */
  static generateContextualSuggestions(
    category: ErrorCategory,
    error: Error,
    query?: CubeQuery,
    context?: SecurityContext
  ): string[] {
    const template = this.getErrorTemplate(category, error, query, context)
    const suggestions = [...template.suggestions]

    // Add context-specific suggestions
    if (category === ErrorCategory.QUERY && query) {
      if (query.filters && query.filters.length > 5) {
        suggestions.push('Consider reducing the number of filters to improve performance')
      }
      
      if (query.dimensions && query.dimensions.length > 10) {
        suggestions.push('Try reducing the number of dimensions for better performance')
      }
      
      if (query.timeDimensions && query.timeDimensions.length > 0) {
        const hasLargeDateRange = query.timeDimensions.some(td => {
          if (td.dateRange && Array.isArray(td.dateRange)) {
            const start = new Date(td.dateRange[0])
            const end = new Date(td.dateRange[1])
            const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            return daysDiff > 365
          }
          return false
        })
        
        if (hasLargeDateRange) {
          suggestions.push('Consider using a smaller date range for better performance')
        }
      }
    }

    if (category === ErrorCategory.SECURITY && context) {
      if (context.segments && context.segments.length === 0) {
        suggestions.push('Your user account may need additional permissions configured')
      }
    }

    return suggestions
  }

  /**
   * Gets severity level for an error
   */
  static getErrorSeverity(category: ErrorCategory, error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const template = this.getErrorTemplate(category, error)
    return template.severity
  }

  /**
   * Gets documentation link for an error
   */
  static getDocumentationLink(category: ErrorCategory, error: Error): string | undefined {
    const template = this.getErrorTemplate(category, error)
    return template.documentation
  }
}

/**
 * Error guidance generator for providing step-by-step resolution help
 */
export class ErrorGuidanceGenerator {
  
  /**
   * Generates step-by-step guidance for resolving an error
   */
  static generateStepByStepGuidance(
    category: ErrorCategory,
    error: Error,
    query?: CubeQuery,
    context?: SecurityContext
  ): string[] {
    const template = ErrorMessageTemplates.getErrorTemplate(category, error, query, context)
    
    switch (category) {
      case ErrorCategory.SECURITY:
        return this.generateSecurityGuidance(error, context)
      case ErrorCategory.SCHEMA:
        return this.generateSchemaGuidance(error)
      case ErrorCategory.QUERY:
        return this.generateQueryGuidance(error, query)
      case ErrorCategory.DATABASE:
        return this.generateDatabaseGuidance(error)
      default:
        return template.suggestions
    }
  }

  private static generateSecurityGuidance(error: Error, context?: SecurityContext): string[] {
    const steps: string[] = []
    
    if (!context?.tenantId) {
      steps.push('1. Log out of your current session')
      steps.push('2. Clear your browser cache and cookies')
      steps.push('3. Log back in to your organization')
      steps.push('4. Try your request again')
    } else {
      steps.push('1. Verify you have the correct permissions for this data')
      steps.push('2. Contact your organization administrator if needed')
      steps.push('3. Try accessing different data to confirm your access level')
    }
    
    return steps
  }

  private static generateSchemaGuidance(error: Error): string[] {
    return [
      '1. Refresh the page to load the latest data structure',
      '2. Check if the data source name is spelled correctly',
      '3. Try using a different, similar data source',
      '4. Contact your administrator if the data was recently available',
      '5. Check the system status page for any ongoing maintenance'
    ]
  }

  private static generateQueryGuidance(error: Error, query?: CubeQuery): string[] {
    const steps: string[] = []
    
    if (!query?.measures || query.measures.length === 0) {
      steps.push('1. Select at least one metric (count, sum, average, etc.)')
      steps.push('2. Choose the dimensions you want to analyze')
      steps.push('3. Add any necessary filters')
      steps.push('4. Submit your query')
    } else {
      steps.push('1. Simplify your query by removing some filters')
      steps.push('2. Reduce the number of dimensions')
      steps.push('3. Try a smaller date range if using time filters')
      steps.push('4. Test the query with minimal parameters first')
      steps.push('5. Gradually add complexity back')
    }
    
    return steps
  }

  private static generateDatabaseGuidance(error: Error): string[] {
    return [
      '1. Wait 30 seconds and try again',
      '2. Check your internet connection',
      '3. Refresh the page',
      '4. Try a simpler query to test connectivity',
      '5. Contact support if the problem persists'
    ]
  }
}