import { Request, Response } from 'express'
import { getServiceLogger } from '@gitmesh/logging'
import * as client from 'prom-client'

const logger = getServiceLogger()

/**
 * Metrics controller for exposing Prometheus metrics
 * Implements Requirement 15.4
 */
export class MetricsController {
  private globalRegistry: client.Registry

  constructor() {
    // Create a global registry that combines default metrics
    this.globalRegistry = new client.Registry()
    
    // Add default Node.js metrics
    client.collectDefaultMetrics({ register: this.globalRegistry })
    
    logger.info('Metrics controller initialized')
  }

  /**
   * GET /metrics - Expose Prometheus metrics
   * Implements Requirement 15.4
   */
  getMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const startTime = Date.now()
      
      // Collect metrics from the global registry
      const metricsOutput = await this.globalRegistry.metrics()
      
      const duration = Date.now() - startTime
      
      // Set appropriate headers for Prometheus
      res.set({
        'Content-Type': client.register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      })
      
      // Log metrics request
      logger.debug('Metrics endpoint accessed', {
        duration,
        metricsSize: metricsOutput.length,
        userAgent: req.get('User-Agent'),
        remoteAddress: req.ip,
      })
      
      res.status(200).send(metricsOutput)
      
    } catch (error) {
      logger.error('Failed to generate metrics', { error })
      res.status(500).json({
        error: 'Internal server error while generating metrics',
        message: error.message,
      })
    }
  }

  /**
   * Get the global registry for adding custom metrics
   */
  getRegistry(): client.Registry {
    return this.globalRegistry
  }
}

/**
 * Factory function to create metrics controller
 */
export function createMetricsService(): MetricsController {
  return new MetricsController()
}