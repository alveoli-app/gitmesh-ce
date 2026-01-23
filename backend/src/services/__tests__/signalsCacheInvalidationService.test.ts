import SignalsCacheInvalidationService from '../signalsCacheInvalidationService'
import { IServiceOptions } from '../IServiceOptions'

// Mock Redis client
const mockRedis = {
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
  config: null,
  database: null,
  currentUser: null,
  currentTenant: null,
  language: 'en',
}

describe('SignalsCacheInvalidationService', () => {
  let service: SignalsCacheInvalidationService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new SignalsCacheInvalidationService(mockOptions)
  })

  describe('invalidateAllForTenant', () => {
    it('should invalidate all cache keys for a tenant', async () => {
      const tenantId = 'test-tenant-id'
      const mockKeys = [
        'signal:api:test-tenant-id:list:abc123',
        'signal:api:test-tenant-id:find:def456',
        'signal:api:test-tenant-id:export:ghi789',
      ]
      
      mockRedis.keys.mockResolvedValue(mockKeys)
      mockRedis.del.mockResolvedValue(3)

      await service.invalidateAllForTenant(tenantId)

      expect(mockRedis.keys).toHaveBeenCalledWith('signal:api:test-tenant-id:*')
      expect(mockRedis.del).toHaveBeenCalledWith(...mockKeys)
      expect(mockLog.info).toHaveBeenCalledWith(
        'Invalidated all signals cache for tenant',
        { tenantId, keysInvalidated: 3 }
      )
    })

    it('should handle case when no keys exist', async () => {
      const tenantId = 'test-tenant-id'
      mockRedis.keys.mockResolvedValue([])

      await service.invalidateAllForTenant(tenantId)

      expect(mockRedis.keys).toHaveBeenCalledWith('signal:api:test-tenant-id:*')
      expect(mockRedis.del).not.toHaveBeenCalled()
    })

    it('should handle Redis errors gracefully', async () => {
      const tenantId = 'test-tenant-id'
      mockRedis.keys.mockRejectedValue(new Error('Redis connection failed'))

      await service.invalidateAllForTenant(tenantId)

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to invalidate all signals cache for tenant',
        {
          tenantId,
          error: 'Redis connection failed',
        }
      )
    })
  })

  describe('invalidateForActivity', () => {
    it('should invalidate cache keys related to an activity', async () => {
      const tenantId = 'test-tenant-id'
      const activityId = 'activity-123'
      
      const listKeys = ['signal:api:test-tenant-id:list:abc123']
      const findKeys = ['signal:api:test-tenant-id:find:def456']
      const exportKeys = ['signal:api:test-tenant-id:export:ghi789']
      
      mockRedis.keys
        .mockResolvedValueOnce(listKeys)
        .mockResolvedValueOnce(findKeys)
        .mockResolvedValueOnce(exportKeys)
      
      mockRedis.del.mockResolvedValue(3)

      await service.invalidateForActivity(tenantId, activityId)

      expect(mockRedis.keys).toHaveBeenCalledWith('signal:api:test-tenant-id:list:*')
      expect(mockRedis.keys).toHaveBeenCalledWith('signal:api:test-tenant-id:find:*')
      expect(mockRedis.keys).toHaveBeenCalledWith('signal:api:test-tenant-id:export:*')
      expect(mockRedis.del).toHaveBeenCalledWith(...listKeys, ...findKeys, ...exportKeys)
      expect(mockLog.info).toHaveBeenCalledWith(
        'Invalidated signals cache for activity',
        { tenantId, activityId, keysInvalidated: 3 }
      )
    })
  })

  describe('invalidateForMember', () => {
    it('should invalidate all cache keys for a member', async () => {
      const tenantId = 'test-tenant-id'
      const memberId = 'member-123'
      const mockKeys = ['signal:api:test-tenant-id:list:abc123']
      
      mockRedis.keys.mockResolvedValue(mockKeys)
      mockRedis.del.mockResolvedValue(1)

      await service.invalidateForMember(tenantId, memberId)

      expect(mockRedis.keys).toHaveBeenCalledWith('signal:api:test-tenant-id:*')
      expect(mockRedis.del).toHaveBeenCalledWith(...mockKeys)
      expect(mockLog.info).toHaveBeenCalledWith(
        'Invalidated signals cache for member',
        { tenantId, memberId, keysInvalidated: 1 }
      )
    })
  })

  describe('invalidateForPlatform', () => {
    it('should invalidate all cache keys for a platform', async () => {
      const tenantId = 'test-tenant-id'
      const platform = 'github'
      const mockKeys = ['signal:api:test-tenant-id:list:abc123']
      
      mockRedis.keys.mockResolvedValue(mockKeys)
      mockRedis.del.mockResolvedValue(1)

      await service.invalidateForPlatform(tenantId, platform)

      expect(mockRedis.keys).toHaveBeenCalledWith('signal:api:test-tenant-id:*')
      expect(mockRedis.del).toHaveBeenCalledWith(...mockKeys)
      expect(mockLog.info).toHaveBeenCalledWith(
        'Invalidated signals cache for platform',
        { tenantId, platform, keysInvalidated: 1 }
      )
    })
  })

  describe('invalidateForCluster', () => {
    it('should invalidate all cache keys for a cluster', async () => {
      const tenantId = 'test-tenant-id'
      const clusterId = 'cluster-123'
      const mockKeys = ['signal:api:test-tenant-id:list:abc123']
      
      mockRedis.keys.mockResolvedValue(mockKeys)
      mockRedis.del.mockResolvedValue(1)

      await service.invalidateForCluster(tenantId, clusterId)

      expect(mockRedis.keys).toHaveBeenCalledWith('signal:api:test-tenant-id:*')
      expect(mockRedis.del).toHaveBeenCalledWith(...mockKeys)
      expect(mockLog.info).toHaveBeenCalledWith(
        'Invalidated signals cache for cluster',
        { tenantId, clusterId, keysInvalidated: 1 }
      )
    })
  })

  describe('cleanupExpiredCache', () => {
    it('should complete cleanup without errors', async () => {
      await service.cleanupExpiredCache()

      expect(mockLog.debug).toHaveBeenCalledWith(
        'Cache cleanup completed - Redis handles TTL expiration automatically'
      )
    })

    it('should handle cleanup errors gracefully', async () => {
      // Force an error by making the log method throw
      mockLog.debug.mockImplementation(() => {
        throw new Error('Logging failed')
      })

      await service.cleanupExpiredCache()

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to cleanup expired cache',
        { error: 'Logging failed' }
      )
    })
  })
})