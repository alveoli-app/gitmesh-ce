/**
 * Enhanced CubeJS Query Rewriter with improved error handling
 * 
 * This module provides enhanced query rewriting functionality with:
 * - Comprehensive security context validation
 * - Better error messages for authentication problems
 * - Structured error logging
 * - Graceful handling of malformed contexts
 * 
 * Requirements: 1.3, 3.5
 */

import { CubeQuery, SecurityContext, StructuredError } from './diagnostics/types'
import { ErrorHandler } from './diagnostics/error-handler'
import { v4 as uuidv4 } from 'uuid'

export interface QueryRewriteError extends Error {
  code: string
  statusCode: number
  details?: any
  suggestions?: string[]
}

export class EnhancedQueryRewriter {
  private readonly logger: any
  private readonly correlationId: string
  private readonly errorHandler: ErrorHandler

  constructor(logger?: any) {
    this.logger = logger || console
    this.correlationId = uuidv4()
    this.errorHandler = new ErrorHandler(this.logger)
  }

  /**
   * Enhanced query rewriter with comprehensive error handling
   */
  rewriteQuery(query: any, contextArg: any): any {
    try {
      // Extract and validate security context
      const securityContext = this.extractSecurityContext(contextArg)
      this.validateSecurityContext(securityContext)

      // Validate query structure
      this.validateQueryStructure(query)

      // Apply security filters and transformations
      const rewrittenQuery = this.applySecurityFilters(query, securityContext)
      
      // Apply query transformations
      const finalQuery = this.applyQueryTransformations(rewrittenQuery)

      this.logSuccessfulRewrite(query, finalQuery, securityContext)
      
      return finalQuery

    } catch (error) {
      // Use the enhanced ErrorHandler for comprehensive error handling
      let securityContext: SecurityContext
      try {
        securityContext = this.extractSecurityContext(contextArg)
      } catch {
        // If we can't extract security context, create a minimal one for error handling
        securityContext = { tenantId: '' }
      }
      
      const errorResponse = this.errorHandler.handleQueryError(error, query, securityContext)
      
      // Create an enhanced error with the structured response
      const enhancedError = new Error(errorResponse.message) as QueryRewriteError
      enhancedError.code = 'QUERY_REWRITE_ERROR'
      enhancedError.statusCode = errorResponse.statusCode
      enhancedError.details = errorResponse.details
      enhancedError.suggestions = errorResponse.suggestions
      
      throw enhancedError
    }
  }

  /**
   * Extracts security context from various possible formats
   */
  private extractSecurityContext(contextArg: any): SecurityContext {
    if (!contextArg) {
      throw this.createQueryRewriteError(
        'MISSING_SECURITY_CONTEXT',
        'Security context is required but was not provided',
        401,
        {
          received: contextArg,
          expected: 'Object with tenantId and optional segments'
        },
        [
          'Ensure the request includes a valid security context',
          'Check that authentication middleware is properly configured',
          'Verify JWT token contains required tenantId field'
        ]
      )
    }

    // Handle nested security context
    if (contextArg.securityContext) {
      return contextArg.securityContext
    }

    // Handle direct security context
    if (contextArg.tenantId) {
      return contextArg
    }

    throw this.createQueryRewriteError(
      'INVALID_SECURITY_CONTEXT_FORMAT',
      'Security context format is invalid',
      400,
      {
        received: contextArg,
        expectedFormats: [
          '{ securityContext: { tenantId: "...", segments: [...] } }',
          '{ tenantId: "...", segments: [...] }'
        ]
      },
      [
        'Ensure security context contains tenantId field',
        'Check authentication middleware implementation',
        'Verify JWT token structure matches expected format'
      ]
    )
  }

  /**
   * Validates security context structure and content
   */
  private validateSecurityContext(context: SecurityContext): void {
    // Validate tenantId
    if (!context.tenantId || typeof context.tenantId !== 'string' || context.tenantId.trim().length === 0) {
      throw this.createQueryRewriteError(
        'INVALID_TENANT_ID',
        'tenantId is required and must be a non-empty string',
        401,
        {
          tenantId: context.tenantId,
          type: typeof context.tenantId
        },
        [
          'Ensure tenantId is included in the security context',
          'Verify tenantId is a valid non-empty string',
          'Check JWT token generation includes tenantId claim'
        ]
      )
    }

    // Validate segments structure (optional but must be array if present)
    if (context.segments !== undefined) {
      if (!Array.isArray(context.segments)) {
        throw this.createQueryRewriteError(
          'INVALID_SEGMENTS_FORMAT',
          'segments must be an array if provided',
          400,
          {
            segments: context.segments,
            type: typeof context.segments
          },
          [
            'Ensure segments is an array of strings',
            'Remove segments field if not needed',
            'Check segment assignment logic in authentication'
          ]
        )
      }

      // Validate each segment
      for (const segment of context.segments) {
        if (typeof segment !== 'string' || segment.trim().length === 0) {
          throw this.createQueryRewriteError(
            'INVALID_SEGMENT_VALUE',
            'Each segment must be a non-empty string',
            400,
            {
              invalidSegment: segment,
              allSegments: context.segments
            },
            [
              'Ensure all segments are non-empty strings',
              'Remove invalid segments from the array',
              'Check segment generation logic'
            ]
          )
        }
      }
    }

    // Validate userId if present
    if (context.userId !== undefined && (typeof context.userId !== 'string' || context.userId.trim().length === 0)) {
      throw this.createQueryRewriteError(
        'INVALID_USER_ID',
        'userId must be a non-empty string if provided',
        400,
        {
          userId: context.userId,
          type: typeof context.userId
        },
        [
          'Ensure userId is a valid non-empty string',
          'Remove userId field if not needed',
          'Check user identification logic'
        ]
      )
    }
  }

  /**
   * Validates query structure before processing
   */
  private validateQueryStructure(query: any): void {
    if (!query) {
      throw this.createQueryRewriteError(
        'MISSING_QUERY',
        'Query is required but was not provided',
        400,
        { received: query },
        [
          'Ensure query object is included in the request',
          'Check query construction in the client application',
          'Verify API request format'
        ]
      )
    }

    if (!query.measures || !Array.isArray(query.measures) || query.measures.length === 0) {
      throw this.createQueryRewriteError(
        'MISSING_MEASURES',
        'Query must include at least one measure',
        400,
        {
          measures: query.measures,
          queryKeys: Object.keys(query)
        },
        [
          'Add at least one measure to the query (e.g., "Organizations.count")',
          'Check query construction logic',
          'Verify cube schema includes valid measures'
        ]
      )
    }

    // Validate measure format
    for (const measure of query.measures) {
      if (typeof measure !== 'string' || !measure.includes('.')) {
        throw this.createQueryRewriteError(
          'INVALID_MEASURE_FORMAT',
          `Invalid measure format: ${measure}. Expected format: Cube.measure`,
          400,
          {
            invalidMeasure: measure,
            allMeasures: query.measures
          },
          [
            'Use format "Cube.measure" (e.g., "Organizations.count")',
            'Check available measures in cube schema',
            'Verify measure names are correctly spelled'
          ]
        )
      }
    }
  }

  /**
   * Applies security filters to the query
   */
  private applySecurityFilters(query: any, context: SecurityContext): any {
    // Create a deep copy to avoid mutating the original
    const rewrittenQuery = JSON.parse(JSON.stringify(query))

    // Initialize filters array if not present
    if (!rewrittenQuery.filters) {
      rewrittenQuery.filters = []
    }

    // Get the primary cube from the first measure
    const measureCube = rewrittenQuery.measures[0].split('.')[0]

    // Add tenant filter
    rewrittenQuery.filters.push({
      member: `${measureCube}.tenantId`,
      operator: 'equals',
      values: [context.tenantId]
    })

    // Add segments filter if segments are provided
    if (context.segments && context.segments.length > 0) {
      rewrittenQuery.filters.push({
        member: 'Segments.id',
        operator: 'equals',
        values: context.segments
      })
    }

    // Add Members.isBot filter for Members cube queries (existing logic)
    if (measureCube === 'Members') {
      rewrittenQuery.filters.push({
        member: 'Members.isBot',
        operator: 'equals',
        values: ['0']
      })
    }

    return rewrittenQuery
  }

  /**
   * Applies query transformations and cleanup
   */
  private applyQueryTransformations(query: any): any {
    // Handle time dimensions without granularity or dateRange
    if (query.timeDimensions && query.timeDimensions[0]) {
      const timeDim = query.timeDimensions[0]
      
      if (!('granularity' in timeDim) && 
          (!('dateRange' in timeDim) || timeDim.dateRange === undefined)) {
        query.timeDimensions = []
      }
    }

    // Handle Members.score dimension filter
    if (query.dimensions && query.dimensions[0] === 'Members.score') {
      if (!query.filters) {
        query.filters = []
      }
      
      query.filters.push({
        member: 'Members.score',
        operator: 'notEquals',
        values: ['-1']
      })
    }

    // Handle Members.cumulativeCount with time dimensions
    if (query.measures[0] === 'Members.cumulativeCount' && 
        query.timeDimensions && query.timeDimensions[0] && 
        !query.timeDimensions[0].dateRange) {
      query.timeDimensions[0].dateRange = ['2020-01-01', new Date().toISOString()]
    }

    return query
  }

  /**
   * Creates a structured query rewrite error
   */
  private createQueryRewriteError(
    code: string, 
    message: string, 
    statusCode: number, 
    details?: any, 
    suggestions?: string[]
  ): QueryRewriteError {
    const error = new Error(message) as QueryRewriteError
    error.code = code
    error.statusCode = statusCode
    error.details = details
    error.suggestions = suggestions
    return error
  }

  /**
   * Enhances generic errors with additional context
   */
  private enhanceError(error: any, query: any, contextArg: any): QueryRewriteError {
    if (error.code && error.statusCode) {
      return error // Already enhanced
    }

    return this.createQueryRewriteError(
      'QUERY_REWRITE_ERROR',
      `Query rewrite failed: ${error.message}`,
      500,
      {
        originalError: error.message,
        query,
        contextArg
      },
      [
        'Check query structure and security context format',
        'Verify cube schema definitions',
        'Review server logs for additional details'
      ]
    )
  }

  /**
   * Logs successful query rewrites
   */
  private logSuccessfulRewrite(originalQuery: any, rewrittenQuery: any, context: SecurityContext): void {
    this.logger.info('Query rewrite successful', {
      correlationId: this.correlationId,
      tenantId: context.tenantId,
      measures: originalQuery.measures,
      filtersAdded: rewrittenQuery.filters.length - (originalQuery.filters?.length || 0),
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Logs query rewrite errors with structured format
   */
  private logQueryRewriteError(error: any, query: any, contextArg: any): void {
    const structuredError: StructuredError = {
      timestamp: new Date(),
      level: 'error',
      category: 'security',
      message: `Query rewrite failed: ${error.message}`,
      details: {
        query,
        securityContext: this.sanitizeContextForLogging(contextArg),
        stackTrace: error.stack,
        suggestions: error.suggestions || []
      },
      correlationId: this.correlationId
    }

    this.logger.error('Query rewrite error', structuredError)
  }

  /**
   * Sanitizes security context for safe logging (removes sensitive data)
   */
  private sanitizeContextForLogging(contextArg: any): any {
    if (!contextArg) return contextArg

    const sanitized = { ...contextArg }
    
    // Remove or mask sensitive fields
    if (sanitized.password) delete sanitized.password
    if (sanitized.token) sanitized.token = '[REDACTED]'
    if (sanitized.secret) sanitized.secret = '[REDACTED]'
    
    if (sanitized.securityContext) {
      sanitized.securityContext = { ...sanitized.securityContext }
      if (sanitized.securityContext.password) delete sanitized.securityContext.password
      if (sanitized.securityContext.token) sanitized.securityContext.token = '[REDACTED]'
      if (sanitized.securityContext.secret) sanitized.securityContext.secret = '[REDACTED]'
    }

    return sanitized
  }
}

/**
 * Factory function to create the enhanced query rewriter function
 * for use in cube.js configuration
 */
export function createEnhancedQueryRewriter(logger?: any) {
  const rewriter = new EnhancedQueryRewriter(logger)
  
  return (query: any, contextArg: any) => {
    return rewriter.rewriteQuery(query, contextArg)
  }
}

/**
 * Legacy compatibility function that maintains the original interface
 * but with enhanced error handling
 */
export function enhancedQueryRewrite(query: any, contextArg: any): any {
  const rewriter = new EnhancedQueryRewriter()
  return rewriter.rewriteQuery(query, contextArg)
}