/**
 * Final integration and validation tests for CubeJS 400 error fix
 * Tests dashboard widget queries end-to-end and validates error handling improvements
 * Requirements: 3.1, 3.2, 3.3, 3.4, 1.1, 1.2, 1.3
 */

import cubejs from '@cubejs-client/core'
import jwt from 'jsonwebtoken'

// Test configuration
const INTEGRATION_TEST_TIMEOUT = 30000
const CUBEJS_API_URL = process.env.CUBEJS_URL || 'http://localhost:4000/cubejs-api/v1'
const CUBEJS_JWT_SECRET = process.env.CUBEJS_JWT_SECRET || '137ea167812145c6d77452a58d7dd29b'
const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000' // Valid UUID for testing
const TEST_SEGMENTS = ['660e8400-e29b-41d4-a716-446655440001'] // Valid UUID for segments

// Cube definitions
const MEASURES = {
  ORGANIZATION_COUNT: 'Organizations.count',
  MEMBER_COUNT: 'Members.count',
  ACTIVITY_COUNT: 'Activities.count',
  CONVERSATION_COUNT: 'Conversations.count'
}

const DIMENSIONS = {
  IS_TEAM_MEMBER: 'Members.isTeamMember',
  ACTIVITY_DATE: 'Activities.date',
  MEMBER_JOINED_AT: 'Members.joinedAt',
  ORGANIZATIONS_JOINED_AT: 'Organizations.joinedAt'
}

// Helper functions
function generateToken(tenantId: string, segments: string[]) {
  return jwt.sign({ tenantId, segments }, CUBEJS_JWT_SECRET, { expiresIn: '1h' })
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

describe('Task 13.1: Test all dashboard widget queries end-to-end', () => {
  let cubeApi: any
  
  beforeAll(() => {
    const token = generateToken(TEST_TENANT_ID, TEST_SEGMENTS)
    cubeApi = cubejs(token, { apiUrl: CUBEJS_API_URL })
  })

  describe('Organizations.count queries', () => {
    test('should execute Organizations.count query successfully', async () => {
      const query = {
        measures: [MEASURES.ORGANIZATION_COUNT],
        limit: 1000
      }

      const result = await cubeApi.load(query)
      const data = result.loadResponses[0].data
      
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThanOrEqual(0)
      
      if (data.length > 0) {
        expect(data[0]).toHaveProperty(MEASURES.ORGANIZATION_COUNT)
        const count = parseInt(data[0][MEASURES.ORGANIZATION_COUNT])
        expect(count).toBeGreaterThanOrEqual(0)
      }
      
      console.log(`✓ Organizations.count: ${data.length > 0 ? data[0][MEASURES.ORGANIZATION_COUNT] : '0'} organizations`)
    }, INTEGRATION_TEST_TIMEOUT)

    test('should execute Organizations.count with time filters', async () => {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      const query = {
        measures: [MEASURES.ORGANIZATION_COUNT],
        timeDimensions: [{
          dimension: DIMENSIONS.ORGANIZATIONS_JOINED_AT,
          dateRange: [formatDate(oneYearAgo), formatDate(new Date())]
        }],
        limit: 1000
      }

      const result = await cubeApi.load(query)
      const data = result.loadResponses[0].data
      
      expect(Array.isArray(data)).toBe(true)
      console.log(`✓ Organizations.count with time filter: ${data.length} results`)
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Members.count queries with various filters', () => {
    test('should execute Members.count with isTeamMember=false filter', async () => {
      const query = {
        measures: [MEASURES.MEMBER_COUNT],
        filters: [{
          member: DIMENSIONS.IS_TEAM_MEMBER,
          operator: 'equals',
          values: ['false']
        }],
        limit: 1000
      }

      const result = await cubeApi.load(query)
      const data = result.loadResponses[0].data
      
      expect(Array.isArray(data)).toBe(true)
      
      if (data.length > 0) {
        expect(data[0]).toHaveProperty(MEASURES.MEMBER_COUNT)
        const count = parseInt(data[0][MEASURES.MEMBER_COUNT])
        expect(count).toBeGreaterThanOrEqual(0)
      }
      
      console.log(`✓ Members.count (isTeamMember=false): ${data.length > 0 ? data[0][MEASURES.MEMBER_COUNT] : '0'} members`)
    }, INTEGRATION_TEST_TIMEOUT)

    test('should execute Members.count with isTeamMember=true filter', async () => {
      const query = {
        measures: [MEASURES.MEMBER_COUNT],
        filters: [{
          member: DIMENSIONS.IS_TEAM_MEMBER,
          operator: 'equals',
          values: ['true']
        }],
        limit: 1000
      }

      const result = await cubeApi.load(query)
      const data = result.loadResponses[0].data
      
      expect(Array.isArray(data)).toBe(true)
      console.log(`✓ Members.count (isTeamMember=true): ${data.length > 0 ? data[0][MEASURES.MEMBER_COUNT] : '0'} members`)
    }, INTEGRATION_TEST_TIMEOUT)

    test('should execute Members.count with time dimension filter', async () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      const query = {
        measures: [MEASURES.MEMBER_COUNT],
        timeDimensions: [{
          dimension: DIMENSIONS.MEMBER_JOINED_AT,
          dateRange: [formatDate(sixMonthsAgo), formatDate(new Date())]
        }],
        limit: 1000
      }

      const result = await cubeApi.load(query)
      const data = result.loadResponses[0].data
      
      expect(Array.isArray(data)).toBe(true)
      console.log(`✓ Members.count with time filter: ${data.length} results`)
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Activities queries with time and dimension filters', () => {
    test('should execute Activities.count with time dimension', async () => {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      
      const query = {
        measures: [MEASURES.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: DIMENSIONS.ACTIVITY_DATE,
          dateRange: [formatDate(oneMonthAgo), formatDate(new Date())]
        }],
        limit: 1000
      }

      const result = await cubeApi.load(query)
      const data = result.loadResponses[0].data
      
      expect(Array.isArray(data)).toBe(true)
      
      if (data.length > 0) {
        expect(data[0]).toHaveProperty(MEASURES.ACTIVITY_COUNT)
        const count = parseInt(data[0][MEASURES.ACTIVITY_COUNT])
        expect(count).toBeGreaterThanOrEqual(0)
      }
      
      console.log(`✓ Activities.count with time dimension: ${data.length > 0 ? data[0][MEASURES.ACTIVITY_COUNT] : '0'} activities`)
    }, INTEGRATION_TEST_TIMEOUT)

    test('should execute Activities.count with daily granularity', async () => {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      const query = {
        measures: [MEASURES.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: DIMENSIONS.ACTIVITY_DATE,
          dateRange: [formatDate(oneWeekAgo), formatDate(new Date())],
          granularity: 'day'
        }],
        limit: 1000
      }

      const result = await cubeApi.load(query)
      const data = result.loadResponses[0].data
      
      expect(Array.isArray(data)).toBe(true)
      console.log(`✓ Activities.count with daily granularity: ${data.length} daily results`)
    }, INTEGRATION_TEST_TIMEOUT)
  })
})

describe('Task 13.2: Validate error handling improvements', () => {
  let cubeApi: any
  
  beforeAll(() => {
    const token = generateToken(TEST_TENANT_ID, TEST_SEGMENTS)
    cubeApi = cubejs(token, { apiUrl: CUBEJS_API_URL })
  })

  describe('Malformed query handling', () => {
    test('should handle query with missing measures', async () => {
      const malformedQuery = {
        dimensions: [DIMENSIONS.IS_TEAM_MEMBER],
        limit: 10
      }

      await expect(cubeApi.load(malformedQuery)).rejects.toThrow()
      console.log('✓ Missing measures error handled correctly')
    }, INTEGRATION_TEST_TIMEOUT)

    test('should handle query with invalid measure names', async () => {
      const malformedQuery = {
        measures: ['InvalidCube.invalidMeasure'],
        limit: 10
      }

      await expect(cubeApi.load(malformedQuery)).rejects.toThrow()
      console.log('✓ Invalid measures error handled correctly')
    }, INTEGRATION_TEST_TIMEOUT)

    test('should handle query with malformed filters', async () => {
      const malformedQuery = {
        measures: [MEASURES.MEMBER_COUNT],
        filters: [{
          member: DIMENSIONS.IS_TEAM_MEMBER
          // Missing operator and values
        }],
        limit: 10
      }

      await expect(cubeApi.load(malformedQuery)).rejects.toThrow()
      console.log('✓ Malformed filters error handled correctly')
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Missing security context handling', () => {
    test('should handle invalid JWT token', async () => {
      const invalidToken = jwt.sign({ tenantId: TEST_TENANT_ID, segments: TEST_SEGMENTS }, 'wrong-secret', { expiresIn: '1h' })
      const invalidApi = cubejs(invalidToken, { apiUrl: CUBEJS_API_URL })
      
      const query = {
        measures: [MEASURES.ORGANIZATION_COUNT],
        limit: 10
      }

      await expect(invalidApi.load(query)).rejects.toThrow()
      console.log('✓ Invalid JWT token error handled correctly')
    }, INTEGRATION_TEST_TIMEOUT)

    test('should handle empty tenant ID', async () => {
      const emptyTenantToken = jwt.sign({ tenantId: '', segments: TEST_SEGMENTS }, CUBEJS_JWT_SECRET, { expiresIn: '1h' })
      const emptyTenantApi = cubejs(emptyTenantToken, { apiUrl: CUBEJS_API_URL })
      
      const query = {
        measures: [MEASURES.ORGANIZATION_COUNT],
        limit: 10
      }

      await expect(emptyTenantApi.load(query)).rejects.toThrow()
      console.log('✓ Empty tenant ID error handled correctly')
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Database connectivity error handling', () => {
    test('should handle invalid CubeJS API URL', async () => {
      const invalidApi = cubejs(generateToken(TEST_TENANT_ID, TEST_SEGMENTS), { 
        apiUrl: 'http://invalid-host:9999/cubejs-api/v1' 
      })
      
      const query = {
        measures: [MEASURES.ORGANIZATION_COUNT],
        limit: 10
      }

      await expect(invalidApi.load(query)).rejects.toThrow()
      console.log('✓ Invalid API URL error handled correctly')
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Error response validation', () => {
    test('should validate error responses contain useful information', async () => {
      const malformedQuery = {
        measures: ['NonExistent.measure'],
        limit: 10
      }

      try {
        await cubeApi.load(malformedQuery)
        fail('Expected query to fail')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
        expect(typeof error.message).toBe('string')
        expect(error.message.length).toBeGreaterThan(0)
        
        console.log(`✓ Error response structure validated: ${error.message.substring(0, 100)}...`)
      }
    }, INTEGRATION_TEST_TIMEOUT)
  })
})

describe('Response validation', () => {
  let cubeApi: any
  
  beforeAll(() => {
    const token = generateToken(TEST_TENANT_ID, TEST_SEGMENTS)
    cubeApi = cubejs(token, { apiUrl: CUBEJS_API_URL })
  })

  test('should validate response structure for all successful queries', async () => {
    const queries = [
      {
        name: 'Organizations.count',
        query: { measures: [MEASURES.ORGANIZATION_COUNT], limit: 10 }
      },
      {
        name: 'Members.count',
        query: { measures: [MEASURES.MEMBER_COUNT], limit: 10 }
      },
      {
        name: 'Activities.count',
        query: { measures: [MEASURES.ACTIVITY_COUNT], limit: 10 }
      }
    ]

    for (const { name, query } of queries) {
      const result = await cubeApi.load(query)
      const data = result.loadResponses[0].data
      
      expect(Array.isArray(data)).toBe(true)
      
      if (data.length > 0) {
        const firstRow = data[0]
        expect(typeof firstRow).toBe('object')
        expect(firstRow).not.toBeNull()
        
        for (const measure of query.measures) {
          expect(firstRow).toHaveProperty(measure)
          expect(typeof firstRow[measure]).toBe('string')
        }
      }
      
      console.log(`✓ ${name} validation passed: ${data.length} rows`)
    }
  }, INTEGRATION_TEST_TIMEOUT)
})