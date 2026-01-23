import { LoggingService, createLoggingService } from '../service/loggingService'
import { TracingService, createTracingService } from '../service/tracingService'
import { MetricsService, createMetricsService } from '../service/metricsService'

// Mock dependencies
jest.mock('@gitmesh/logging')
jest.mock('@gitmesh/tracing')
jest.mock('prom-client')

describe('Observability Services', () => {
  describe('LoggingService', () => {
    let loggingService: LoggingService

    beforeEach(() => {
      loggingService = createLoggingService('test-component')
    })

    it('should generate correlation IDs', () => {
      const correlationId = loggingService.generateCorrelationId()
      expect(correlationId).toBeDefined()
      expect(typeof correlationId).toBe('string')
      expect(correlationId.length).toBeGreaterThan(0)
    })

    it('should log messages with different levels', () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }
      
      // Mock the getLogger method
      jest.spyOn(loggingService, 'getLogger').mockReturnValue(mockLogger as any)

      const correlationId = 'test-correlation-id'
      const context = { testKey: 'testValue' }

      loggingService.debug('Debug message', context, correlationId)
      loggingService.info('Info message', context, correlationId)
      loggingService.warn('Warn message', context, correlationId)
      loggingService.error('Error message', new Error('Test error'), context, correlationId)

      expect(mockLogger.debug).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should log batch metrics', () => {
      const mockLogger = {
        info: jest.fn(),
      }
      
      jest.spyOn(loggingService, 'getLogger').mockReturnValue(mockLogger as any)

      loggingService.logBatchMetrics(100, 95, 90, 5, 5000, 'test-correlation-id')

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          batch_size: 100,
          processed_count: 95,
          succeeded_count: 90,
          failed_count: 5,
          duration_ms: 5000,
        }),
        'Batch processing completed'
      )
    })
  })

  describe('TracingService', () => {
    let tracingService: TracingService
    let loggingService: LoggingService

    beforeEach(() => {
      loggingService = createLoggingService('test-component')
      tracingService = createTracingService(loggingService)
    })

    it('should create tracing service', () => {
      expect(tracingService).toBeDefined()
      expect(tracingService.getTracer).toBeDefined()
    })

    it('should start and finish spans', () => {
      const mockSpan = {
        setAttributes: jest.fn(),
        setStatus: jest.fn(),
        end: jest.fn(),
        spanContext: jest.fn().mockReturnValue({ spanId: 'test-span-id' }),
      }

      const mockTracer = {
        startSpan: jest.fn().mockReturnValue(mockSpan),
      }

      jest.spyOn(tracingService, 'getTracer').mockReturnValue(mockTracer as any)

      const span = tracingService.startBatchSpan(100, 'test-tenant', 'test-correlation-id')
      expect(mockTracer.startSpan).toHaveBeenCalled()

      tracingService.finishSpan(span, { test: 'attribute' }, 'test-correlation-id')
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({ test: 'attribute' })
      expect(mockSpan.setStatus).toHaveBeenCalled()
      expect(mockSpan.end).toHaveBeenCalled()
    })
  })

  describe('MetricsService', () => {
    let metricsService: MetricsService
    let loggingService: LoggingService

    beforeEach(() => {
      loggingService = createLoggingService('test-component')
      metricsService = createMetricsService(loggingService)
    })

    it('should create metrics service', () => {
      expect(metricsService).toBeDefined()
      expect(metricsService.getRegistry).toBeDefined()
    })

    it('should record batch metrics', () => {
      // This test verifies the method exists and can be called
      expect(() => {
        metricsService.recordBatchMetrics(100, 95, 90, 5, 5000, 'test-tenant')
      }).not.toThrow()
    })

    it('should record activity metrics', () => {
      expect(() => {
        metricsService.recordActivityMetrics('github', 'processed', 'test-tenant')
        metricsService.recordActivityMetrics('github', 'enriched', 'test-tenant')
        metricsService.recordActivityMetrics('github', 'failed', 'test-tenant', 'network_error')
      }).not.toThrow()
    })

    it('should record step metrics', () => {
      expect(() => {
        metricsService.recordStepMetrics('identity_resolution', 'github', 150, true, 'test-tenant')
        metricsService.recordStepMetrics('classification', 'github', 300, false, 'test-tenant')
      }).not.toThrow()
    })

    it('should record API metrics', () => {
      expect(() => {
        metricsService.recordApiMetrics('GET', '/api/v1/signals', 200, 250, 1024, 2048)
        metricsService.recordApiMetrics('POST', '/api/v1/signals', 400, 100, 512)
      }).not.toThrow()
    })

    it('should record queue metrics', () => {
      expect(() => {
        metricsService.recordQueueMetrics('enrichment-queue', 'enqueue', 'test-tenant', 10)
        metricsService.recordQueueMetrics('retry-queue', 'retry', 'test-tenant', 5, 2)
        metricsService.recordQueueMetrics('dead-letter-queue', 'dead_letter', 'test-tenant', undefined, undefined, 'timeout_error')
      }).not.toThrow()
    })

    it('should provide metrics output', async () => {
      const metrics = await metricsService.getMetrics()
      expect(typeof metrics).toBe('string')
    })
  })
})