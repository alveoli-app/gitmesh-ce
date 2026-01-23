import { getServiceLogger } from '@gitmesh/logging'
import { getRedisClient } from '@gitmesh/redis'
import { getDbConnection } from '@gitmesh/database'
import { getSqsClient } from '@gitmesh/sqs'
import { getServiceTracer } from '@gitmesh/tracing'
import { SignalEnrichmentQueueReceiver } from './queue'
import { SQS_CONFIG, DB_CONFIG, REDIS_CONFIG } from './conf'

const logger = getServiceLogger()
const tracer = getServiceTracer()

const MAX_CONCURRENT_PROCESSING = 5

async function main() {
  try {
    logger.info('Starting Signal Enrichment Worker...')
    
    // Initialize connections
    const sqsClient = getSqsClient(SQS_CONFIG())
    const dbConn = await getDbConnection(DB_CONFIG(), MAX_CONCURRENT_PROCESSING)
    const redisClient = await getRedisClient(REDIS_CONFIG(), true)
    
    // Initialize queue receiver
    const queueReceiver = new SignalEnrichmentQueueReceiver(
      sqsClient,
      redisClient,
      dbConn,
      tracer,
      logger,
      MAX_CONCURRENT_PROCESSING
    )
    
    // Start processing messages
    await queueReceiver.start()
    
    logger.info('Signal Enrichment Worker started successfully')
    
    // Keep the process running
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...')
      await queueReceiver.stop()
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...')
      await queueReceiver.stop()
      process.exit(0)
    })
    
  } catch (error) {
    logger.error('Failed to start Signal Enrichment Worker', { error })
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}