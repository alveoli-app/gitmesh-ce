#!/usr/bin/env node

import { getServiceLogger } from '@gitmesh/logging'
import { createLoggingService } from '../service/loggingService'
import { createTracingService } from '../service/tracingService'
import { createMetricsService } from '../service/metricsService'

const logger = getServiceLogger()

/**
 * Demonstration of observability features
 * Shows how logging, tracing, and metrics work together
 */
async function demonstrateObservability() {
  logger.info('Starting observability demonstration')

  // Initialize observability services
  const loggingService = createLoggingService('demo')
  const tracingService = createTracingService(loggingService)
  const metricsService = createMetricsService(loggingService)

  const correlationId = loggingService.generateCorrelationId()

  loggingService.info(
    'Observability services initialized',
    { demo: true, services: ['logging', 'tracing', 'metrics'] },
    correlationId
  )

  // Demonstrate batch processing observability
  const batchSpan = tracingService.startBatchSpan(50, 'demo-tenant', correlationId)
  
  try {
    loggingService.info(
      'Starting demo batch processing',
      { batchSize: 50, tenantId: 'demo-tenant' },
      correlationId,
      batchSpan
    )

    // Simulate batch processing
    const startTime = Date.now()
    await simulateBatchProcessing(loggingService, tracingService, metricsService, correlationId, batchSpan)
    const duration = Date.now() - startTime

    // Record batch metrics
    metricsService.recordBatchMetrics(50, 50, 45, 5, duration, 'demo-tenant')

    // Log batch completion
    loggingService.logBatchMetrics(50, 50, 45, 5, duration, correlationId, batchSpan)

    // Finish batch span
    tracingService.finishSpan(
      batchSpan,
      {
        'batch.processed': 50,
        'batch.succeeded': 45,
        'batch.failed': 5,
        'batch.duration_ms': duration,
      },
      correlationId
    )

    loggingService.info(
      'Demo batch processing completed successfully',
      { processed: 50, succeeded: 45, failed: 5, duration },
      correlationId
    )

  } catch (error) {
    loggingService.error(
      'Demo batch processing failed',
      error as Error,
      { batchSize: 50 },
      correlationId,
      batchSpan
    )

    tracingService.finishSpanWithError(batchSpan, error as Error, {}, correlationId)
  }

  // Demonstrate API metrics
  metricsService.recordApiMetrics('GET', '/api/v1/signals', 200, 150, 1024, 2048)
  metricsService.recordApiMetrics('POST', '/api/v1/signals', 400, 75, 512)

  // Demonstrate queue metrics
  metricsService.recordQueueMetrics('enrichment-queue', 'enqueue', 'demo-tenant', 25)
  metricsService.recordQueueMetrics('retry-queue', 'retry', 'demo-tenant', 5, 2)

  // Output metrics
  const metrics = await metricsService.getMetrics()
  logger.info('Generated metrics', { metricsLength: metrics.length })

  logger.info('Observability demonstration completed')
}

/**
 * Simulate batch processing with individual activity processing
 */
async function simulateBatchProcessing(
  loggingService: any,
  tracingService: any,
  metricsService: any,
  correlationId: string,
  parentSpan: any
) {
  const activities = Array.from({ length: 5 }, (_, i) => ({
    id: `activity-${i + 1}`,
    platform: ['github', 'reddit', 'discord', 'slack'][i % 4],
  }))

  for (const activity of activities) {
    const activitySpan = tracingService.startActivitySpan(
      activity.id,
      activity.platform,
      parentSpan,
      correlationId
    )

    try {
      loggingService.debug(
        'Processing demo activity',
        { activityId: activity.id, platform: activity.platform },
        correlationId,
        activitySpan
      )

      // Simulate enrichment steps
      const steps = ['identity_resolution', 'embedding_generation', 'classification', 'scoring']
      
      for (const stepName of steps) {
        const stepSpan = tracingService.startStepSpan(
          stepName,
          activity.id,
          activitySpan,
          correlationId
        )

        const stepStartTime = Date.now()
        
        // Simulate step processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
        
        const stepDuration = Date.now() - stepStartTime
        const success = Math.random() > 0.1 // 90% success rate

        // Record step metrics
        metricsService.recordStepMetrics(
          stepName,
          activity.platform,
          stepDuration,
          success,
          'demo-tenant'
        )

        // Log step completion
        loggingService.logStepMetrics(
          stepName,
          activity.id,
          success,
          stepDuration,
          success ? undefined : new Error('Simulated step failure'),
          correlationId,
          stepSpan
        )

        if (success) {
          tracingService.finishSpan(stepSpan, { 'step.duration_ms': stepDuration }, correlationId)
        } else {
          tracingService.finishSpanWithError(
            stepSpan,
            new Error('Simulated step failure'),
            { 'step.duration_ms': stepDuration },
            correlationId
          )
        }
      }

      // Record activity metrics
      metricsService.recordActivityMetrics(activity.platform, 'processed', 'demo-tenant')
      metricsService.recordActivityMetrics(activity.platform, 'enriched', 'demo-tenant')

      tracingService.finishSpan(activitySpan, { 'activity.steps_completed': steps.length }, correlationId)

    } catch (error) {
      loggingService.error(
        'Demo activity processing failed',
        error as Error,
        { activityId: activity.id, platform: activity.platform },
        correlationId,
        activitySpan
      )

      metricsService.recordActivityMetrics(
        activity.platform,
        'failed',
        'demo-tenant',
        (error as Error).name
      )

      tracingService.finishSpanWithError(activitySpan, error as Error, {}, correlationId)
    }
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateObservability()
    .then(() => {
      logger.info('Observability demonstration finished successfully')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Observability demonstration failed', { error })
      process.exit(1)
    })
}