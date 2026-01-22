/**
 * End-to-end integration tests for dashboard widget queries
 * Tests actual CubeJS API endpoints with real database connectivity
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import moment from 'moment'
import cubejs from '@cubejs-client/core'
import jwt from 'jsonwebtoken'

// Integration test configuration
const INTEGRATION_TEST_TIMEOUT = 30000 // 30 seconds
const CUBEJS_API_URL = process.env.CUBEJS_URL || 'http://localhost:4000/cubejs-api/v1'
const CUBEJS_JWT_SECRET = process.env.CUBEJS_JWT_SECRET || '137ea167812145c6d77452a58d7dd29b'
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'integration-test-tenant'
const TEST_SEGMENTS = ['integration-test']

// Cube measures and dimensions (inline definitions to avoid import issues)
const CubeMeasures = {
  ORGANIZATION_COUNT: 'Organizations.count',
  MEMBER_COUNT: 'Members.count',
  ACTIVITY_COUNT: 'Activities.count',
  CONVERSATION_COUNT: 'Conversations.count'
}

const CubeDimensions = {
  MEMBER_JOINED_AT: 'Members.joinedAt',
  IS_TEAM_MEMBER: 'Members.isTeamMember',
  ACTIVITY_DATE: 'Activities.date',
  CONVERSATION_CREATED_AT: 'Conversations.createdat',
  ORGANIZATIONS_JOINED_AT: 'Organizations.joinedAt'
}

// Helper function to generate JWT token
function generateJwtToken(tenantId: string, segments: string[]) {
  const context = { tenantId, segments }
  return jwt.sign(context, CUBEJS_JWT_SECRET, { expiresIn: '1h' })
}

describe('Dashboard Widget Queries - End-to-End Integration', () => {
  let cubeApi: any
  let token: string
  
  beforeAll(async () => {
    // Generate JWT token for authentication
    token = generateJwtToken(TEST_TENANT_ID, TEST_SEGMENTS)
    
    // Initialize CubeJS API client
    cubeApi = cubejs(token, { apiUrl: CUBEJS_API_URL })
  }, INTEGRATION_TEST_TIMEOUT)

  describe('Organizations.count queries - End-to-End', () => {
    test('should execute Organizations.count query successfully', async () => {
      const query = {
        measures: [CubeMeasures.ORGANIZATION_COUNT],
        limit: 1000
      }

      try {
        const result = await cubeApi.load(query)
        const data = result.loadResponses[0].data
        
        // Validate response structure
        expect(Array.isArray(data)).toBe(true)
        expect(data.length).toBeGreaterThanOrEqual(0)
        
        if (data.length > 0) {
          expect(data[0]).toHaveProperty(CubeMeasures.ORGANIZATION_COUNT)
          expect(typeof data[0][CubeMeasures.ORGANIZATION_COUNT]).toBe('string')
          
          // Validate that count is a valid number
          const count = parseInt(data[0][CubeMeasures.ORGANIZATION_COUNT])
          expect(count).toBeGreaterThanOrEqual(0)
        }
        
        console.log(`Organizations.count result: ${JSON.stringify(data)}`)
      } catch (error) {
        console.error('Organizations.count query failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)

    test('should handle Organizations.count with time filters', async () => {
      const startDate = moment().subtract(1, 'year')
      const endDate = moment()
      
      const query = {
        measures: [CubeMeasures.ORGANIZATION_COUNT],
        timeDimensions: [{
          dimension: CubeDimensions.ORGANIZATIONS_JOINED_AT,
          dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
        }],
        limit: 1000
      }

      try {
        const result = await cubeApi.load(query)
        const data = result.loadResponses[0].data
        
        expect(Array.isArray(data)).toBe(true)
        console.log(`Organizations.count with time filter result: ${JSON.stringify(data)}`)
      } catch (error) {
        console.error('Organizations.count with time filter failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Members.count queries with various filters - End-to-End', () => {
    test('should execute Members.count with isTeamMember filter', async () => {
      const query = {
        measures: [CubeMeasures.MEMBER_COUNT],
        filters: [{
          member: CubeDimensions.IS_TEAM_MEMBER,
          operator: 'equals',
          values: ['false']
        }],
        limit: 1000
      }

      try {
        const result = await cubeService.load(query)
        
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThanOrEqual(0)
        
        if (result.length > 0) {
          expect(result[0]).toHaveProperty(CubeMeasures.MEMBER_COUNT)
          expect(typeof result[0][CubeMeasures.MEMBER_COUNT]).toBe('string')
          
          const count = parseInt(result[0][CubeMeasures.MEMBER_COUNT])
          expect(count).toBeGreaterThanOrEqual(0)
        }
        
        console.log(`Members.count with isTeamMember=false result: ${JSON.stringify(result)}`)
      } catch (error) {
        console.error('Members.count with isTeamMember filter failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)

    test('should execute Members.count with isTeamMember=true filter', async () => {
      const query = {
        measures: [CubeMeasures.MEMBER_COUNT],
        filters: [{
          member: CubeDimensions.IS_TEAM_MEMBER,
          operator: 'equals',
          values: ['true']
        }],
        limit: 1000
      }

      try {
        const result = await cubeService.load(query)
        
        expect(Array.isArray(result)).toBe(true)
        console.log(`Members.count with isTeamMember=true result: ${JSON.stringify(result)}`)
      } catch (error) {
        console.error('Members.count with isTeamMember=true filter failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)

    test('should execute Members.count with time dimension filter', async () => {
      const startDate = moment().subtract(6, 'months')
      const endDate = moment()
      
      const query = {
        measures: [CubeMeasures.MEMBER_COUNT],
        timeDimensions: [{
          dimension: CubeDimensions.MEMBER_JOINED_AT,
          dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
        }],
        limit: 1000
      }

      try {
        const result = await cubeService.load(query)
        
        expect(Array.isArray(result)).toBe(true)
        console.log(`Members.count with time filter result: ${JSON.stringify(result)}`)
      } catch (error) {
        console.error('Members.count with time filter failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)

    test('should execute Members.count with combined filters', async () => {
      const startDate = moment().subtract(3, 'months')
      const endDate = moment()
      
      const query = {
        measures: [CubeMeasures.MEMBER_COUNT],
        filters: [{
          member: CubeDimensions.IS_TEAM_MEMBER,
          operator: 'equals',
          values: ['false']
        }],
        timeDimensions: [{
          dimension: CubeDimensions.MEMBER_JOINED_AT,
          dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
        }],
        limit: 1000
      }

      try {
        const result = await cubeService.load(query)
        
        expect(Array.isArray(result)).toBe(true)
        console.log(`Members.count with combined filters result: ${JSON.stringify(result)}`)
      } catch (error) {
        console.error('Members.count with combined filters failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Activities queries with time and dimension filters - End-to-End', () => {
    test('should execute Activities.count with time dimension', async () => {
      const startDate = moment().subtract(1, 'month')
      const endDate = moment()
      
      const query = {
        measures: [CubeMeasures.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: CubeDimensions.ACTIVITY_DATE,
          dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
        }],
        limit: 1000
      }

      try {
        const result = await cubeService.load(query)
        
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThanOrEqual(0)
        
        if (result.length > 0) {
          expect(result[0]).toHaveProperty(CubeMeasures.ACTIVITY_COUNT)
          expect(typeof result[0][CubeMeasures.ACTIVITY_COUNT]).toBe('string')
          
          const count = parseInt(result[0][CubeMeasures.ACTIVITY_COUNT])
          expect(count).toBeGreaterThanOrEqual(0)
        }
        
        console.log(`Activities.count with time dimension result: ${JSON.stringify(result)}`)
      } catch (error) {
        console.error('Activities.count with time dimension failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)

    test('should execute Activities.count with granular time dimension', async () => {
      const startDate = moment().subtract(7, 'days')
      const endDate = moment()
      
      const query = {
        measures: [CubeMeasures.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: CubeDimensions.ACTIVITY_DATE,
          dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')],
          granularity: 'day'
        }],
        limit: 1000
      }

      try {
        const result = await cubeService.load(query)
        
        expect(Array.isArray(result)).toBe(true)
        console.log(`Activities.count with daily granularity result: ${JSON.stringify(result)}`)
      } catch (error) {
        console.error('Activities.count with daily granularity failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)

    test('should execute Activities.count with weekly granularity', async () => {
      const startDate = moment().subtract(3, 'months')
      const endDate = moment()
      
      const query = {
        measures: [CubeMeasures.ACTIVITY_COUNT],
        timeDimensions: [{
          dimension: CubeDimensions.ACTIVITY_DATE,
          dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')],
          granularity: 'week'
        }],
        limit: 1000
      }

      try {
        const result = await cubeService.load(query)
        
        expect(Array.isArray(result)).toBe(true)
        console.log(`Activities.count with weekly granularity result: ${JSON.stringify(result)}`)
      } catch (error) {
        console.error('Activities.count with weekly granularity failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Conversations queries - End-to-End', () => {
    test('should execute Conversations.count with time dimension', async () => {
      const startDate = moment().subtract(1, 'month')
      const endDate = moment()
      
      const query = {
        measures: [CubeMeasures.CONVERSATION_COUNT],
        timeDimensions: [{
          dimension: CubeDimensions.CONVERSATION_CREATED_AT,
          dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
        }],
        limit: 1000
      }

      try {
        const result = await cubeService.load(query)
        
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThanOrEqual(0)
        
        if (result.length > 0) {
          expect(result[0]).toHaveProperty(CubeMeasures.CONVERSATION_COUNT)
          expect(typeof result[0][CubeMeasures.CONVERSATION_COUNT]).toBe('string')
          
          const count = parseInt(result[0][CubeMeasures.CONVERSATION_COUNT])
          expect(count).toBeGreaterThanOrEqual(0)
        }
        
        console.log(`Conversations.count with time dimension result: ${JSON.stringify(result)}`)
      } catch (error) {
        console.error('Conversations.count with time dimension failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Complex multi-measure queries - End-to-End', () => {
    test('should execute query with multiple measures', async () => {
      const startDate = moment().subtract(1, 'month')
      const endDate = moment()
      
      const query = {
        measures: [
          CubeMeasures.ORGANIZATION_COUNT,
          CubeMeasures.MEMBER_COUNT,
          CubeMeasures.ACTIVITY_COUNT,
          CubeMeasures.CONVERSATION_COUNT
        ],
        timeDimensions: [{
          dimension: CubeDimensions.ACTIVITY_DATE,
          dateRange: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
        }],
        limit: 1000
      }

      try {
        const result = await cubeService.load(query)
        
        expect(Array.isArray(result)).toBe(true)
        
        if (result.length > 0) {
          // Check that all measures are present in the result
          const firstRow = result[0]
          expect(firstRow).toHaveProperty(CubeMeasures.ORGANIZATION_COUNT)
          expect(firstRow).toHaveProperty(CubeMeasures.MEMBER_COUNT)
          expect(firstRow).toHaveProperty(CubeMeasures.ACTIVITY_COUNT)
          expect(firstRow).toHaveProperty(CubeMeasures.CONVERSATION_COUNT)
        }
        
        console.log(`Multi-measure query result: ${JSON.stringify(result)}`)
      } catch (error) {
        console.error('Multi-measure query failed:', error)
        throw error
      }
    }, INTEGRATION_TEST_TIMEOUT)
  })

  describe('Response validation - End-to-End', () => {
    test('should validate response structure for all successful queries', async () => {
      const queries = [
        {
          name: 'Organizations.count',
          query: { measures: [CubeMeasures.ORGANIZATION_COUNT], limit: 10 }
        },
        {
          name: 'Members.count',
          query: { measures: [CubeMeasures.MEMBER_COUNT], limit: 10 }
        },
        {
          name: 'Activities.count',
          query: { measures: [CubeMeasures.ACTIVITY_COUNT], limit: 10 }
        },
        {
          name: 'Conversations.count',
          query: { measures: [CubeMeasures.CONVERSATION_COUNT], limit: 10 }
        }
      ]

      for (const { name, query } of queries) {
        try {
          const result = await cubeService.load(query)
          
          // Validate basic response structure
          expect(Array.isArray(result)).toBe(true)
          
          if (result.length > 0) {
            const firstRow = result[0]
            expect(typeof firstRow).toBe('object')
            expect(firstRow).not.toBeNull()
            
            // Validate that all requested measures are present
            for (const measure of query.measures) {
              expect(firstRow).toHaveProperty(measure)
              expect(typeof firstRow[measure]).toBe('string')
            }
          }
          
          console.log(`${name} validation passed: ${result.length} rows`)
        } catch (error) {
          console.error(`${name} validation failed:`, error)
          throw new Error(`${name} validation failed: ${error.message}`)
        }
      }
    }, INTEGRATION_TEST_TIMEOUT)
  })
})