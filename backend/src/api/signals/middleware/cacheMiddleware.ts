import crypto from 'crypto'
import { LoggerBase } from '@gitmesh/logging'
import { IServiceOptions } from '../../../services/IServiceOptions'
import { registerSignalsCacheHooks } from '../../../database/hooks/signalsCacheHooks'

// Global flag to track if hooks are registered
let hooksRegistered = false

/**
 * Cache middleware for Signals API responses
 * Implements Redis-based caching with configurable TTL
 */
export class SignalsCacheMiddleware extends LoggerBase {
  private options: IServiceOptions
  private cacheTtlMinutes: number

  constructor(options: IServiceOptions) {
    super(options.log)
    this.options = options
    this.cacheTtlMinutes = options.config?.signalIntelligence?.api?.cacheTtlMinutes || 5
    
    // Register cache hooks if not already registered
    this.registerCacheHooksIfNeeded()
  }

  /**
   * Register cache hooks with activity model (one-time setup)
   */
  private registerCacheHooksIfNeeded(): void {
    if (!hooksRegistered && this.options.database?.activity && this.options.redis) {
      try {
        registerSignalsCacheHooks(this.options.database.activity, this.options)
        hooksRegistered = true
        this.log.info('Signals cache hooks registered successfully')
      } catch (error) {
        this.log.warn('Failed to register signals cache hooks', { error: error.message })
      }
    }
  }

  /**
   * Generate cache key from query parameters
   */
  private generateCacheKey(tenantId: string, endpoint: string, queryParams: any): string {
    // Sort query parameters for consistent cache keys
    const sortedParams = Object.keys(queryParams)
      .sort()
      .reduce((result, key) => {
        result[key] = queryParams[key]
        return result
      }, {})

    const queryString = JSON.stringify(sortedParams)
    const hash = crypto.createHash('md5').update(queryString).digest('hex')
    
    return `signal:api:${tenantId}:${endpoint}:${hash}`
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(cacheKey: string): Promise<any | null> {
    try {
      if (!this.options.redis) {
        this.log.warn('Redis not available for cache retrieval')
        return null
      }
      
      const cached = await this.options.redis.get(cacheKey)
      if (cached) {
        this.log.debug('Cache hit', { cacheKey })
        return JSON.parse(cached)
      }
      this.log.debug('Cache miss', { cacheKey })
      return null
    } catch (error) {
      this.log.warn('Failed to get cached response', { cacheKey, error: error.message })
      return null
    }
  }

  /**
   * Set cached response
   */
  private async setCachedResponse(cacheKey: string, data: any): Promise<void> {
    try {
      if (!this.options.redis) {
        this.log.warn('Redis not available for caching')
        return
      }
      
      const ttlSeconds = this.cacheTtlMinutes * 60
      await this.options.redis.setex(cacheKey, ttlSeconds, JSON.stringify(data))
      this.log.debug('Response cached', { cacheKey, ttlSeconds })
    } catch (error) {
      this.log.warn('Failed to cache response', { cacheKey, error: error.message })
    }
  }

  /**
   * Cache middleware for signals list endpoint
   */
  cacheSignalsList() {
    return async (req, res, next) => {
      const tenantId = req.params.tenantId
      const cacheKey = this.generateCacheKey(tenantId, 'list', req.query)

      // Try to get cached response
      const cachedResponse = await this.getCachedResponse(cacheKey)
      if (cachedResponse) {
        return await req.responseHandler.success(req, res, cachedResponse)
      }

      // Store original success method
      const originalSuccess = req.responseHandler.success

      // Override success method to cache the response
      req.responseHandler.success = async (req, res, data) => {
        // Cache the response data
        await this.setCachedResponse(cacheKey, data)
        
        // Call original success method
        return originalSuccess.call(req.responseHandler, req, res, data)
      }

      next()
    }
  }

  /**
   * Cache middleware for signals find endpoint
   */
  cacheSignalsFind() {
    return async (req, res, next) => {
      const tenantId = req.params.tenantId
      const signalId = req.params.id
      const cacheKey = this.generateCacheKey(tenantId, 'find', { id: signalId })

      // Try to get cached response
      const cachedResponse = await this.getCachedResponse(cacheKey)
      if (cachedResponse) {
        return await req.responseHandler.success(req, res, cachedResponse)
      }

      // Store original success method
      const originalSuccess = req.responseHandler.success

      // Override success method to cache the response
      req.responseHandler.success = async (req, res, data) => {
        // Cache the response data
        await this.setCachedResponse(cacheKey, data)
        
        // Call original success method
        return originalSuccess.call(req.responseHandler, req, res, data)
      }

      next()
    }
  }

  /**
   * Cache middleware for signals export endpoint
   */
  cacheSignalsExport() {
    return async (req, res, next) => {
      const tenantId = req.params.tenantId
      const cacheKey = this.generateCacheKey(tenantId, 'export', req.query)

      // Try to get cached response
      const cachedResponse = await this.getCachedResponse(cacheKey)
      if (cachedResponse) {
        return await req.responseHandler.success(req, res, cachedResponse)
      }

      // Store original success method
      const originalSuccess = req.responseHandler.success

      // Override success method to cache the response
      req.responseHandler.success = async (req, res, data) => {
        // Cache the response data
        await this.setCachedResponse(cacheKey, data)
        
        // Call original success method
        return originalSuccess.call(req.responseHandler, req, res, data)
      }

      next()
    }
  }
}

/**
 * Factory function to create cache middleware
 */
export function getSignalsCacheMiddleware(options: IServiceOptions) {
  return new SignalsCacheMiddleware(options)
}