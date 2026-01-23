import { getServiceTracer } from '@gitmesh/tracing'
import { Tracer, Span, SpanStatusCode, SpanKind, context, trace } from '@gitmesh/tracing'
import { LoggingService } from './loggingService'

/**
 * Enhanced tracing service for signal enrichment worker
 * Implements Requirement 15.3
 */
export class TracingService {
  private tracer: Tracer
  private loggingService?: LoggingService

  constructor(loggingService?: LoggingService) {
    this.tracer = getServiceTracer()
    this.loggingService = loggingService
  }

  /**
   * Start a new span for batch processing
   * Implements Requirement 15.3
   */
  startBatchSpan(batchSize: number, tenantId?: string, correlationId?: string): Span {
    const span = this.tracer.startSpan('signal-enrichment-batch', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'batch.size': batchSize,
        'batch.tenant_id': tenantId || 'default',
        'batch.correlation_id': correlationId || '',
        'service.name': 'signal-enrichment-worker',
        'operation.type': 'batch_processing',
      },
    })

    this.loggingService?.info(
      'Started batch processing span',
      { batchSize, tenantId, operation: 'batch_processing' },
      correlationId,
      span
    )

    return span
  }

  /**
   * Start a new span for activity enrichment
   * Implements Requirement 15.3
   */
  startActivitySpan(activityId: string, platform: string, parentSpan?: Span, correlationId?: string): Span {
    const spanContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active()
    
    const span = this.tracer.startSpan(
      'signal-enrichment-activity',
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'activity.id': activityId,
          'activity.platform': platform,
          'activity.correlation_id': correlationId || '',
          'service.name': 'signal-enrichment-worker',
          'operation.type': 'activity_enrichment',
        },
      },
      spanContext
    )

    this.loggingService?.debug(
      'Started activity enrichment span',
      { activityId, platform, operation: 'activity_enrichment' },
      correlationId,
      span
    )

    return span
  }

  /**
   * Start a new span for enrichment step
   * Implements Requirement 15.3
   */
  startStepSpan(
    stepName: string,
    activityId: string,
    parentSpan?: Span,
    correlationId?: string
  ): Span {
    const spanContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active()
    
    const span = this.tracer.startSpan(
      `signal-enrichment-step-${stepName}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'step.name': stepName,
          'activity.id': activityId,
          'step.correlation_id': correlationId || '',
          'service.name': 'signal-enrichment-worker',
          'operation.type': 'enrichment_step',
        },
      },
      spanContext
    )

    this.loggingService?.debug(
      `Started enrichment step span: ${stepName}`,
      { stepName, activityId, operation: 'enrichment_step' },
      correlationId,
      span
    )

    return span
  }

  /**
   * Start a new span for API requests
   * Implements Requirement 15.3
   */
  startApiSpan(
    method: string,
    path: string,
    parentSpan?: Span,
    correlationId?: string
  ): Span {
    const spanContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active()
    
    const span = this.tracer.startSpan(
      `api-${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9]/g, '-')}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': method,
          'http.route': path,
          'http.correlation_id': correlationId || '',
          'service.name': 'signal-enrichment-api',
          'operation.type': 'api_request',
        },
      },
      spanContext
    )

    this.loggingService?.debug(
      'Started API request span',
      { method, path, operation: 'api_request' },
      correlationId,
      span
    )

    return span
  }

  /**
   * Start a new span for external service calls
   * Implements Requirement 15.3
   */
  startExternalSpan(
    serviceName: string,
    operation: string,
    parentSpan?: Span,
    correlationId?: string
  ): Span {
    const spanContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active()
    
    const span = this.tracer.startSpan(
      `external-${serviceName}-${operation}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'external.service': serviceName,
          'external.operation': operation,
          'external.correlation_id': correlationId || '',
          'service.name': 'signal-enrichment-worker',
          'operation.type': 'external_call',
        },
      },
      spanContext
    )

    this.loggingService?.debug(
      `Started external service span: ${serviceName}`,
      { serviceName, operation, operationType: 'external_call' },
      correlationId,
      span
    )

    return span
  }

  /**
   * Finish a span with success status
   * Implements Requirement 15.3
   */
  finishSpan(span: Span, attributes?: Record<string, string | number | boolean>, correlationId?: string): void {
    if (attributes) {
      span.setAttributes(attributes)
    }
    
    span.setStatus({ code: SpanStatusCode.OK })
    span.end()

    this.loggingService?.debug(
      'Finished span successfully',
      { spanId: span.spanContext().spanId, attributes },
      correlationId,
      span
    )
  }

  /**
   * Finish a span with error status
   * Implements Requirement 15.3
   */
  finishSpanWithError(
    span: Span,
    error: Error,
    attributes?: Record<string, string | number | boolean>,
    correlationId?: string
  ): void {
    if (attributes) {
      span.setAttributes(attributes)
    }
    
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
    span.recordException(error)
    span.end()

    this.loggingService?.error(
      'Finished span with error',
      error,
      { spanId: span.spanContext().spanId, attributes },
      correlationId,
      span
    )
  }

  /**
   * Add attributes to a span
   * Implements Requirement 15.3
   */
  addSpanAttributes(span: Span, attributes: Record<string, string | number | boolean>): void {
    span.setAttributes(attributes)
  }

  /**
   * Record an event on a span
   * Implements Requirement 15.3
   */
  recordSpanEvent(
    span: Span,
    eventName: string,
    attributes?: Record<string, string | number | boolean>,
    correlationId?: string
  ): void {
    span.addEvent(eventName, attributes)

    this.loggingService?.debug(
      `Recorded span event: ${eventName}`,
      { eventName, attributes },
      correlationId,
      span
    )
  }

  /**
   * Execute a function within a span context
   * Implements Requirement 15.3
   */
  async executeWithSpan<T>(
    spanName: string,
    fn: (span: Span) => Promise<T>,
    parentSpan?: Span,
    correlationId?: string
  ): Promise<T> {
    const spanContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active()
    
    const span = this.tracer.startSpan(spanName, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'operation.correlation_id': correlationId || '',
        'service.name': 'signal-enrichment-worker',
      },
    }, spanContext)

    try {
      const result = await fn(span)
      this.finishSpan(span, undefined, correlationId)
      return result
    } catch (error) {
      this.finishSpanWithError(span, error as Error, undefined, correlationId)
      throw error
    }
  }

  /**
   * Get the underlying tracer instance
   */
  getTracer(): Tracer {
    return this.tracer
  }
}

/**
 * Factory function to create tracing service instances
 */
export function createTracingService(loggingService?: LoggingService): TracingService {
  return new TracingService(loggingService)
}