/**
 * QueryValidator implementation for validating CubeJS query structure and security context
 * 
 * This class provides comprehensive validation of:
 * - Security context validation (tenantId, segments)
 * - Query syntax and structure validation
 * - Dashboard query compatibility testing
 * 
 * Requirements: 1.3, 3.5
 */

import { QueryValidator as IQueryValidator } from './interfaces'
import {
  CubeQuery,
  SecurityContext,
  QueryValidationResult,
  SecurityContextResult,
  DashboardQueryResult,
  Filter,
  TimeDimension
} from './types'
import { v4 as uuidv4 } from 'uuid'

export class QueryValidator implements IQueryValidator {
  private readonly logger: any
  private readonly correlationId: string

  constructor(logger?: any) {
    this.logger = logger || console
    this.correlationId = uuidv4()
  }

  /**
   * Validates a cube query with its security context
   */
  async validateQuery(query: CubeQuery, context: SecurityContext): Promise<QueryValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    let sanitizedQuery: CubeQuery | undefined

    try {
      // First validate the security context
      const contextResult = await this.validateSecurityContext(context)
      if (!contextResult.isValid) {
        errors.push(...contextResult.errors)
        return {
          isValid: false,
          errors,
          warnings
        }
      }

      // Validate query structure
      const structureValidation = this.validateQueryStructure(query)
      errors.push(...structureValidation.errors)
      warnings.push(...structureValidation.warnings)

      // Validate measures
      const measuresValidation = this.validateMeasures(query.measures)
      errors.push(...measuresValidation.errors)
      warnings.push(...measuresValidation.warnings)

      // Validate dimensions if present
      if (query.dimensions && query.dimensions.length > 0) {
        const dimensionsValidation = this.validateDimensions(query.dimensions)
        errors.push(...dimensionsValidation.errors)
        warnings.push(...dimensionsValidation.warnings)
      }

      // Validate filters if present
      if (query.filters && query.filters.length > 0) {
        const filtersValidation = this.validateFilters(query.filters)
        errors.push(...filtersValidation.errors)
        warnings.push(...filtersValidation.warnings)
      }

      // Validate time dimensions if present
      if (query.timeDimensions && query.timeDimensions.length > 0) {
        const timeValidation = this.validateTimeDimensions(query.timeDimensions)
        errors.push(...timeValidation.errors)
        warnings.push(...timeValidation.warnings)
      }

      // Create sanitized query if validation passes
      if (errors.length === 0) {
        sanitizedQuery = this.sanitizeQuery(query, context)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedQuery
      }

    } catch (error) {
      this.logger.error('Query validation failed:', {
        error: error.message,
        query,
        context,
        correlationId: this.correlationId
      })

      return {
        isValid: false,
        errors: [`Query validation failed: ${error.message}`],
        warnings
      }
    }
  }

  /**
   * Validates a security context
   */
  async validateSecurityContext(context: SecurityContext): Promise<SecurityContextResult> {
    const errors: string[] = []

    if (!context) {
      errors.push('Security context is required')
      return {
        isValid: false,
        hasTenantId: false,
        hasSegments: false,
        errors
      }
    }

    // Validate tenantId
    const hasTenantId = !!(context.tenantId && typeof context.tenantId === 'string' && context.tenantId.trim().length > 0)
    if (!hasTenantId) {
      errors.push('tenantId is required and must be a non-empty string')
    }

    // Validate segments (optional but should be array if present)
    const hasSegments = !!(context.segments && Array.isArray(context.segments))
    if (context.segments !== undefined && !Array.isArray(context.segments)) {
      errors.push('segments must be an array if provided')
    }

    // Validate userId if present
    if (context.userId !== undefined && (typeof context.userId !== 'string' || context.userId.trim().length === 0)) {
      errors.push('userId must be a non-empty string if provided')
    }

    // Validate permissions if present
    if (context.permissions !== undefined && !Array.isArray(context.permissions)) {
      errors.push('permissions must be an array if provided')
    }

    return {
      isValid: errors.length === 0,
      hasTenantId,
      hasSegments,
      errors
    }
  }

  /**
   * Tests all known dashboard queries
   */
  async testDashboardQueries(): Promise<DashboardQueryResult[]> {
    const results: DashboardQueryResult[] = []

    // Define known dashboard queries based on the cube schemas
    const dashboardQueries = [
      {
        name: 'Organizations.count',
        query: {
          measures: ['Organizations.count']
        }
      },
      {
        name: 'Members.count',
        query: {
          measures: ['Members.count']
        }
      },
      {
        name: 'Members.count with isOrganization filter',
        query: {
          measures: ['Members.count'],
          filters: [
            {
              member: 'Members.isOrganization',
              operator: 'equals',
              values: ['false']
            }
          ]
        }
      },
      {
        name: 'Members.count with isTeamMember filter',
        query: {
          measures: ['Members.count'],
          filters: [
            {
              member: 'Members.isTeamMember',
              operator: 'equals',
              values: ['true']
            }
          ]
        }
      },
      {
        name: 'Members.count with isBot filter',
        query: {
          measures: ['Members.count'],
          filters: [
            {
              member: 'Members.isBot',
              operator: 'equals',
              values: ['false']
            }
          ]
        }
      },
      {
        name: 'Activities.count',
        query: {
          measures: ['Activities.count']
        }
      },
      {
        name: 'Activities.count with time dimension',
        query: {
          measures: ['Activities.count'],
          timeDimensions: [
            {
              dimension: 'Activities.date',
              granularity: 'day'
            }
          ]
        }
      },
      {
        name: 'Activities.count with sentiment and platform dimensions',
        query: {
          measures: ['Activities.count'],
          dimensions: ['Activities.sentimentMood', 'Activities.platform']
        }
      }
    ]

    // Test each query with a mock security context
    const mockContext: SecurityContext = {
      tenantId: 'test-tenant-id',
      segments: ['test-segment']
    }

    for (const testCase of dashboardQueries) {
      const startTime = Date.now()
      
      try {
        const validationResult = await this.validateQuery(testCase.query, mockContext)
        const responseTime = Date.now() - startTime

        results.push({
          queryName: testCase.name,
          success: validationResult.isValid,
          responseTime,
          error: validationResult.errors.length > 0 ? validationResult.errors.join('; ') : undefined,
          result: validationResult.sanitizedQuery
        })

      } catch (error) {
        const responseTime = Date.now() - startTime
        
        results.push({
          queryName: testCase.name,
          success: false,
          responseTime,
          error: error.message,
          result: undefined
        })
      }
    }

    return results
  }

  /**
   * Validates the basic structure of a query
   */
  private validateQueryStructure(query: CubeQuery): { errors: string[], warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!query) {
      errors.push('Query is required')
      return { errors, warnings }
    }

    // Measures are required
    if (!query.measures || !Array.isArray(query.measures) || query.measures.length === 0) {
      errors.push('At least one measure is required')
    }

    // Validate optional arrays
    if (query.dimensions !== undefined && !Array.isArray(query.dimensions)) {
      errors.push('dimensions must be an array if provided')
    }

    if (query.timeDimensions !== undefined && !Array.isArray(query.timeDimensions)) {
      errors.push('timeDimensions must be an array if provided')
    }

    if (query.filters !== undefined && !Array.isArray(query.filters)) {
      errors.push('filters must be an array if provided')
    }

    if (query.segments !== undefined && !Array.isArray(query.segments)) {
      errors.push('segments must be an array if provided')
    }

    // Validate numeric fields
    if (query.limit !== undefined && (typeof query.limit !== 'number' || query.limit < 0)) {
      errors.push('limit must be a non-negative number if provided')
    }

    if (query.offset !== undefined && (typeof query.offset !== 'number' || query.offset < 0)) {
      errors.push('offset must be a non-negative number if provided')
    }

    return { errors, warnings }
  }

  /**
   * Validates measures array
   */
  private validateMeasures(measures: string[]): { errors: string[], warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    const validCubes = ['Organizations', 'Members', 'Activities', 'Conversations']
    const validMeasures = ['count', 'cumulativeCount']

    for (const measure of measures) {
      if (typeof measure !== 'string' || measure.trim().length === 0) {
        errors.push('Each measure must be a non-empty string')
        continue
      }

      const parts = measure.split('.')
      if (parts.length !== 2) {
        errors.push(`Invalid measure format: ${measure}. Expected format: Cube.measure`)
        continue
      }

      const [cube, measureName] = parts
      if (!validCubes.includes(cube)) {
        warnings.push(`Unknown cube: ${cube}. Known cubes: ${validCubes.join(', ')}`)
      }

      if (!validMeasures.includes(measureName)) {
        warnings.push(`Unknown measure: ${measureName}. Known measures: ${validMeasures.join(', ')}`)
      }
    }

    return { errors, warnings }
  }

  /**
   * Validates dimensions array
   */
  private validateDimensions(dimensions: string[]): { errors: string[], warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    const validCubes = ['Organizations', 'Members', 'Activities', 'Conversations']

    for (const dimension of dimensions) {
      if (typeof dimension !== 'string' || dimension.trim().length === 0) {
        errors.push('Each dimension must be a non-empty string')
        continue
      }

      const parts = dimension.split('.')
      if (parts.length !== 2) {
        errors.push(`Invalid dimension format: ${dimension}. Expected format: Cube.dimension`)
        continue
      }

      const [cube] = parts
      if (!validCubes.includes(cube)) {
        warnings.push(`Unknown cube: ${cube}. Known cubes: ${validCubes.join(', ')}`)
      }
    }

    return { errors, warnings }
  }

  /**
   * Validates filters array
   */
  private validateFilters(filters: Filter[]): { errors: string[], warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    const validOperators = ['equals', 'notEquals', 'contains', 'notContains', 'gt', 'gte', 'lt', 'lte', 'inDateRange']

    for (const filter of filters) {
      if (!filter.member || typeof filter.member !== 'string') {
        errors.push('Filter member is required and must be a string')
        continue
      }

      if (!filter.operator || typeof filter.operator !== 'string') {
        errors.push('Filter operator is required and must be a string')
        continue
      }

      if (!validOperators.includes(filter.operator)) {
        warnings.push(`Unknown operator: ${filter.operator}. Known operators: ${validOperators.join(', ')}`)
      }

      if (!Array.isArray(filter.values)) {
        errors.push('Filter values must be an array')
        continue
      }

      if (filter.values.length === 0) {
        warnings.push(`Filter for ${filter.member} has empty values array`)
      }
    }

    return { errors, warnings }
  }

  /**
   * Validates time dimensions array
   */
  private validateTimeDimensions(timeDimensions: TimeDimension[]): { errors: string[], warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    const validGranularities = ['second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year']

    for (const timeDim of timeDimensions) {
      if (!timeDim.dimension || typeof timeDim.dimension !== 'string') {
        errors.push('Time dimension must have a dimension field as string')
        continue
      }

      if (timeDim.granularity && !validGranularities.includes(timeDim.granularity)) {
        warnings.push(`Unknown granularity: ${timeDim.granularity}. Known granularities: ${validGranularities.join(', ')}`)
      }

      if (timeDim.dateRange) {
        if (Array.isArray(timeDim.dateRange)) {
          if (timeDim.dateRange.length !== 2) {
            errors.push('Date range array must have exactly 2 elements')
          }
        } else if (typeof timeDim.dateRange !== 'string') {
          errors.push('Date range must be either an array of 2 strings or a single string')
        }
      }
    }

    return { errors, warnings }
  }

  /**
   * Creates a sanitized version of the query
   */
  private sanitizeQuery(query: CubeQuery, context: SecurityContext): CubeQuery {
    const sanitized: CubeQuery = {
      measures: [...query.measures]
    }

    if (query.dimensions) {
      sanitized.dimensions = [...query.dimensions]
    }

    if (query.timeDimensions) {
      sanitized.timeDimensions = query.timeDimensions.map(td => ({ ...td }))
    }

    if (query.filters) {
      sanitized.filters = query.filters.map(f => ({ ...f, values: [...f.values] }))
    }

    if (query.segments) {
      sanitized.segments = [...query.segments]
    }

    if (query.limit !== undefined) {
      sanitized.limit = query.limit
    }

    if (query.offset !== undefined) {
      sanitized.offset = query.offset
    }

    return sanitized
  }
}