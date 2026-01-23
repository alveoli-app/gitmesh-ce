import { Router } from 'express'
import { getServiceLogger } from '@gitmesh/logging'
import { createMetricsService } from './metricsController'

const logger = getServiceLogger()

export default (routes: Router) => {
  try {
    const metricsController = createMetricsService()
    
    // Prometheus metrics endpoint
    // Implements Requirement 15.4
    routes.get('/metrics', metricsController.getMetrics)
    
    logger.info('Metrics API routes registered successfully')
  } catch (error) {
    logger.error('Failed to register metrics API routes', { error })
    throw error
  }
}