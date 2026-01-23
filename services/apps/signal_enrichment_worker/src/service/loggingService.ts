import { getServiceChildLogger, Logger } from '@gitmesh/logging'
import { Tracer, Span, SpanStatusCode } from '@gitmesh/tracing'
import { addTraceToLogFields } from '@gitmesh/tracing'
import { v4 as uuidv4 } from 'uuid'

/**
 * Enhanced logging service for signal enrichment worker
 * Implements Requirements 15.1, 15.2, 15.6, 15.7
 */
export class LoggingService {
  private logger: Logger
  private tracer?: Tracer

  constructor(componentName: string, tracer?: Tracer) {
    this.logger = getServiceChildLogger(`signal-enrichment-${componentName}`)
    this.tracer = tracer
  }

  /**
   * Generate a correlation ID for tracking requests across services
   * Implements Requirement 15.2
   */
  generateCorrelationId(): string {
    return uuidv4()
  }

  /**
   * Log debug message with correlation ID and trace context
   * Implements Requirements 15.1, 15.2, 15.6
   */
  debug(message: string, context?: Record<string, unknown>, correlationId?: string, span?: Span): void {
    const logFields = this.buildLogFields(context, correlationId, span)
    this.logger.debug(logFields, message)
  }

  /**
   * Log info message with correlation ID and trace context
   * Implements Requirements 15.1, 15.2, 15.6
   */
  info(message: string, context?: Record<string, unknown>, correlationId?: string, span?: Span): void {
    const logFields = this.buildLogFields(context, correlationId, span)
    this.logger.info(logFields, message)
  }

  /**
   * Log warning message with correlation ID and trace context
   * Implements Requirements 15.1, 15.2, 15.6
   */
  warn(message: string, context?: Record<string, unknown>, correlationId?: string, span?: Span): void {
    const logFields = this.buildLogFields(context, correlationId, span)
    this.logger.warn(logFields, message)
  }

  /**
   * Log error message with stack trace, context, and correlation ID
   * Implements Requirements 15.1, 15.2, 15.6, 15.7
   */
  error(message: string, error?: Error, context?: Record<string, unknown>, correlationId?: string, span?: Span): void {
    const logFields = this.buildLogFields(context, correlationId, span)
    
    // Add error details including stack trace (Requirement 15.7)
    if (error) {
      logFields.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error.cause && { cause: error.cause }),
      }
    }

    this.logger.error(logFields, message)

    // Mark span as error if provided
    if (span) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message || message })
      span.recordException(error || new Error(message))
    }
  }

  /**
   * Log batch processing metrics
   * Implements Requirements 15.1, 15.4
   */
  logBatchMetrics(
    batchSize: number,
    processed: number,
    succeeded: number,
    failed: number,
    duration: number,
    correlationId?: string,
    span?: Span
  ): void {
    const metrics = {
      batch_size: batchSize,
      processed_count: processed,
      succeeded_count: succeeded,
      failed_count: failed,
      duration_ms: duration,
      success_rate: processed > 0 ? (succeeded / processed) * 100 : 0,
      throughput_per_second: duration > 0 ? (processed / duration) * 1000 : 0,
    }

    const logFields = this.buildLogFields(metrics, correlationId, span)
    this.logger.info(logFields, 'Batch processing completed')
  }

  /**
   * Log enrichment step metrics
   * Implements Requirements 15.1, 15.4
   */
  logStepMetrics(
    stepName: string,
    activityId: string,
    success: boolean,
    duration: number,
    error?: Error,
    correlationId?: string,
    span?: Span
  ): void {
    const metrics = {
      step_name: stepName,
      activity_id: activityId,
      success,
      duration_ms: duration,
      ...(error && {
        error_type: error.name,
        error_message: error.message,
      }),
    }

    const logFields = this.buildLogFields(metrics, correlationId, span)
    
    if (success) {
      this.logger.info(logFields, `Enrichment step completed: ${stepName}`)
    } else {
      this.logger.error(logFields, `Enrichment step failed: ${stepName}`)
    }
  }

  /**
   * Log API request metrics
   * Implements Requirements 15.1, 15.4
   */
  logApiMetrics(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number,
    correlationId?: string,
    span?: Span
  ): void {
    const metrics = {
      http_method: method,
      http_path: path,
      http_status_code: statusCode,
      duration_ms: duration,
      ...(requestSize && { request_size_bytes: requestSize }),
      ...(responseSize && { response_size_bytes: responseSize }),
    }

    const logFields = this.buildLogFields(metrics, correlationId, span)
    
    if (statusCode >= 400) {
      this.logger.warn(logFields, `API request failed: ${method} ${path}`)
    } else {
      this.logger.info(logFields, `API request completed: ${method} ${path}`)
    }
  }

  /**
   * Log queue metrics
   * Implements Requirements 15.1, 15.4, 15.5
   */
  logQueueMetrics(
    queueName: string,
    operation: 'enqueue' | 'dequeue' | 'retry' | 'dead_letter',
    messageCount: number,
    queueDepth?: number,
    correlationId?: string,
    span?: Span
  ): void {
    const metrics = {
      queue_name: queueName,
      queue_operation: operation,
      message_count: messageCount,
      ...(queueDepth !== undefined && { queue_depth: queueDepth }),
    }

    const logFields = this.buildLogFields(metrics, correlationId, span)
    this.logger.info(logFields, `Queue operation: ${operation} on ${queueName}`)
  }

  /**
   * Build structured log fields with correlation ID and trace context
   * Implements Requirements 15.1, 15.2
   */
  private buildLogFields(
    context?: Record<string, unknown>,
    correlationId?: string,
    span?: Span
  ): Record<string, unknown> {
    let logFields: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      service: 'signal-enrichment-worker',
    }

    // Add correlation ID (Requirement 15.2)
    if (correlationId) {
      logFields.correlation_id = correlationId
    }

    // Add trace context if span is provided (Requirement 15.3)
    if (span) {
      logFields = addTraceToLogFields(span, logFields)
    }

    // Add custom context
    if (context) {
      logFields = { ...logFields, ...context }
    }

    return logFields
  }

  /**
   * Get the underlying logger instance for direct access if needed
   */
  getLogger(): Logger {
    return this.logger
  }
}

/**
 * Factory function to create logging service instances
 */
export function createLoggingService(componentName: string, tracer?: Tracer): LoggingService {
  return new LoggingService(componentName, tracer)
}