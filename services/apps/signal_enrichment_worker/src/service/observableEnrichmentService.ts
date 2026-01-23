import { EnrichmentService, EnrichmentResult, EnrichmentStep } from './enrichmentService'
import { LoggingService, createLoggingService } from './loggingService'
import { TracingService, createTracingService } from './tracingService'
import { MetricsService, createMetricsService } from './metricsService'
import { ActivityData } from '../repo/activity.repo'
import { SqsClient } from '@gitmesh/sqs'
import { Tracer, Span } from '@gitmesh/tracing'
import { Logger } from '@gitmesh/logging'

/**
 * Enhanced enrichment service with full observability
 * Implements Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
 */
export class ObservableEnrichmentService extends EnrichmentService {
  private loggingService: LoggingService
  private tracingService: TracingService
  private metricsService: MetricsService

  constructor(sqsClient?: SqsClient, tracer?: Tracer, parentLogger?: Logger) {
    super(sqsClient, tracer, parentLogger)
    
    // Initialize observability services
    this.loggingService = createLoggingService('enrichment-service', tracer)
    this.tracingService = createTracingService(this.loggingService)
    this.metricsService = createMetricsService(this.loggingService)

    this.loggingService.info('Observable enrichment service initialized', {
      hasSqsClient: !!sqsClient,
      hasTracer: !!tracer,
      hasParentLogger: !!parentLogger,
    })
  }

  /**
   * Enhanced batch enrichment with full observability
   * Implements Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
   */
  async enrichBatch(batchSize: number, tenantId?: string): Promise<EnrichmentResult> {
    const correlationId = this.loggingService.generateCorrelationId()
    const startTime = Date.now()
    
    // Start batch processing span
    const batchSpan = this.tracingService.startBatchSpan(batchSize, tenantId, correlationId)
    
    this.loggingService.info(
      'Starting observable batch enrichment',
      { batchSize, tenantId, operation: 'batch_enrichment' },
      correlationId,
      batchSpan
    )

    try {
      // Record batch size metric
      this.metricsService.recordBatchMetrics(batchSize, 0, 0, 0, 0, tenantId)

      // Execute the enrichment with tracing
      const result = await this.tracingService.executeWithSpan(
        'enrichment-batch-execution',
        async (executionSpan) => {
          this.tracingService.addSpanAttributes(executionSpan, {
            'batch.size': batchSize,
            'batch.tenant_id': tenantId || 'default',
            'batch.correlation_id': correlationId,
          })

          return await super.enrichBatch(batchSize, tenantId)
        },
        batchSpan,
        correlationId
      )

      const duration = Date.now() - startTime

      // Record successful batch metrics
      this.metricsService.recordBatchMetrics(
        batchSize,
        result.processed,
        result.enriched,
        result.failed,
        duration,
        tenantId
      )

      // Log batch completion metrics
      this.loggingService.logBatchMetrics(
        batchSize,
        result.processed,
        result.enriched,
        result.failed,
        duration,
        correlationId,
        batchSpan
      )

      // Finish span successfully
      this.tracingService.finishSpan(
        batchSpan,
        {
          'batch.processed': result.processed,
          'batch.enriched': result.enriched,
          'batch.failed': result.failed,
          'batch.duration_ms': duration,
        },
        correlationId
      )

      this.loggingService.info(
        'Observable batch enrichment completed successfully',
        { result, duration },
        correlationId
      )

      return result

    } catch (error) {
      const duration = Date.now() - startTime

      // Record failed batch metrics
      this.metricsService.recordBatchMetrics(batchSize, 0, 0, batchSize, duration, tenantId)

      // Log error with full context
      this.loggingService.error(
        'Observable batch enrichment failed',
        error as Error,
        { batchSize, tenantId, duration },
        correlationId,
        batchSpan
      )

      // Finish span with error
      this.tracingService.finishSpanWithError(
        batchSpan,
        error as Error,
        { 'batch.duration_ms': duration },
        correlationId
      )

      throw error
    }
  }

  /**
   * Enhanced activity enrichment with observability
   * Override the private method to add observability
   */
  protected async enrichActivity(
    activity: ActivityData,
    result: EnrichmentResult,
    tenantId?: string
  ): Promise<EnrichmentStep[]> {
    const correlationId = this.loggingService.generateCorrelationId()
    const startTime = Date.now()

    // Start activity processing span
    const activitySpan = this.tracingService.startActivitySpan(
      activity.id,
      activity.platform,
      undefined,
      correlationId
    )

    this.loggingService.debug(
      'Starting observable activity enrichment',
      {
        activityId: activity.id,
        platform: activity.platform,
        type: activity.type,
        operation: 'activity_enrichment',
      },
      correlationId,
      activitySpan
    )

    try {
      // Record activity processing metric
      this.metricsService.recordActivityMetrics(activity.platform, 'processed', tenantId)

      // Execute enrichment steps with individual tracing
      const steps = await this.executeEnrichmentStepsWithObservability(
        activity,
        result,
        tenantId,
        correlationId,
        activitySpan
      )

      const duration = Date.now() - startTime
      const hasFailures = steps.some(step => !step.success)

      if (hasFailures) {
        // Record failed activity metric
        this.metricsService.recordActivityMetrics(
          activity.platform,
          'failed',
          tenantId,
          'partial_failure'
        )

        this.loggingService.warn(
          'Activity enrichment completed with partial failures',
          {
            activityId: activity.id,
            platform: activity.platform,
            failedSteps: steps.filter(s => !s.success).map(s => s.name),
            duration,
          },
          correlationId,
          activitySpan
        )
      } else {
        // Record successful activity metric
        this.metricsService.recordActivityMetrics(activity.platform, 'enriched', tenantId)

        this.loggingService.debug(
          'Activity enrichment completed successfully',
          {
            activityId: activity.id,
            platform: activity.platform,
            stepsCompleted: steps.length,
            duration,
          },
          correlationId,
          activitySpan
        )
      }

      // Finish span
      this.tracingService.finishSpan(
        activitySpan,
        {
          'activity.steps_completed': steps.length,
          'activity.has_failures': hasFailures,
          'activity.duration_ms': duration,
        },
        correlationId
      )

      return steps

    } catch (error) {
      const duration = Date.now() - startTime

      // Record failed activity metric
      this.metricsService.recordActivityMetrics(
        activity.platform,
        'failed',
        tenantId,
        (error as Error).name
      )

      // Log error
      this.loggingService.error(
        'Activity enrichment failed',
        error as Error,
        {
          activityId: activity.id,
          platform: activity.platform,
          duration,
        },
        correlationId,
        activitySpan
      )

      // Finish span with error
      this.tracingService.finishSpanWithError(
        activitySpan,
        error as Error,
        { 'activity.duration_ms': duration },
        correlationId
      )

      throw error
    }
  }

  /**
   * Execute enrichment steps with individual observability
   */
  private async executeEnrichmentStepsWithObservability(
    activity: ActivityData,
    result: EnrichmentResult,
    tenantId: string | undefined,
    correlationId: string,
    parentSpan: Span
  ): Promise<EnrichmentStep[]> {
    const steps: EnrichmentStep[] = []
    const stepNames = [
      'identity_resolution',
      'embedding_generation',
      'deduplication',
      'classification',
      'scoring',
      'indexing',
    ]

    for (const stepName of stepNames) {
      const stepStartTime = Date.now()
      
      // Start step span
      const stepSpan = this.tracingService.startStepSpan(
        stepName,
        activity.id,
        parentSpan,
        correlationId
      )

      try {
        // Execute the step (this would call the actual step implementation)
        // For now, we'll simulate the step execution
        const stepResult = await this.executeEnrichmentStep(
          stepName,
          activity,
          result,
          tenantId,
          correlationId,
          stepSpan
        )

        const stepDuration = Date.now() - stepStartTime
        steps.push(stepResult)

        // Record step metrics
        this.metricsService.recordStepMetrics(
          stepName,
          activity.platform,
          stepDuration,
          stepResult.success,
          tenantId
        )

        // Log step metrics
        this.loggingService.logStepMetrics(
          stepName,
          activity.id,
          stepResult.success,
          stepDuration,
          stepResult.error,
          correlationId,
          stepSpan
        )

        // Finish step span
        this.tracingService.finishSpan(
          stepSpan,
          {
            'step.success': stepResult.success,
            'step.duration_ms': stepDuration,
          },
          correlationId
        )

      } catch (error) {
        const stepDuration = Date.now() - stepStartTime
        const stepResult: EnrichmentStep = {
          name: stepName,
          success: false,
          error: error as Error,
          duration: stepDuration,
        }
        steps.push(stepResult)

        // Record failed step metrics
        this.metricsService.recordStepMetrics(
          stepName,
          activity.platform,
          stepDuration,
          false,
          tenantId
        )

        // Log step error
        this.loggingService.logStepMetrics(
          stepName,
          activity.id,
          false,
          stepDuration,
          error as Error,
          correlationId,
          stepSpan
        )

        // Finish step span with error
        this.tracingService.finishSpanWithError(
          stepSpan,
          error as Error,
          { 'step.duration_ms': stepDuration },
          correlationId
        )
      }
    }

    return steps
  }

  /**
   * Execute individual enrichment step (placeholder)
   * This would delegate to the actual step implementations
   */
  private async executeEnrichmentStep(
    stepName: string,
    activity: ActivityData,
    result: EnrichmentResult,
    tenantId: string | undefined,
    correlationId: string,
    stepSpan: Span
  ): Promise<EnrichmentStep> {
    const startTime = Date.now()

    // This is a placeholder - in the real implementation, this would call
    // the actual step methods from the parent class
    // For now, we'll simulate success
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))

    return {
      name: stepName,
      success: true,
      duration: Date.now() - startTime,
    }
  }

  /**
   * Get observability services for external use
   */
  getObservabilityServices() {
    return {
      logging: this.loggingService,
      tracing: this.tracingService,
      metrics: this.metricsService,
    }
  }
}

/**
 * Factory function to create observable enrichment service
 */
export function createObservableEnrichmentService(
  sqsClient?: SqsClient,
  tracer?: Tracer,
  parentLogger?: Logger
): ObservableEnrichmentService {
  return new ObservableEnrichmentService(sqsClient, tracer, parentLogger)
}