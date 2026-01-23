import rateLimit from 'express-rate-limit'
import config from 'config'
import { Error429 } from '@gitmesh/common'

/**
 * Rate limiting middleware for Signals API
 * Tracks requests by API key (from JWT token) or IP address as fallback
 */
export const createSignalsRateLimit = () => {
  const rateLimitConfig = config.get('signalIntelligence.api.rateLimitPerHour') || 1000

  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: rateLimitConfig,
    message: {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${rateLimitConfig} requests per hour allowed.`,
      retryAfter: '1 hour'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    
    // Key generator function - use API key from JWT token or IP as fallback
    keyGenerator: (req) => {
      // Try to get user/tenant info from JWT token for more accurate tracking
      if (req.currentUser && req.currentUser.id) {
        return `user:${req.currentUser.id}`
      }
      
      // Try to get tenant ID for tenant-based rate limiting
      if (req.currentTenant && req.currentTenant.id) {
        return `tenant:${req.currentTenant.id}`
      }
      
      // Fallback to IP address
      return req.ip || req.connection.remoteAddress || 'unknown'
    },
    
    // Skip successful requests that don't count against the limit
    skip: (req, res) => {
      // Don't count successful HEAD requests
      if (req.method === 'HEAD' && res.statusCode < 400) {
        return true
      }
      return false
    },
    
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      const error = new Error429('Rate limit exceeded')
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${rateLimitConfig} requests per hour allowed.`,
        retryAfter: '1 hour',
        timestamp: new Date().toISOString()
      })
    },
    
    // Store rate limit data in memory (for development) or Redis (for production)
    store: undefined, // Uses default MemoryStore, can be replaced with RedisStore for production
  })
}

/**
 * Enhanced rate limiting middleware that uses Redis for distributed rate limiting
 * This should be used in production environments with multiple server instances
 */
export const createDistributedSignalsRateLimit = () => {
  const rateLimitConfig = config.get('signalIntelligence.api.rateLimitPerHour') || 1000
  
  // Note: In a production environment, you would import and configure RedisStore here
  // For now, we'll use the memory store but document the Redis configuration
  
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: rateLimitConfig,
    message: {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${rateLimitConfig} requests per hour allowed.`,
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    
    keyGenerator: (req) => {
      // Use tenant ID for more accurate rate limiting in multi-tenant environment
      if (req.currentTenant && req.currentTenant.id) {
        return `signals:tenant:${req.currentTenant.id}`
      }
      
      // Fallback to user ID
      if (req.currentUser && req.currentUser.id) {
        return `signals:user:${req.currentUser.id}`
      }
      
      // Final fallback to IP
      return `signals:ip:${req.ip || req.connection.remoteAddress || 'unknown'}`
    },
    
    skip: (req, res) => {
      // Don't count successful HEAD requests or health checks
      if (req.method === 'HEAD' && res.statusCode < 400) {
        return true
      }
      if (req.path === '/health' || req.path === '/status') {
        return true
      }
      return false
    },
    
    handler: (req, res) => {
      // Log rate limit violations for monitoring
      const key = req.rateLimit?.key || 'unknown'
      console.warn(`Rate limit exceeded for key: ${key}, IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`)
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${rateLimitConfig} requests per hour allowed.`,
        retryAfter: '1 hour',
        timestamp: new Date().toISOString(),
        requestId: req.id || req.headers['x-request-id'] || 'unknown'
      })
    },
    
    // TODO: Configure RedisStore for production
    // store: new RedisStore({
    //   sendCommand: (...args: string[]) => redisClient.call(...args),
    // }),
  })
}

/**
 * Rate limiting configuration for different environments
 */
export const getRateLimitMiddleware = () => {
  const environment = process.env.NODE_ENV || 'development'
  
  if (environment === 'production') {
    return createDistributedSignalsRateLimit()
  } else {
    return createSignalsRateLimit()
  }
}