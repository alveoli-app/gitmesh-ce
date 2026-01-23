import { Tracer, Span, SpanStatusCode } from '@gitmesh/tracing'
import { Logger } from '@gitmesh/logging'
import { DbConnection, DbStore } from '@gitmesh/database'
import { RedisClient } from '@gitmesh/redis'
import {
  SqsClient,
  SqsQueueReceiver,
  ISqsQueueConfig,
  SqsQueueType,
} from '@gitmesh/sqs'
import {
  IQueueMessage,
} from '@gitmesh/types'
import { EnrichmentService } from '../service/enrichmentService'
import { RetryService, RetryMessage } from '../service/retryService'

export interface SignalEnrichmentQueueMessage extends IQueueMessage {
  type: 'ENRICH_BATCH' | 'RETRY_ENRICHMENT'
  batchSize?: number
  tenantId?: string
  correlationId: string
}

export const SIGNAL_ENRICHMENT_QUEUE_CONFIG: ISqsQueueConfig = {
  name: 'signal-enrichment-queue',
  type: SqsQueueType.STANDARD,
  waitTimeSeconds: 20,
  visibilityTimeout: 300, // 5 minutes
  messageRetentionPeriod: 1209600, // 14 days
  deliveryDelay: 0,
}

export class SignalEnrichmentQueueReceiver extends SqsQueueReceiver {
  constructor(
    client: SqsClient,
    private readonly redisClient: RedisClient,
    private readonly dbConn: DbConnection,
    tracer: Tracer,
    parentLog: Logger,
    maxConcurrentProcessing: number,
  ) {
    super(client, SIGNAL_ENRICHMENT_QUEUE_CONFIG, maxConcurrentProcessing, tracer, parentLog)
  }

  override async processMessage(message: IQueueMessage): Promise<void> {
    await this.tracer.startActiveSpan('ProcessSignalEnrichmentMessage', async (span: Span) => {
      try {
        this.log.trace({ messageType: message.type }, 'Processing signal enrichment message!')

        const enrichmentService = new EnrichmentService(this.client, this.tracer, this.log)
        const retryService = new RetryService(this.client, this.tracer, this.log)
        await retryService.init()

        switch (message.type) {
          case 'ENRICH_BATCH':
            const msg = message as SignalEnrichmentQueueMessage
            await enrichmentService.enrichBatch(
              msg.batchSize || 1000,
              msg.tenantId
            )
            break
          case 'RETRY_ENRICHMENT':
            const retryMsg = message as RetryMessage
            await retryService.processRetryMessage(retryMsg)
            break
          default:
            throw new Error(`Unknown message type: ${message.type}`)
        }

        span.setStatus({
          code: SpanStatusCode.OK,
        })
      } catch (err) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err,
        })

        this.log.error(err, 'Error while processing signal enrichment message!')
        throw err
      } finally {
        span.end()
      }
    })
  }
}