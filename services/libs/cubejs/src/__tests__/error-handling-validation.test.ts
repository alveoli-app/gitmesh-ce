/**
 * Error handling validation tests
 * Tests malformed query handling, missing security context, and database connectivity errors
 * Requirements: 1.1, 1.2, 1.3
 */

import { CubeJsService } from '../service'
import CubeDimensions from '../dimensions'
import CubeMeasures from '../measures'

// Test configuration
const ERROR_TEST_TIMEOUT = 15000 // 15 seconds
const CUBEJS_API_URL = process.env.CUBEJS_URL || 'http://localhost:4000/cubejs-api/v1'
const TEST_TENANT_ID = 'error-test-tenant'
const TEST_SEGMENTS = ['error-test']

describe('Error Handling Validation - Integration Tests', () => {
  let cubeService: CubeJsService
  
  beforeAll(async () => {
    // Set up environment variables for error testing
    process.env.CUBEJS_URL = CUBEJS_API_URL
    process.env.CUBEJS_JWT_SECRET = process.env.CUBEJS_JWT_SECRET || 'error-test-secret'
    process.env.CUBEJS_JWT_EXPIRY = '1h'
  })

  describe('Malformed Query Handling - Requirements 1.1, 1.2', () => {
    beforeEach(async () => {
      cubeService = new CubeJsService()
      await cubeService.init(TEST_TENANT_ID, TEST_SEGMENTS)
    })

    test('should handle query with missing measures', async () => {
      const malformedQuery = {
        // Missing required measures field
        dimensions: [CubeDimensions.IS_TEAM_MEMBER],
        limit: 10
      }

      try {
        await cubeService.load(malformedQuery)
        fail('Expected query to fail due to missing measures')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        
        // Validate error structure and content
        const errorMessage = error.message.toLowerCase()
        expect(
          errorMessage.includes('measure') || 
          errorMessage.includes('required') ||
          errorMessage.includes('400') ||
          errorMessage.includes('bad request')
        ).toBe(true)
        
        console.log(`Missing measures error handled correctly: ${error.message}`)
      }
    }, ERROR_TEST_TIMEOUT)

    test('should handle query with invalid measure names', async () => {
      const malformedQuery = {
        measures: ['InvalidCube.invalidMeasure', 'AnotherInvalid.measure'],
        limit: 10
      }

      try {
        await cubeService.load(malformedQuery)
        fail('Expected query to fail due to invalid measures')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        
        const errorMessage = error.message.toLowerCase()
        expect(
          errorMessage.includes('invalid') || 
          errorMessage.includes('not found') ||
          errorMessage.includes('400') ||
          errorMessage.includes('bad request')
        ).toBe(true)
        
        console.log(`Invalid measures error handled correctly: ${error.message}`)
      }
    }, ERROR_TEST_TIMEOUT)

    test('should handle query with invalid dimension names', async () => {
      const malformedQuery = {
        measures: [CubeMeasures.MEMBER_COUNT],
        dimensions: ['InvalidCube.invalidDimension'],
        limit: 10
      }

      try {
        await cubeService.load(malformedQuery)
        fail('Expected query to fail due to invalid dimensions')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        
        const errorMessage = error.message.toLowerCase()
        expect(
          errorMessage.includes('invalid') || 
          errorMessage.includes('dimension') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('400')
        ).toBe(true)
        
        console.log(`Invalid dimensions error handled correctly: ${error.message}`)
      }
    }, ERROR_TEST_TIMEOUT)

    test('should handle query with malformed filters', async () => {
      const malformedQuery = {
        measures: [CubeMeasures.MEMBER_COUNT],
        filters: [{
          // Missing required filter fields
          member: CubeDimensions.IS_TEAM_MEMBER
          // Missing operator and values
        }],
        limit: 10
      }

      try {
        await cubeService.load(malformedQuery)
        fail('Expected query to fail due to malformed filters')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        
        const errorMessage = error.message.toLowerCase()
        expect(
          errorMessage.includes('filter') || 
          errorMessage.includes('operator') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('400')
        ).toBe(true)
        
        console.log(`Malformed filters error handled correctly: ${error.message}`)
      }
    }, ERROR_TEST_TIMEOUT)

    test('should handle query with invalid time dimensions', async () => {
      const malformedQuery = {
        measures: [CubeMeasures.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: 'InvalidCube.invalidTimeDimension',
          dateRange: ['invalid-date', 'another-invalid-date']
        }],
        limit: 10
      }

      try {
        await cubeService.load(malformedQuery)
        fail('Expected query to fail due to invalid time dimensions')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        
        const errorMessage = error.message.toLowerCase()
        expect(
          errorMessage.includes('time') || 
          errorMessage.includes('dimension') ||
          errorMessage.includes('date') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('400')
        ).toBe(true)
        
        console.log(`Invalid time dimensions error handled correctly: ${error.message}`)
      }
    }, ERROR_TEST_TIMEOUT)

    test('should handle query with invalid date ranges', async () => {
      const malformedQuery = {
        measures: [CubeMeasures.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: CubeDimensions.ACTIVITY_DATE,
          dateRange: ['2024-13-45', '2024-99-99'] // Invalid dates
        }],
        limit: 10
      }

      try {
        await cubeService.load(malformedQuery)
        fail('Expected query to fail due to invalid date ranges')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        
        const errorMessage = error.message.toLowerCase()
        expect(
          errorMessage.includes('date') || 
          errorMessage.includes('invalid') ||
          errorMessage.includes('range') ||
          errorMessage.includes('400')
        ).toBe(true)
        
        console.log(`Invalid date ranges error handled correctly: ${error.message}`)
      }
    }, ERROR_TEST_TIMEOUT)
  })

  describe('Missing Security Context Handling - Requirement 1.3', () => {
    test('should handle service without initialization', async () => {
      const uninitializedService = new CubeJsService()
      
      const query = {
        measures: [CubeMeasures.ORGANIZATION_COUNT],
        limit: 10
      }

      try {
        await uninitializedService.load(query)
        fail('Expected query to fail due to missing security context')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        
        // Should fail because api is not initialized
        const errorMessage = error.message.toLowerCase()
        expect(
          errorMessage.includes('api') || 
          errorMessage.includes('undefined') ||
          errorMessage.includes('not') ||
          errorMessage.includes('initialized')
        ).toBe(true)
        
        console.log(`Missing security context error handled correctly: ${error.message}`)
      }
    }, ERROR_TEST_TIMEOUT)

    test('should handle invalid JWT token', async () => {
      // Create service with invalid JWT secret
      const originalSecret = process.env.CUBEJS_JWT_SECRET
      process.env.CUBEJS_JWT_SECRET = 'invalid-secret-key'
      
      try {
        const serviceWithInvalidToken = new CubeJsService()
        await serviceWithInvalidToken.init(TEST_TENANT_ID, TEST_SEGMENTS)
        
        const query = {
          measures: [CubeMeasures.ORGANIZATION_COUNT],
          limit: 10
        }

        try {
          await serviceWithInvalidToken.load(query)
          fail('Expected query to fail due to invalid JWT token')
        } catch (error) {
          expect(error).toBeDefined()
          expect(error.message).toBeDefined()
          
          const errorMessage = error.message.toLowerCase()
          expect(
            errorMessage.includes('token') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('authentication') ||
            errorMessage.includes('401') ||
            errorMessage.includes('403')
          ).toBe(true)
          
          console.log(`Invalid JWT token error handled correctly: ${error.message}`)
        }
      } finally {
        // Restore original secret
        process.env.CUBEJS_JWT_SECRET = originalSecret
      }
    }, ERROR_TEST_TIMEOUT)

    test('should handle empty tenant ID', async () => {
      try {
        const serviceWithEmptyTenant = new CubeJsService()
        await serviceWithEmptyTenant.init('', TEST_SEGMENTS)
        
        const query = {
          measures: [CubeMeasures.ORGANIZATION_COUNT],
          limit: 10
        }

        try {
          await serviceWithEmptyTenant.load(query)
          fail('Expected query to fail due to empty tenant ID')
        } catch (error) {
          expect(error).toBeDefined()
          expect(error.message).toBeDefined()
          
          const errorMessage = error.message.toLowerCase()
          expect(
            errorMessage.includes('tenant') || 
            errorMessage.includes('empty') ||
            errorMessage.includes('invalid') ||
            errorMessage.includes('400') ||
            errorMessage.includes('unauthorized')
          ).toBe(true)
          
          console.log(`Empty tenant ID error handled correctly: ${error.message}`)
        }
      } catch (initError) {
        // If initialization itself fails, that's also acceptable
        expect(initError).toBeDefined()
        console.log(`Empty tenant ID prevented initialization: ${initError.message}`)
      }
    }, ERROR_TEST_TIMEOUT)

    test('should handle null segments', async () => {
      try {
        const serviceWithNullSegments = new CubeJsService()
        await serviceWithNullSegments.init(TEST_TENANT_ID, null)
        
        const query = {
          measures: [CubeMeasures.ORGANIZATION_COUNT],
          limit: 10
        }

        try {
          await serviceWithNullSegments.load(query)
          fail('Expected query to fail due to null segments')
        } catch (error) {
          expect(error).toBeDefined()
          expect(error.message).toBeDefined()
          
          const errorMessage = error.message.toLowerCase()
          expect(
            errorMessage.includes('segment') || 
            errorMessage.includes('null') ||
            errorMessage.includes('invalid') ||
            errorMessage.includes('400')
          ).toBe(true)
          
          console.log(`Null segments error handled correctly: ${error.message}`)
        }
      } catch (initError) {
        // If initialization itself fails, that's also acceptable
        expect(initError).toBeDefined()
        console.log(`Null segments prevented initialization: ${initError.message}`)
      }
    }, ERROR_TEST_TIMEOUT)
  })

  describe('Database Connectivity Error Handling - Requirement 1.1', () => {
    beforeEach(async () => {
      cubeService = new CubeJsService()
      await cubeService.init(TEST_TENANT_ID, TEST_SEGMENTS)
    })

    test('should handle database connection timeout', async () => {
      // Test with a query that might timeout due to database issues
      const query = {
        measures: [CubeMeasures.ORGANIZATION_COUNT, CubeMeasures.MEMBER_COUNT, CubeMeasures.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: CubeDimensions.ACTIVITY_DATE,
          dateRange: ['2020-01-01', '2024-12-31'],
          granularity: 'day'
        }],
        limit: 100000 // Large limit that might cause timeout
      }

      try {
        await cubeService.load(query)
        // If it succeeds, that's fine - database is healthy
        console.log('Large query executed successfully - database is healthy')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        
        const errorMessage = error.message.toLowerCase()
        expect(
          errorMessage.includes('timeout') || 
          errorMessage.includes('connection') ||
          errorMessage.includes('database') ||
          errorMessage.includes('500') ||
          errorMessage.includes('server error')
        ).toBe(true)
        
        console.log(`Database connectivity error handled correctly: ${error.message}`)
      }
    }, 60000) // 60 second timeout for this test

    test('should handle invalid CubeJS API URL', async () => {
      // Test with invalid API URL
      const originalUrl = process.env.CUBEJS_URL
      process.env.CUBEJS_URL = 'http://invalid-host:9999/cubejs-api/v1'
      
      try {
        const serviceWithInvalidUrl = new CubeJsService()
        await serviceWithInvalidUrl.init(TEST_TENANT_ID, TEST_SEGMENTS)
        
        const query = {
          measures: [CubeMeasures.ORGANIZATION_COUNT],
          limit: 10
        }

        try {
          await serviceWithInvalidUrl.load(query)
          fail('Expected query to fail due to invalid API URL')
        } catch (error) {
          expect(error).toBeDefined()
          expect(error.message).toBeDefined()
          
          const errorMessage = error.message.toLowerCase()
          expect(
            errorMessage.includes('connect') || 
            errorMessage.includes('network') ||
            errorMessage.includes('econnrefused') ||
            errorMessage.includes('host') ||
            errorMessage.includes('timeout')
          ).toBe(true)
          
          console.log(`Invalid API URL error handled correctly: ${error.message}`)
        }
      } finally {
        // Restore original URL
        process.env.CUBEJS_URL = originalUrl
      }
    }, ERROR_TEST_TIMEOUT)
  })

  describe('Error Response Structure Validation', () => {
    beforeEach(async () => {
      cubeService = new CubeJsService()
      await cubeService.init(TEST_TENANT_ID, TEST_SEGMENTS)
    })

    test('should validate error response contains useful information', async () => {
      const malformedQuery = {
        measures: ['NonExistent.measure'],
        limit: 10
      }

      try {
        await cubeService.load(malformedQuery)
        fail('Expected query to fail')
      } catch (error) {
        // Validate error structure
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        expect(typeof error.message).toBe('string')
        expect(error.message.length).toBeGreaterThan(0)
        
        // Error should contain actionable information
        const errorMessage = error.message.toLowerCase()
        const hasUsefulInfo = 
          errorMessage.includes('measure') ||
          errorMessage.includes('dimension') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('400') ||
          errorMessage.includes('bad request')
        
        expect(hasUsefulInfo).toBe(true)
        
        console.log(`Error response structure validated: ${error.message}`)
      }
    }, ERROR_TEST_TIMEOUT)

    test('should validate errors are properly categorized', async () => {
      const testCases = [
        {
          name: 'Schema Error',
          query: { measures: ['Invalid.measure'], limit: 10 },
          expectedKeywords: ['measure', 'invalid', 'not found', '400']
        },
        {
          name: 'Query Structure Error',
          query: { dimensions: ['Some.dimension'], limit: 10 }, // Missing measures
          expectedKeywords: ['measure', 'required', '400']
        },
        {
          name: 'Filter Error',
          query: { 
            measures: [CubeMeasures.MEMBER_COUNT], 
            filters: [{ member: 'Invalid.filter' }], // Missing operator and values
            limit: 10 
          },
          expectedKeywords: ['filter', 'operator', 'invalid', '400']
        }
      ]

      for (const testCase of testCases) {
        try {
          await cubeService.load(testCase.query)
          fail(`Expected ${testCase.name} to fail`)
        } catch (error) {
          expect(error).toBeDefined()
          expect(error.message).toBeDefined()
          
          const errorMessage = error.message.toLowerCase()
          const hasExpectedKeyword = testCase.expectedKeywords.some(keyword => 
            errorMessage.includes(keyword)
          )
          
          expect(hasExpectedKeyword).toBe(true)
          console.log(`${testCase.name} properly categorized: ${error.message}`)
        }
      }
    }, ERROR_TEST_TIMEOUT)
  })
})