import { SignalsValidation } from '../validation/signalsValidation'
import { Error400 } from '@gitmesh/common'

describe('SignalsValidation', () => {
  describe('validateListQuery', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        platform: 'github',
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        classification: ['engineering', 'bug_report'],
        clusterId: 'cluster-123',
        sortBy: 'timestamp',
        sortOrder: 'desc',
        limit: '50',
        cursor: Buffer.from(JSON.stringify({ timestamp: '2024-01-15T12:00:00Z' })).toString('base64')
      }

      expect(() => SignalsValidation.validateListQuery(validQuery)).not.toThrow()
    })

    it('should throw Error400 for invalid platform parameter', () => {
      const invalidQuery = { platform: '' }
      
      expect(() => SignalsValidation.validateListQuery(invalidQuery)).toThrow(Error400)
    })

    it('should throw Error400 for invalid memberId UUID', () => {
      const invalidQuery = { memberId: 'invalid-uuid' }
      
      expect(() => SignalsValidation.validateListQuery(invalidQuery)).toThrow(Error400)
    })

    it('should throw Error400 for invalid date format', () => {
      const invalidQuery = { startDate: 'invalid-date' }
      
      expect(() => SignalsValidation.validateListQuery(invalidQuery)).toThrow(Error400)
    })

    it('should throw Error400 when startDate is after endDate', () => {
      const invalidQuery = {
        startDate: '2024-01-31T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z'
      }
      
      expect(() => SignalsValidation.validateListQuery(invalidQuery)).toThrow(Error400)
    })

    it('should throw Error400 for invalid classification', () => {
      const invalidQuery = { classification: ['invalid-classification'] }
      
      expect(() => SignalsValidation.validateListQuery(invalidQuery)).toThrow(Error400)
    })

    it('should throw Error400 for invalid sortBy field', () => {
      const invalidQuery = { sortBy: 'invalid-field' }
      
      expect(() => SignalsValidation.validateListQuery(invalidQuery)).toThrow(Error400)
    })

    it('should throw Error400 for limit out of range', () => {
      const invalidQuery = { limit: '2000' }
      
      expect(() => SignalsValidation.validateListQuery(invalidQuery)).toThrow(Error400)
    })

    it('should throw Error400 for invalid cursor format', () => {
      const invalidQuery = { cursor: 'invalid-base64' }
      
      expect(() => SignalsValidation.validateListQuery(invalidQuery)).toThrow(Error400)
    })
  })

  describe('validateFindByIdParams', () => {
    it('should validate valid UUID parameter', () => {
      const validParams = { id: '123e4567-e89b-12d3-a456-426614174000' }
      
      expect(() => SignalsValidation.validateFindByIdParams(validParams)).not.toThrow()
    })

    it('should throw Error400 for missing id parameter', () => {
      const invalidParams = {}
      
      expect(() => SignalsValidation.validateFindByIdParams(invalidParams)).toThrow(Error400)
    })

    it('should throw Error400 for invalid UUID format', () => {
      const invalidParams = { id: 'invalid-uuid' }
      
      expect(() => SignalsValidation.validateFindByIdParams(invalidParams)).toThrow(Error400)
    })
  })

  describe('validateExportQuery', () => {
    it('should validate valid export query', () => {
      const validQuery = {
        format: 'knowledge_graph',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      }
      
      expect(() => SignalsValidation.validateExportQuery(validQuery)).not.toThrow()
    })

    it('should throw Error400 for missing format parameter', () => {
      const invalidQuery = {}
      
      expect(() => SignalsValidation.validateExportQuery(invalidQuery)).toThrow(Error400)
    })

    it('should throw Error400 for invalid format', () => {
      const invalidQuery = { format: 'invalid-format' }
      
      expect(() => SignalsValidation.validateExportQuery(invalidQuery)).toThrow(Error400)
    })
  })

  describe('sanitizeQuery', () => {
    it('should normalize and sanitize query parameters', () => {
      const query = {
        sortOrder: 'desc',
        limit: '50',
        pageSize: '25',
        classification: 'engineering',
        platform: '  github  '
      }
      
      const sanitized = SignalsValidation.sanitizeQuery(query)
      
      expect(sanitized.sortOrder).toBe('DESC')
      expect(sanitized.limit).toBe(50)
      expect(sanitized.pageSize).toBe(25)
      expect(sanitized.classification).toEqual(['engineering'])
      expect(sanitized.platform).toBe('github')
    })
  })
})