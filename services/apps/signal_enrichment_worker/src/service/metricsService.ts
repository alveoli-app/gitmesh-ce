import * as client from 'prom-client'
import { LoggingService } from './loggingService'

/**
 * Prometheus metrics service for signal enrichment worker
 * Implements Requirements 15.4, 15.5
 */
export class MetricsService {
  private register: client.Registry
  private loggingService?: LoggingService

  // Batch processing metrics
  private batchProcessingDuration: client.Histogram<string>
  private batchProcessingTotal: client.Counter<string>
  private batchSizeGauge: client.Gauge<string>
  private activitiesProcessedTotal: client.Counter<string>
  private activitiesEnrichedTotal: client.Counter<string>
  private activitiesFailedTotal: client.Counter<string>

  // Enrichment step metrics
  private enrichmentStepDuration: client.Histogram<string>
  private enrichmentStepTotal: client.Counter<string>

  // API metrics
  private httpRequestDuration: client.Histogram<string>
  private httpRequestsTotal: client.Counter<string>
  private httpRequestSize: client.Histogram<string>
  private httpResponseSize: client.Histogram<string>

  // Queue metrics
  private queueDepthGauge: client.Gauge<string>
  private queueOperationsTotal: client.Counter<string>
  private retryAttemptsTotal: client.Counter<string>
  private deadLetterQueueTotal: client.Counter<string>

  // System metrics
  private memoryUsageGauge: client.Gauge<string>
  private cpuUsageGauge: client.Gauge<string>

  constructor(loggingService?: LoggingService) {
    this.register = new client.Registry()
    this.loggingService = loggingService

    // Add default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.register })

    this.initializeMetrics()
    this.startSystemMetricsCollection()

    this.loggingService?.info('Metrics service initialized', {
      metricsCount: this.register.getMetricsAsArray().length,
    })
  }

  /**
   * Initialize all custom metrics
   * Implements Requirements 15.4, 15.5
   */
  private initializeMetrics(): void {
    // Batch processing metrics
    this.batchProcessingDuration = new client.Histogram({
      name: 'signal_enrichment_batch_duration_seconds',
      help: 'Duration of batch processing operations',
      labelNames: ['tenant_id', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
      registers: [this.register],
    })

    this.batchProcessingTotal = new client.Counter({
      name: 'signal_enrichment_batch_total',
      help: 'Total number of batch processing operations',
      labelNames: ['tenant_id', 'status'],
      registers: [this.register],
    })

    this.batchSizeGauge = new client.Gauge({
      name: 'signal_enrichment_batch_size',
      help: 'Size of current batch being processed',
      labelNames: ['tenant_id'],
      registers: [this.register],
    })

    this.activitiesProcessedTotal = new client.Counter({
      name: 'signal_enrichment_activities_processed_total',
      help: 'Total number of activities processed',
      labelNames: ['tenant_id', 'platform', 'status'],
      registers: [this.register],
    })

    this.activitiesEnrichedTotal = new client.Counter({
      name: 'signal_enrichment_activities_enriched_total',
      help: 'Total number of activities successfully enriched',
      labelNames: ['tenant_id', 'platform'],
      registers: [this.register],
    })

    this.activitiesFailedTotal = new client.Counter({
      name: 'signal_enrichment_activities_failed_total',
      help: 'Total number of activities that failed enrichment',
      labelNames: ['tenant_id', 'platform', 'error_type'],
      registers: [this.register],
    })

    // Enrichment step metrics
    this.enrichmentStepDuration = new client.Histogram({
      name: 'signal_enrichment_step_duration_seconds',
      help: 'Duration of individual enrichment steps',
      labelNames: ['step_name', 'tenant_id', 'platform', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    })

    this.enrichmentStepTotal = new client.Counter({
      name: 'signal_enrichment_step_total',
      help: 'Total number of enrichment steps executed',
      labelNames: ['step_name', 'tenant_id', 'platform', 'status'],
      registers: [this.register],
    })

    // API metrics
    this.httpRequestDuration = new client.Histogram({
      name: 'signal_api_request_duration_seconds',
      help: 'Duration of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    })

    this.httpRequestsTotal = new client.Counter({
      name: 'signal_api_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    })

    this.httpRequestSize = new client.Histogram({
      name: 'signal_api_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
      registers: [this.register],
    })

    this.httpResponseSize = new client.Histogram({
      name: 'signal_api_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
      registers: [this.register],
    })

    // Queue metrics
    this.queueDepthGauge = new client.Gauge({
      name: 'signal_enrichment_queue_depth',
      help: 'Current depth of processing queues',
      labelNames: ['queue_name', 'tenant_id'],
      registers: [this.register],
    })

    this.queueOperationsTotal = new client.Counter({
      name: 'signal_enrichment_queue_operations_total',
      help: 'Total number of queue operations',
      labelNames: ['queue_name', 'operation', 'tenant_id'],
      registers: [this.register],
    })

    this.retryAttemptsTotal = new client.Counter({
      name: 'signal_enrichment_retry_attempts_total',
      help: 'Total number of retry attempts',
      labelNames: ['queue_name', 'tenant_id', 'attempt_number'],
      registers: [this.register],
    })

    this.deadLetterQueueTotal = new client.Counter({
      name: 'signal_enrichment_dead_letter_queue_total',
      help: 'Total number of messages sent to dead letter queue',
      labelNames: ['queue_name', 'tenant_id', 'error_type'],
      registers: [this.register],
    })

    // System metrics
    this.memoryUsageGauge = new client.Gauge({
      name: 'signal_enrichment_memory_usage_bytes',
      help: 'Current memory usage in bytes',
      registers: [this.register],
    })

    this.cpuUsageGauge = new client.Gauge({
      name: 'signal_enrichment_cpu_usage_percent',
      help: 'Current CPU usage percentage',
      registers: [this.register],
    })
  }

  /**
   * Record batch processing metrics
   * Implements Requirement 15.4
   */
  recordBatchMetrics(
    batchSize: number,
    processed: number,
    succeeded: number,
    failed: number,
    duration: number,
    tenantId: string = 'default'
  ): void {
    const durationSeconds = duration / 1000
    const status = failed > 0 ? 'partial_failure' : 'success'

    this.batchProcessingDuration.observe({ tenant_id: tenantId, status }, durationSeconds)
    this.batchProcessingTotal.inc({ tenant_id: tenantId, status })
    this.batchSizeGauge.set({ tenant_id: tenantId }, batchSize)

    this.loggingService?.info('Recorded batch metrics', {
      batchSize,
      processed,
      succeeded,
      failed,
      duration: durationSeconds,
      tenantId,
      status,
    })
  }

  /**
   * Record activity processing metrics
   * Implements Requirement 15.4
   */
  recordActivityMetrics(
    platform: string,
    status: 'processed' | 'enriched' | 'failed',
    tenantId: string = 'default',
    errorType?: string
  ): void {
    switch (status) {
      case 'processed':
        this.activitiesProcessedTotal.inc({ tenant_id: tenantId, platform, status })
        break
      case 'enriched':
        this.activitiesEnrichedTotal.inc({ tenant_id: tenantId, platform })
        break
      case 'failed':
        this.activitiesFailedTotal.inc({ 
          tenant_id: tenantId, 
          platform, 
          error_type: errorType || 'unknown' 
        })
        break
    }
  }

  /**
   * Record enrichment step metrics
   * Implements Requirement 15.4
   */
  recordStepMetrics(
    stepName: string,
    platform: string,
    duration: number,
    success: boolean,
    tenantId: string = 'default'
  ): void {
    const durationSeconds = duration / 1000
    const status = success ? 'success' : 'failure'

    this.enrichmentStepDuration.observe(
      { step_name: stepName, tenant_id: tenantId, platform, status },
      durationSeconds
    )
    this.enrichmentStepTotal.inc({ step_name: stepName, tenant_id: tenantId, platform, status })

    this.loggingService?.debug('Recorded step metrics', {
      stepName,
      platform,
      duration: durationSeconds,
      success,
      tenantId,
    })
  }

  /**
   * Record API request metrics
   * Implements Requirement 15.4
   */
  recordApiMetrics(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    const durationSeconds = duration / 1000
    const statusCodeStr = statusCode.toString()

    this.httpRequestDuration.observe({ method, route, status_code: statusCodeStr }, durationSeconds)
    this.httpRequestsTotal.inc({ method, route, status_code: statusCodeStr })

    if (requestSize !== undefined) {
      this.httpRequestSize.observe({ method, route }, requestSize)
    }

    if (responseSize !== undefined) {
      this.httpResponseSize.observe({ method, route, status_code: statusCodeStr }, responseSize)
    }

    this.loggingService?.debug('Recorded API metrics', {
      method,
      route,
      statusCode,
      duration: durationSeconds,
      requestSize,
      responseSize,
    })
  }

  /**
   * Record queue metrics
   * Implements Requirement 15.5
   */
  recordQueueMetrics(
    queueName: string,
    operation: 'enqueue' | 'dequeue' | 'retry' | 'dead_letter',
    tenantId: string = 'default',
    queueDepth?: number,
    attemptNumber?: number,
    errorType?: string
  ): void {
    this.queueOperationsTotal.inc({ queue_name: queueName, operation, tenant_id: tenantId })

    if (queueDepth !== undefined) {
      this.queueDepthGauge.set({ queue_name: queueName, tenant_id: tenantId }, queueDepth)
    }

    if (operation === 'retry' && attemptNumber !== undefined) {
      this.retryAttemptsTotal.inc({
        queue_name: queueName,
        tenant_id: tenantId,
        attempt_number: attemptNumber.toString(),
      })
    }

    if (operation === 'dead_letter') {
      this.deadLetterQueueTotal.inc({
        queue_name: queueName,
        tenant_id: tenantId,
        error_type: errorType || 'unknown',
      })
    }

    this.loggingService?.debug('Recorded queue metrics', {
      queueName,
      operation,
      tenantId,
      queueDepth,
      attemptNumber,
      errorType,
    })
  }

  /**
   * Start collecting system metrics
   * Implements Requirement 15.5
   */
  private startSystemMetricsCollection(): void {
    // Collect memory and CPU metrics every 30 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage()
      this.memoryUsageGauge.set(memUsage.heapUsed)

      // CPU usage calculation (simplified)
      const cpuUsage = process.cpuUsage()
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
      this.cpuUsageGauge.set(cpuPercent)
    }, 30000)
  }

  /**
   * Get metrics in Prometheus format
   * Implements Requirement 15.4
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics()
  }

  /**
   * Get metrics registry
   */
  getRegistry(): client.Registry {
    return this.register
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.register.resetMetrics()
    this.loggingService?.info('All metrics reset')
  }
}

/**
 * Factory function to create metrics service instances
 */
export function createMetricsService(loggingService?: LoggingService): MetricsService {
  return new MetricsService(loggingService)
}