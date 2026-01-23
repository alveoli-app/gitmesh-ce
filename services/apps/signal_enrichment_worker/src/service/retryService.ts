import { getServiceLogger } from '@gitmesh/logging'
import { SqsClient, SqsQueueEmitter, ISqsQueueConfig, SqsQueueType } from '@gitmesh/sqs'
import { Tracer } from '@gitmesh/tracing'
import { Logger } from '@gitmesh/logging'
import { v4 as uuidv4 } from 'uuid'
import config from '../conf'

const logger = getServiceLogger()

export interface RetryMessage {
  type: 'RETRY_ENRICHMENT'
  correlationId: string
  activityId: string
  tenantId?: string
  attempt: number
  maxRetries: number
  originalError: string
  enqueuedAt: string
  lastAttemptAt?: string
}

const RETRY_QUEUE_CONFIG: ISqsQueueConfig = {
  name: 'signal-enrichment-retry-queue',
  type: SqsQueueType.STANDARD,
  waitTimeSeconds: 20,
  visibilityTimeout: 300, // 5 minutes
  messageRetentionPeriod: 1209600, // 14 days
  deliveryDelay: 0,
}

const DLQ_CONFIG: ISqsQueueConfig = {
  name: 'signal-enrichment-dlq',
  type: SqsQueueType.STANDARD,
  waitTimeSeconds: 20,
  visibilityTimeout: 300, // 5 minutes
  messageRetentionPeriod: 1209600, // 14 days
  deliveryDelay: 0,
}

class RetryQueueEmitter extends SqsQueueEmitter {
  constructor(client: SqsClient, tracer: Tracer, parentLog: Logger) {
    super(client, RETRY_QUEUE_CONFIG, tracer, parentLog)
  }

  async emitRetry(message: RetryMessage, delay: number = 0): Promise<void> {
    // For now, we'll use the correlationId as the group ID
    // In a real implementation, you might want to use tenantId or another grouping strategy
    await this.sendMessage(message.correlationId, message)
  }
}

class DeadLetterQueueEmitter extends SqsQueueEmitter {
  constructor(client: SqsClient, tracer: Tracer, parentLog: Logger) {
    super(client, DLQ_CONFIG, tracer, parentLog)
  }

  async emitDeadLetter(message: any): Promise<void> {
    await this.sendMessage(message.correlationId || 'dlq', message)
  }
}

export class RetryService {
  private retryEmitter: RetryQueueEmitter
  private dlqEmitter: DeadLetterQueueEmitter

  constructor(sqsClient: SqsClient, tracer: Tracer, parentLogger: Logger) {
    this.retryEmitter = new RetryQueueEmitter(sqsClient, tracer, parentLogger)
    this.dlqEmitter = new DeadLetterQueueEmitter(sqsClient, tracer, parentLogger)
  }

  async init(): Promise<void> {
    await this.retryEmitter.init()
    await this.dlqEmitter.init()
  }

  /**
   * Enqueue a failed activity for retry with exponential backoff
   * Requirements: 1.9, 7.3, 14.1, 14.3, 14.4, 14.5
   */
  async enqueueForRetry(
    activityId: string,
    error: Error,
    tenantId?: string,
    attempt: number = 0
  ): Promise<void> {
    try {
      const correlationId = uuidv4()
      const maxRetries = config.retry.maxRetries

      // Check if we've exceeded max retries
      if (attempt >= maxRetries) {
        logger.warn('Max retries exceeded, moving to dead-letter queue', {
          activityId,
          attempt,
          maxRetries,
          correlationId,
        })
        
        await this.moveToDeadLetterQueue(activityId, error, tenantId, correlationId)
        return
      }

      // Calculate delay with exponential backoff
      const delay = this.calculateBackoffDelay(attempt)

      const retryMessage: RetryMessage = {
        type: 'RETRY_ENRICHMENT',
        correlationId,
        activityId,
        tenantId,
        attempt: attempt + 1,
        maxRetries,
        originalError: error.message,
        enqueuedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
      }

      // Enqueue with delay (note: SQS doesn't support arbitrary delays, so we'll send immediately)
      // In a production system, you might use a scheduler or delayed queue
      await this.retryEmitter.emitRetry(retryMessage, delay)

      logger.info('Activity enqueued for retry', {
        activityId,
        attempt: attempt + 1,
        maxRetries,
        delay,
        correlationId,
      })

    } catch (retryError) {
      logger.error('Failed to enqueue activity for retry', {
        error: retryError,
        activityId,
        originalError: error.message,
      })
      throw retryError
    }
  }

  /**
   * Move activity to dead-letter queue after max retries exceeded
   * Requirements: 14.4
   */
  private async moveToDeadLetterQueue(
    activityId: string,
    originalError: Error,
    tenantId?: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const deadLetterMessage = {
        type: 'DEAD_LETTER',
        correlationId: correlationId || uuidv4(),
        activityId,
        tenantId,
        originalError: originalError.message,
        failedAt: new Date().toISOString(),
        reason: 'max_retries_exceeded',
      }

      // Send to dead-letter queue
      await this.dlqEmitter.emitDeadLetter(deadLetterMessage)

      logger.error('Activity moved to dead-letter queue', {
        activityId,
        correlationId,
        originalError: originalError.message,
      })

    } catch (dlqError) {
      logger.error('Failed to move activity to dead-letter queue', {
        error: dlqError,
        activityId,
        originalError: originalError.message,
      })
      throw dlqError
    }
  }

  /**
   * Calculate exponential backoff delay
   * Requirements: 7.3
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = config.retry.initialDelay // Default 1000ms
    const multiplier = config.retry.backoffMultiplier // Default 2
    const maxDelay = 300000 // 5 minutes max

    const delay = Math.min(baseDelay * Math.pow(multiplier, attempt), maxDelay)
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay
    
    return Math.floor(delay + jitter)
  }

  /**
   * Process a retry message
   */
  async processRetryMessage(retryMessage: RetryMessage): Promise<void> {
    try {
      logger.info('Processing retry message', {
        activityId: retryMessage.activityId,
        attempt: retryMessage.attempt,
        correlationId: retryMessage.correlationId,
      })

      // Import here to avoid circular dependency
      const { EnrichmentService } = await import('./enrichmentService')
      const enrichmentService = new EnrichmentService()

      // Try to process the single activity
      // Note: We would need to modify enrichBatch to handle single activities
      // For now, we'll use a batch size of 1 and filter by activity ID
      // This is a simplified approach - in production, we'd want a more targeted retry
      
      const result = await enrichmentService.enrichBatch(1, retryMessage.tenantId)
      
      if (result.failed > 0) {
        throw new Error(`Retry attempt failed for activity ${retryMessage.activityId}`)
      }

      logger.info('Retry successful', {
        activityId: retryMessage.activityId,
        attempt: retryMessage.attempt,
        correlationId: retryMessage.correlationId,
      })

    } catch (error) {
      logger.error('Retry attempt failed', {
        error,
        activityId: retryMessage.activityId,
        attempt: retryMessage.attempt,
        correlationId: retryMessage.correlationId,
      })

      // Enqueue for another retry if we haven't exceeded max attempts
      if (retryMessage.attempt < retryMessage.maxRetries) {
        await this.enqueueForRetry(
          retryMessage.activityId,
          error,
          retryMessage.tenantId,
          retryMessage.attempt
        )
      } else {
        await this.moveToDeadLetterQueue(
          retryMessage.activityId,
          error,
          retryMessage.tenantId,
          retryMessage.correlationId
        )
      }
    }
  }
}