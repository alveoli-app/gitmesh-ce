/**
 * Basic tests for diagnostic infrastructure setup
 * Validates that interfaces, types, and logging utilities are properly configured
 */

import * as fc from 'fast-check'
import {
  DiagnosticLogger,
  CorrelationContext,
  createDiagnosticLogger,
  generateCorrelationId,
  createSearchableFields
} from '../diagnostics/logging'
import {
  CubeQuery,
  SecurityContext,
  StructuredError
} from '../diagnostics/types'

// Configure fast-check for property-based testing
fc.configureGlobal({
  numRuns: 100,
  verbose: false,
  seed: 42,
  endOnFailure: true
})

// Mock logger for testing
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}

describe('Diagnostic Infrastructure Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    CorrelationContext.getInstance().clearCorrelationId()
  })

  describe('CorrelationContext', () => {
    it('should generate unique correlation IDs', () => {
      const context = CorrelationContext.getInstance()
      const id1 = context.generateNewCorrelationId()
      const id2 = context.generateNewCorrelationId()
      
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(typeof id2).toBe('string')
    })

    it('should maintain correlation ID across calls', () => {
      const context = CorrelationContext.getInstance()
      const id = context.generateNewCorrelationId()
      
      expect(context.getCorrelationId()).toBe(id)
      expect(context.getCorrelationId()).toBe(id)
    })

    it('should clear correlation ID when requested', () => {
      const context = CorrelationContext.getInstance()
      const id1 = context.generateNewCorrelationId()
      
      context.clearCorrelationId()
      const id2 = context.getCorrelationId()
      
      expect(id2).not.toBe(id1)
    })
  })

  describe('DiagnosticLogger', () => {
    let logger: DiagnosticLogger

    beforeEach(() => {
      logger = createDiagnosticLogger(mockLogger as any)
    })

    it('should log structured errors with all required fields', () => {
      const structuredError: StructuredError = {
        timestamp: new Date(),
        level: 'error',
        category: 'query',
        message: 'Test error',
        details: {
          suggestions: ['Test suggestion']
        },
        correlationId: generateCorrelationId()
      }

      logger.logStructuredError(structuredError)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          level: 'error',
          category: 'query',
          message: 'Test error',
          correlationId: expect.any(String),
          details: expect.any(Object),
          searchable: expect.any(Object)
        }),
        'Test error'
      )
    })

    it('should sanitize sensitive data in queries', () => {
      const query: CubeQuery = {
        measures: ['Organizations.count'],
        filters: [{
          member: 'Organizations.tenantId',
          operator: 'equals',
          values: ['sensitive-tenant-id']
        }]
      }

      const context: SecurityContext = {
        tenantId: 'test-tenant',
        userId: 'sensitive-user-id'
      }

      logger.logQueryValidationError('Test query error', query, context)

      const logCall = mockLogger.error.mock.calls[0][0]
      expect(logCall.details.query.filters[0].values).toBe('[REDACTED]')
      expect(logCall.details.securityContext.userId).toBe('[REDACTED]')
      expect(logCall.details.securityContext.tenantId).toBe('test-tenant')
    })

    it('should create diagnostic sessions with correlation IDs', () => {
      const sessionId = logger.startDiagnosticSession()
      
      expect(sessionId).toBeDefined()
      expect(typeof sessionId).toBe('string')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Starting diagnostic session',
          correlationId: sessionId
        }),
        'Starting diagnostic session'
      )
    })
  })

  describe('Utility Functions', () => {
    it('should generate valid correlation IDs', () => {
      const id = generateCorrelationId()
      
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
      // UUID v4 format check
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('should create searchable fields with required properties', () => {
      const fields = createSearchableFields('test-category', { customField: 'value' })
      
      expect(fields).toEqual({
        category: 'test-category',
        timestamp: expect.any(String),
        isDiagnostic: true,
        customField: 'value'
      })
    })
  })

  describe('Property-Based Tests', () => {
    it('should handle arbitrary correlation IDs correctly', () => {
      fc.assert(fc.property(fc.string(), (testString) => {
        const context = CorrelationContext.getInstance()
        context.setCorrelationId(testString)
        
        const retrievedId = context.getCorrelationId()
        expect(retrievedId).toBe(testString)
      }))
    })

    it('should sanitize arbitrary query objects safely', () => {
      const queryArb = fc.record({
        measures: fc.array(fc.string(), { minLength: 1 }),
        dimensions: fc.option(fc.array(fc.string())),
        filters: fc.option(fc.array(fc.record({
          member: fc.string(),
          operator: fc.string(),
          values: fc.array(fc.anything())
        })))
      })

      fc.assert(fc.property(queryArb, (query) => {
        const logger = createDiagnosticLogger(mockLogger as any)
        const context: SecurityContext = { tenantId: 'test' }
        
        // Should not throw when logging arbitrary queries
        expect(() => {
          logger.logQueryValidationError('Test', query as CubeQuery, context)
        }).not.toThrow()
      }))
    })
  })
})