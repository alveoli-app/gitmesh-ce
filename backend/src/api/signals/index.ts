import { safeWrap } from '../../middlewares/errorMiddleware'
import { getRateLimitMiddleware } from './middleware/rateLimitMiddleware'
import { getSignalsCacheMiddleware } from './middleware/cacheMiddleware'

export default (app) => {
  // Apply rate limiting to all signals endpoints
  const rateLimitMiddleware = getRateLimitMiddleware()
  
  // Create cache middleware instance (will be initialized with request context)
  const createCacheMiddleware = (req, res, next) => {
    const cacheMiddleware = getSignalsCacheMiddleware(req)
    req.signalsCacheMiddleware = cacheMiddleware
    next()
  }
  
  app.get(`/tenant/:tenantId/signals`, 
    rateLimitMiddleware, 
    createCacheMiddleware,
    (req, res, next) => req.signalsCacheMiddleware.cacheSignalsList()(req, res, next),
    safeWrap(require('./signalsList').default)
  )
  
  app.get(`/tenant/:tenantId/signals/:id`, 
    rateLimitMiddleware,
    createCacheMiddleware,
    (req, res, next) => req.signalsCacheMiddleware.cacheSignalsFind()(req, res, next),
    safeWrap(require('./signalsFind').default)
  )
  
  app.get(`/tenant/:tenantId/signals/export`, 
    rateLimitMiddleware,
    createCacheMiddleware,
    (req, res, next) => req.signalsCacheMiddleware.cacheSignalsExport()(req, res, next),
    safeWrap(require('./signalsExport').default)
  )
}