import request from 'supertest'
import express from 'express'
import signalsRoutes from '../index'

// Mock the required middleware and services
jest.mock('../../middlewares/errorMiddleware', () => ({
  safeWrap: (handler) => handler
}))

jest.mock('../../services/user/permissionChecker', () => {
  return jest.fn().mockImplementation(() => ({
    validateHas: jest.fn()
  }))
})

jest.mock('../../services/signalsService', () => {
  return jest.fn().mockImplementation(() => ({
    findAndCountAll: jest.fn().mockResolvedValue({
      data: [],
      pagination: { cursor: null, hasMore: false, total: 0 }
    }),
    findById: jest.fn().mockResolvedValue({ id: '123', platform: 'github' }),
    export: jest.fn().mockResolvedValue({ data: [] })
  }))
})

jest.mock('../../segment/track', () => jest.fn())

describe('Signals API Integration', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    
    // Mock request properties that rate limiting depends on
    app.use((req, res, next) => {
      req.currentUser = { id: 'test-user' }
      req.currentTenant = { id: 'test-tenant' }
      req.responseHandler = {
        success: (req, res, data) => res.json(data)
      }
      next()
    })
    
    signalsRoutes(app)
  })

  describe('Request Validation', () => {
    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/tenant/test-tenant/signals')
        .query({ limit: '2000' }) // Invalid limit > 1000
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('limit must be a number between 1 and 1000')
    })

    it('should return 400 for invalid UUID in findById', async () => {
      const response = await request(app)
        .get('/tenant/test-tenant/signals/invalid-uuid')
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('id must be a valid UUID')
    })

    it('should return 400 for invalid export format', async () => {
      const response = await request(app)
        .get('/tenant/test-tenant/signals/export')
        .query({ format: 'invalid-format' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('format must be one of: knowledge_graph, recommendations')
    })

    it('should accept valid query parameters', async () => {
      const response = await request(app)
        .get('/tenant/test-tenant/signals')
        .query({
          platform: 'github',
          sortBy: 'timestamp',
          sortOrder: 'desc',
          limit: '50'
        })
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('pagination')
    })
  })

  describe('Rate Limiting Headers', () => {
    it('should include rate limit headers in response', async () => {
      const response = await request(app)
        .get('/tenant/test-tenant/signals')
        .expect(200)

      // Check for standard rate limit headers
      expect(response.headers).toHaveProperty('ratelimit-limit')
      expect(response.headers).toHaveProperty('ratelimit-remaining')
      expect(response.headers).toHaveProperty('ratelimit-reset')
    })
  })
})