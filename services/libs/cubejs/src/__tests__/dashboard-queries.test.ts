/**
 * Comprehensive test suite for dashboard queries
 * Tests all known dashboard widget queries for both successful responses and error handling
 * Requirements: 7.1, 7.2
 */

import moment from 'moment'
import { CubeJsService } from '../service'
import CubeDimensions from '../dimensions'
import CubeMeasures from '../measures'

// Mock environment variables for testing
process.env.CUBEJS_URL = 'http://localhost:4000/cubejs-api/v1'
process.env.CUBEJS_JWT_SECRET = 'test-secret-key'
process.env.CUBEJS_JWT_EXPIRY = '1h'

describe('Dashboard Queries Test Suite', () => {
  let cubeService: CubeJsService
  const testTenantId = 'test-tenant-123'
  const testSegments = ['test-segment']

  beforeEach(async () => {
    cubeService = new CubeJsService()
    await cubeService.init(testTenantId, testSegments)
  })

  describe('Organizations.count queries', () => {
    test('should execute Organizations.count query successfully', async () => {
      const query = {
        measures: [CubeMeasures.ORGANIZATION_COUNT],
        limit: 1
      }

      // Mock the API response
      const mockResponse = { loadResponses: [{ data: [{ [CubeMeasures.ORGANIZATION_COUNT]: '5' }] }] }
      cubeService.api.load = jest.fn().mockResolvedValue(mockResponse)

      const result = await cubeService.load(query)
      
      expect(result).toBeDefined()
      expect(result[0]).toHaveProperty(CubeMeasures.ORGANIZATION_COUNT)
      expect(cubeService.api.load).toHaveBeenCalledWith(query)
    })

    test('should handle Organizations.count query errors', async () => {
      const query = {
        measures: [CubeMeasures.ORGANIZATION_COUNT],
        limit: 1
      }

      cubeService.api.load = jest.fn().mockRejectedValue(new Error('400 Bad Request'))

      await expect(cubeService.load(query)).rejects.toThrow('400 Bad Request')
    })
  })

  describe('Members.count queries with filters', () => {
    test('should execute Members.count with isTeamMember filter', async () => {
      const query = {
        measures: [CubeMeasures.MEMBER_COUNT],
        filters: [{
          member: CubeDimensions.IS_TEAM_MEMBER,
          operator: 'equals',
          values: ['false']
        }],
        limit: 1
      }

      const mockResponse = { loadResponses: [{ data: [{ [CubeMeasures.MEMBER_COUNT]: '10' }] }] }
      cubeService.api.load = jest.fn().mockResolvedValue(mockResponse)

      const result = await cubeService.load(query)
      
      expect(result).toBeDefined()
      expect(result[0]).toHaveProperty(CubeMeasures.MEMBER_COUNT)
    })

    test('should handle Members.count query errors with filters', async () => {
      const query = {
        measures: [CubeMeasures.MEMBER_COUNT],
        filters: [{
          member: 'InvalidDimension.field',
          operator: 'equals',
          values: ['false']
        }]
      }

      cubeService.api.load = jest.fn().mockRejectedValue(new Error('400 Bad Request: Invalid dimension'))

      await expect(cubeService.load(query)).rejects.toThrow('400 Bad Request: Invalid dimension')
    })
  })

  describe('Activities queries', () => {
    test('should execute Activities.count with time dimension', async () => {
      const startDate = moment().subtract(1, 'month')
      const endDate = moment()
      
      const query = {
        measures: [CubeMeasures.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: CubeDimensions.ACTIVITY_DATE,
          dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
        }],
        limit: 1
      }

      const mockResponse = { loadResponses: [{ data: [{ [CubeMeasures.ACTIVITY_COUNT]: '150' }] }] }
      cubeService.api.load = jest.fn().mockResolvedValue(mockResponse)

      const result = await cubeService.load(query)
      
      expect(result).toBeDefined()
      expect(result[0]).toHaveProperty(CubeMeasures.ACTIVITY_COUNT)
    })

    test('should handle Activities query errors', async () => {
      const query = {
        measures: [CubeMeasures.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: 'InvalidDimension.date',
          dateRange: ['2024-01-01', '2024-01-31']
        }]
      }

      cubeService.api.load = jest.fn().mockRejectedValue(new Error('400 Bad Request: Invalid time dimension'))

      await expect(cubeService.load(query)).rejects.toThrow('400 Bad Request: Invalid time dimension')
    })
  })

  describe('Error handling validation', () => {
    test('should validate successful response structure', async () => {
      const query = {
        measures: [CubeMeasures.ORGANIZATION_COUNT],
        limit: 1
      }

      const mockResponse = { loadResponses: [{ data: [{ [CubeMeasures.ORGANIZATION_COUNT]: '5' }] }] }
      cubeService.api.load = jest.fn().mockResolvedValue(mockResponse)

      const result = await cubeService.load(query)
      
      // Validate response structure
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toBeInstanceOf(Object)
      expect(Object.keys(result[0])).toContain(CubeMeasures.ORGANIZATION_COUNT)
    })

    test('should handle malformed query structure', async () => {
      const malformedQuery = {
        // Missing required measures
        dimensions: ['InvalidDimension'],
        limit: 1
      }

      cubeService.api.load = jest.fn().mockRejectedValue(new Error('400 Bad Request: Missing measures'))

      await expect(cubeService.load(malformedQuery)).rejects.toThrow('400 Bad Request: Missing measures')
    })

    test('should handle missing security context', async () => {
      // Create service without proper initialization
      const uninitializedService = new CubeJsService()
      
      const query = {
        measures: [CubeMeasures.ORGANIZATION_COUNT],
        limit: 1
      }

      // Should fail because service is not initialized with security context
      expect(uninitializedService.api).toBeUndefined()
    })
  })
})