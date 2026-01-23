import { SignalsCacheMiddleware } from '../middleware/cacheMiddleware'
import { IServiceOptions } from '../../../services/IServiceOptions'

// Mock Redis client
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  keys: jest.fn(),
  del: jest.fn(),
}

// Mock logger
const mockLog = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock options
const mockOptions: IServiceOptions = {
  log: mockLog,
  redis: mockRedis,
  config: {
    signalIntelligence: {
      api: {
        cacheTtlMinutes: 5,
      },
    },
  },
  database: null,
  currentUser: null,
  currentTenant: null,
  language: 'en',
}

describe('SignalsCacheMiddleware', () => {
  let cacheMiddleware: SignalsCacheMiddleware
  let mockReq: any
  let mockRes: any
  let mockNext: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    cacheMiddleware = new SignalsCacheMiddleware(mockOptions)
    
    mockReq = {
      params: { tenantId: 'test-tenant-id' },
      query: { platform: 'github', limit: 50 },
      responseHandler: {
        success: jest.fn(),
      },
    }
    
    mockRes = {}
    mockNext = jest.fn()
  })

  describe('cacheSignalsList', () => {
    it('should return cached response when cache hit occurs', async () => {
      const cachedData = { data: [{ id: '1', type: 'issue' }], pagination: {} }
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData))

      const middleware = cacheMiddleware.cacheSignalsList()
      await middleware(mockReq, mockRes, mockNext)

      expect(mockRedis.get).toHaveBeenCalled()
      expect(mockReq.responseHandler.success).toHaveBeenCalledWith(mockReq, mockRes, cachedData)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should proceed to next middleware when cache miss occurs', async () => {
      mockRedis.get.mockResolvedValue(null)

      const middleware = cacheMiddleware.cacheSignalsList()
      await middleware(mockReq, mockRes, mockNext)

      expect(mockRedis.get).toHaveBeenCalled()
      expect(mockReq.responseHandler.success).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('should cache response data when success method is called', async () => {
      mockRedis.get.mockResolvedValue(null)
      const responseData = { data: [{ id: '1', type: 'issue' }], pagination: {} }

      const middleware = cacheMiddleware.cacheSignalsList()
      await middleware(mockReq, mockRes, mockNext)

      // Simulate calling the overridden success method
      await mockReq.responseHandler.success(mockReq, mockRes, responseData)

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('signal:api:test-tenant-id:list:'),
        300, // 5 minutes * 60 seconds
        JSON.stringify(responseData)
      )
    })

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))

      const middleware = cacheMiddleware.cacheSignalsList()
      await middleware(mockReq, mockRes, mockNext)

      expect(mockLog.warn).toHaveBeenCalledWith(
        'Failed to get cached response',
        expect.objectContaining({
          error: 'Redis connection failed',
        })
      )
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('cacheSignalsFind', () => {
    beforeEach(() => {
      mockReq.params.id = 'signal-123'
    })

    it('should return cached response for specific signal', async () => {
      const cachedData = { id: 'signal-123', type: 'issue' }
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData))

      const middleware = cacheMiddleware.cacheSignalsFind()
      await middleware(mockReq, mockRes, mockNext)

      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('signal:api:test-tenant-id:find:')
      )
      expect(mockReq.responseHandler.success).toHaveBeenCalledWith(mockReq, mockRes, cachedData)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('cacheSignalsExport', () => {
    beforeEach(() => {
      mockReq.query = { format: 'knowledge_graph', startDate: '2024-01-01' }
    })

    it('should return cached export response', async () => {
      const cachedData = { '@context': 'https://schema.org/', '@graph': {} }
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData))

      const middleware = cacheMiddleware.cacheSignalsExport()
      await middleware(mockReq, mockRes, mockNext)

      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('signal:api:test-tenant-id:export:')
      )
      expect(mockReq.responseHandler.success).toHaveBeenCalledWith(mockReq, mockRes, cachedData)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('cache key generation', () => {
    it('should generate consistent cache keys for same query parameters', async () => {
      const req1 = { ...mockReq, query: { platform: 'github', limit: 50 } }
      const req2 = { ...mockReq, query: { limit: 50, platform: 'github' } } // Different order

      mockRedis.get.mockResolvedValue(null)

      const middleware = cacheMiddleware.cacheSignalsList()
      
      await middleware(req1, mockRes, mockNext)
      const firstCall = mockRedis.get.mock.calls[0][0]
      
      jest.clearAllMocks()
      
      await middleware(req2, mockRes, mockNext)
      const secondCall = mockRedis.get.mock.calls[0][0]

      expect(firstCall).toBe(secondCall)
    })
  })
})