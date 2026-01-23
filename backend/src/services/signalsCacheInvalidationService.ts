import { LoggerBase } from '@gitmesh/logging'
import { IServiceOptions } from './IServiceOptions'

/**
 * Service for invalidating signals API cache
 * Handles cache invalidation on activity updates
 */
export default class SignalsCacheInvalidationService extends LoggerBase {
  options: IServiceOptions

  constructor(options: IServiceOptions) {
    super(options.log)
    this.options = options
  }

  /**
   * Invalidate all cached responses for a tenant
   */
  async invalidateAllForTenant(tenantId: string): Promise<void> {
    try {
      if (!this.options.redis) {
        this.log.warn('Redis not available for cache invalidation')
        return
      }
      
      const pattern = `signal:api:${tenantId}:*`
      const keys = await this.options.redis.keys(pattern)
      
      if (keys.length > 0) {
        await this.options.redis.del(...keys)
        this.log.info('Invalidated all signals cache for tenant', { 
          tenantId, 
          keysInvalidated: keys.length 
        })
      }
    } catch (error) {
      this.log.error('Failed to invalidate all signals cache for tenant', {
        tenantId,
        error: error.message
      })
    }
  }

  /**
   * Invalidate cached responses related to a specific activity/signal
   */
  async invalidateForActivity(tenantId: string, activityId: string): Promise<void> {
    try {
      if (!this.options.redis) {
        this.log.warn('Redis not available for cache invalidation')
        return
      }
      
      // Invalidate all list queries (since they might contain this activity)
      const listPattern = `signal:api:${tenantId}:list:*`
      const listKeys = await this.options.redis.keys(listPattern)
      
      // Invalidate specific find query for this activity
      const findPattern = `signal:api:${tenantId}:find:*`
      const findKeys = await this.options.redis.keys(findPattern)
      
      // Invalidate export queries (since they might contain this activity)
      const exportPattern = `signal:api:${tenantId}:export:*`
      const exportKeys = await this.options.redis.keys(exportPattern)
      
      const allKeys = [...listKeys, ...findKeys, ...exportKeys]
      
      if (allKeys.length > 0) {
        await this.options.redis.del(...allKeys)
        this.log.info('Invalidated signals cache for activity', { 
          tenantId, 
          activityId,
          keysInvalidated: allKeys.length 
        })
      }
    } catch (error) {
      this.log.error('Failed to invalidate signals cache for activity', {
        tenantId,
        activityId,
        error: error.message
      })
    }
  }

  /**
   * Invalidate cached responses for a specific member
   */
  async invalidateForMember(tenantId: string, memberId: string): Promise<void> {
    try {
      if (!this.options.redis) {
        this.log.warn('Redis not available for cache invalidation')
        return
      }
      
      // Invalidate all queries that might contain activities from this member
      const pattern = `signal:api:${tenantId}:*`
      const keys = await this.options.redis.keys(pattern)
      
      if (keys.length > 0) {
        await this.options.redis.del(...keys)
        this.log.info('Invalidated signals cache for member', { 
          tenantId, 
          memberId,
          keysInvalidated: keys.length 
        })
      }
    } catch (error) {
      this.log.error('Failed to invalidate signals cache for member', {
        tenantId,
        memberId,
        error: error.message
      })
    }
  }

  /**
   * Invalidate cached responses for a specific platform
   */
  async invalidateForPlatform(tenantId: string, platform: string): Promise<void> {
    try {
      if (!this.options.redis) {
        this.log.warn('Redis not available for cache invalidation')
        return
      }
      
      // Invalidate all queries that might contain activities from this platform
      const pattern = `signal:api:${tenantId}:*`
      const keys = await this.options.redis.keys(pattern)
      
      if (keys.length > 0) {
        await this.options.redis.del(...keys)
        this.log.info('Invalidated signals cache for platform', { 
          tenantId, 
          platform,
          keysInvalidated: keys.length 
        })
      }
    } catch (error) {
      this.log.error('Failed to invalidate signals cache for platform', {
        tenantId,
        platform,
        error: error.message
      })
    }
  }

  /**
   * Invalidate cached responses for a specific cluster
   */
  async invalidateForCluster(tenantId: string, clusterId: string): Promise<void> {
    try {
      if (!this.options.redis) {
        this.log.warn('Redis not available for cache invalidation')
        return
      }
      
      // Invalidate all queries that might contain activities from this cluster
      const pattern = `signal:api:${tenantId}:*`
      const keys = await this.options.redis.keys(pattern)
      
      if (keys.length > 0) {
        await this.options.redis.del(...keys)
        this.log.info('Invalidated signals cache for cluster', { 
          tenantId, 
          clusterId,
          keysInvalidated: keys.length 
        })
      }
    } catch (error) {
      this.log.error('Failed to invalidate signals cache for cluster', {
        tenantId,
        clusterId,
        error: error.message
      })
    }
  }

  /**
   * Scheduled cache cleanup - removes expired keys
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      // Redis automatically handles TTL expiration, but we can log cleanup activity
      this.log.debug('Cache cleanup completed - Redis handles TTL expiration automatically')
    } catch (error) {
      this.log.error('Failed to cleanup expired cache', {
        error: error.message
      })
    }
  }
}