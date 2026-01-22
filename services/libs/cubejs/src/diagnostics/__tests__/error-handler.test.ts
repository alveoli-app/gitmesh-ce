/**
 * Tests for ErrorHandler implementation
 */

import { ErrorHandler, ErrorCategory } from '../error-handler'
import { CubeQuery, SecurityContext } from '../interfaces'

// Mock logger for testing
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn(() => mockLogger)
} as any

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler

  beforeEach(() => {
    errorHandler = new ErrorHandler(mockLogger)
    errorHandler.clearErrorHistory()
    jest.clearAllMocks()
  })

  describe('handleQueryError', () => {
    it('should handle security errors correctly', () => {
      const error = new Error('Unauthorized access')
      const query: CubeQuery = { measures: ['count'] }
      const context: SecurityContext = { tenantId: '' } // Missing tenant ID

      const response = errorHandler.handleQueryError(error, query, context)

      expect(response.statusCode).toBe(401)
      expect(response.message).toContain('tenant identifier')
      expect(response.suggestions).toContain('Ensure you\'re logged in to your organization')
      expect(response.debugInfo?.correlationId).toBeDefined()
    })

    it('should handle schema errors correctly', () => {
      const error = new Error('relation "mv_organizations" does not exist')
      const query: CubeQuery = { measures: ['Organizations.count'] }
      const context: SecurityContext = { tenantId: 'test-tenant' }

      const response = errorHandler.handleQueryError(error, query, context)

      expect(response.statusCode).toBe(400)
      expect(response.message).toContain('data source doesn\'t exist')
      expect(response.suggestions).toContain('Check if the data source name is spelled correctly')
    })

    it('should handle query errors correctly', () => {
      const error = new Error('Query validation failed')
      const query: CubeQuery = { measures: [] } // Missing measures
      const context: SecurityContext = { tenantId: 'test-tenant' }

      const response = errorHandler.handleQueryError(error, query, context)

      expect(response.statusCode).toBe(400)
      expect(response.message).toContain('metrics to calculate')
      expect(response.suggestions).toContain('Select at least one metric from the available options')
    })

    it('should handle database errors correctly', () => {
      const error = new Error('ECONNREFUSED: Connection refused')
      const query: CubeQuery = { measures: ['count'] }
      const context: SecurityContext = { tenantId: 'test-tenant' }

      const response = errorHandler.handleQueryError(error, query, context)

      expect(response.statusCode).toBe(500)
      expect(response.message).toContain('connect to the data source')
      expect(response.suggestions).toContain('Wait a moment and try again')
    })
  })

  describe('error classification', () => {
    it('should classify security errors correctly', () => {
      const error = new Error('Unauthorized')
      const query: CubeQuery = { measures: ['count'] }
      const context: SecurityContext = { tenantId: '' }

      const response = errorHandler.handleQueryError(error, query, context)
      expect(response.statusCode).toBe(401)
    })

    it('should classify database errors correctly', () => {
      const error = new Error('connection timeout')
      const query: CubeQuery = { measures: ['count'] }
      const context: SecurityContext = { tenantId: 'test' }

      const response = errorHandler.handleQueryError(error, query, context)
      expect(response.statusCode).toBe(500)
    })

    it('should classify schema errors correctly', () => {
      const error = new Error('table does not exist')
      const query: CubeQuery = { measures: ['count'] }
      const context: SecurityContext = { tenantId: 'test' }

      const response = errorHandler.handleQueryError(error, query, context)
      expect(response.statusCode).toBe(400)
    })
  })

  describe('error reporting', () => {
    it('should generate error reports', async () => {
      // Generate some test errors
      const error1 = new Error('Schema error')
      const error2 = new Error('Connection failed')
      const query: CubeQuery = { measures: ['count'] }
      const context: SecurityContext = { tenantId: 'test' }

      errorHandler.handleQueryError(error1, query, context)
      errorHandler.handleQueryError(error2, query, context)

      const report = await errorHandler.generateErrorReport()

      expect(report.totalErrors).toBe(2)
      expect(report.errorsByCategory).toHaveProperty('schema')
      expect(report.errorsByCategory).toHaveProperty('database')
      expect(report.recommendations).toBeInstanceOf(Array)
      expect(report.recentErrors).toHaveLength(2)
    })

    it('should provide statistics', () => {
      const error = new Error('Test error')
      const query: CubeQuery = { measures: ['count'] }
      const context: SecurityContext = { tenantId: 'test' }

      errorHandler.handleQueryError(error, query, context)

      const stats = errorHandler.getErrorStatistics()
      expect(stats.total).toBe(1)
      expect(stats.last24Hours).toBe(1)
      expect(stats.byCategory).toHaveProperty('query')
    })
  })

  describe('structured logging', () => {
    it('should log structured errors with correlation IDs', () => {
      const error = new Error('Test error')
      const query: CubeQuery = { measures: ['count'] }
      const context: SecurityContext = { tenantId: 'test-tenant', userId: 'test-user' }

      const response = errorHandler.handleQueryError(error, query, context)

      expect(response.debugInfo?.correlationId).toBeDefined()
      expect(typeof response.debugInfo?.correlationId).toBe('string')
    })

    it('should include query and context details in logs', () => {
      const error = new Error('Test error')
      const query: CubeQuery = { 
        measures: ['Organizations.count'], 
        dimensions: ['Organizations.name'],
        filters: [{ member: 'Organizations.isActive', operator: 'equals', values: [true] }]
      }
      const context: SecurityContext = { 
        tenantId: 'test-tenant', 
        userId: 'test-user',
        segments: ['segment1', 'segment2']
      }

      const response = errorHandler.handleQueryError(error, query, context)

      expect(response.details).toContain('Measures: 1 requested')
      expect(response.details).toContain('Dimensions: 1 requested')
      expect(response.details).toContain('Filters: 1 applied')
    })
  })
})