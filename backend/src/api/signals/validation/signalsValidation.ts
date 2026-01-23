import { Error400 } from '@gitmesh/common'

/**
 * Validation utilities for Signals API endpoints
 */
export class SignalsValidation {
  /**
   * Validate query parameters for GET /api/v1/signals endpoint
   */
  static validateListQuery(query: any) {
    const errors: string[] = []

    // Validate platform parameter
    if (query.platform !== undefined) {
      if (typeof query.platform !== 'string' || query.platform.trim() === '') {
        errors.push('platform must be a non-empty string')
      }
    }

    // Validate memberId parameter
    if (query.memberId !== undefined) {
      if (typeof query.memberId !== 'string' || query.memberId.trim() === '') {
        errors.push('memberId must be a non-empty string')
      }
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (query.memberId && !uuidRegex.test(query.memberId)) {
        errors.push('memberId must be a valid UUID')
      }
    }

    // Validate date parameters
    if (query.startDate !== undefined) {
      const startDate = new Date(query.startDate)
      if (isNaN(startDate.getTime())) {
        errors.push('startDate must be a valid ISO 8601 date string')
      }
    }

    if (query.endDate !== undefined) {
      const endDate = new Date(query.endDate)
      if (isNaN(endDate.getTime())) {
        errors.push('endDate must be a valid ISO 8601 date string')
      }
    }

    // Validate date range
    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate)
      const endDate = new Date(query.endDate)
      if (startDate > endDate) {
        errors.push('startDate must be before endDate')
      }
    }

    // Validate classification parameter
    if (query.classification !== undefined) {
      if (!Array.isArray(query.classification)) {
        // Handle single classification value
        if (typeof query.classification !== 'string') {
          errors.push('classification must be a string or array of strings')
        } else {
          query.classification = [query.classification]
        }
      }
      
      if (Array.isArray(query.classification)) {
        const validClassifications = [
          'engineering', 'design', 'marketing', 'sales', 'support', 'product',
          'positive', 'negative', 'neutral', 'mixed',
          'critical', 'high', 'medium', 'low',
          'question', 'feedback', 'bug_report', 'feature_request', 'discussion'
        ]
        
        for (const cls of query.classification) {
          if (typeof cls !== 'string' || !validClassifications.includes(cls)) {
            errors.push(`classification "${cls}" is not valid. Valid values: ${validClassifications.join(', ')}`)
          }
        }
      }
    }

    // Validate clusterId parameter
    if (query.clusterId !== undefined) {
      if (typeof query.clusterId !== 'string' || query.clusterId.trim() === '') {
        errors.push('clusterId must be a non-empty string')
      }
    }

    // Validate sortBy parameter
    if (query.sortBy !== undefined) {
      const validSortFields = ['timestamp', 'velocity_score', 'actionability_score', 'novelty_score']
      if (!validSortFields.includes(query.sortBy)) {
        errors.push(`sortBy must be one of: ${validSortFields.join(', ')}`)
      }
    }

    // Validate sortOrder parameter
    if (query.sortOrder !== undefined) {
      const validSortOrders = ['asc', 'desc', 'ASC', 'DESC']
      if (!validSortOrders.includes(query.sortOrder)) {
        errors.push('sortOrder must be "asc" or "desc"')
      }
    }

    // Validate pagination parameters
    if (query.limit !== undefined) {
      const limit = parseInt(query.limit)
      if (isNaN(limit) || limit < 1 || limit > 1000) {
        errors.push('limit must be a number between 1 and 1000')
      }
    }

    if (query.offset !== undefined) {
      const offset = parseInt(query.offset)
      if (isNaN(offset) || offset < 0) {
        errors.push('offset must be a non-negative number')
      }
    }

    // Validate cursor parameter
    if (query.cursor !== undefined) {
      if (typeof query.cursor !== 'string') {
        errors.push('cursor must be a string')
      } else {
        try {
          // Validate base64 format
          const decoded = Buffer.from(query.cursor, 'base64').toString()
          JSON.parse(decoded)
        } catch (error) {
          errors.push('cursor must be a valid base64-encoded JSON string')
        }
      }
    }

    // Validate pageSize parameter (alias for limit)
    if (query.pageSize !== undefined) {
      const pageSize = parseInt(query.pageSize)
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 1000) {
        errors.push('pageSize must be a number between 1 and 1000')
      }
    }

    if (errors.length > 0) {
      throw new Error400(`Invalid query parameters: ${errors.join('; ')}`)
    }

    return query
  }

  /**
   * Validate parameters for GET /api/v1/signals/:id endpoint
   */
  static validateFindByIdParams(params: any) {
    const errors: string[] = []

    // Validate id parameter
    if (!params.id) {
      errors.push('id parameter is required')
    } else if (typeof params.id !== 'string') {
      errors.push('id must be a string')
    } else {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(params.id)) {
        errors.push('id must be a valid UUID')
      }
    }

    if (errors.length > 0) {
      throw new Error400(`Invalid parameters: ${errors.join('; ')}`)
    }

    return params
  }

  /**
   * Validate query parameters for GET /api/v1/signals/export endpoint
   */
  static validateExportQuery(query: any) {
    const errors: string[] = []

    // Validate format parameter (required)
    if (!query.format) {
      errors.push('format parameter is required')
    } else if (typeof query.format !== 'string') {
      errors.push('format must be a string')
    } else {
      const validFormats = ['knowledge_graph', 'recommendations']
      if (!validFormats.includes(query.format)) {
        errors.push(`format must be one of: ${validFormats.join(', ')}`)
      }
    }

    // Validate date parameters (same as list query)
    if (query.startDate !== undefined) {
      const startDate = new Date(query.startDate)
      if (isNaN(startDate.getTime())) {
        errors.push('startDate must be a valid ISO 8601 date string')
      }
    }

    if (query.endDate !== undefined) {
      const endDate = new Date(query.endDate)
      if (isNaN(endDate.getTime())) {
        errors.push('endDate must be a valid ISO 8601 date string')
      }
    }

    // Validate date range
    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate)
      const endDate = new Date(query.endDate)
      if (startDate > endDate) {
        errors.push('startDate must be before endDate')
      }
    }

    if (errors.length > 0) {
      throw new Error400(`Invalid query parameters: ${errors.join('; ')}`)
    }

    return query
  }

  /**
   * Sanitize and normalize query parameters
   */
  static sanitizeQuery(query: any) {
    const sanitized = { ...query }

    // Normalize sortOrder to uppercase
    if (sanitized.sortOrder) {
      sanitized.sortOrder = sanitized.sortOrder.toUpperCase()
    }

    // Convert string numbers to integers
    if (sanitized.limit) {
      sanitized.limit = parseInt(sanitized.limit)
    }
    if (sanitized.offset) {
      sanitized.offset = parseInt(sanitized.offset)
    }
    if (sanitized.pageSize) {
      sanitized.pageSize = parseInt(sanitized.pageSize)
    }

    // Ensure classification is an array
    if (sanitized.classification && !Array.isArray(sanitized.classification)) {
      sanitized.classification = [sanitized.classification]
    }

    // Trim string parameters
    const stringParams = ['platform', 'memberId', 'clusterId', 'sortBy', 'cursor', 'format']
    stringParams.forEach(param => {
      if (sanitized[param] && typeof sanitized[param] === 'string') {
        sanitized[param] = sanitized[param].trim()
      }
    })

    return sanitized
  }
}