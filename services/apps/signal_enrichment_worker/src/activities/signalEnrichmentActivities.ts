import { getServiceLogger } from '@gitmesh/logging'
import { getRedisClient } from '@gitmesh/redis'
import { getDbConnection } from '@gitmesh/database'
import { getSqsClient } from '@gitmesh/sqs'
import { getServiceTracer } from '@gitmesh/tracing'
import { EnrichmentService, EnrichmentResult } from '../service/enrichmentService'
import { SQS_CONFIG, DB_CONFIG, REDIS_CONFIG } from '../conf'

const logger = getServiceLogger()

/**
 * Activity: Enrich Batch
 * 
 * Processes a batch of activities through the full enrichment pipeline.
 * This activity is called by the SignalEnrichmentWorkflow.
 * 
 * Requirements: 7.2 - Process each activity through enrichment pipeline
 * Requirements: 7.5 - Report metrics for batch processing
 */
export async function enrichBatch(
  batchSize: number = 1000,
  tenantId?: string
): Promise<EnrichmentResult> {
  logger.info('Starting batch enrichment activity', { batchSize, tenantId })

  try {
    // Initialize connections
    const sqsClient = getSqsClient(SQS_CONFIG())
    const dbConn = await getDbConnection(DB_CONFIG(), 5) // Max 5 concurrent connections
    const redisClient = await getRedisClient(REDIS_CONFIG(), true)
    const tracer = getServiceTracer()

    // Create enrichment service
    const enrichmentService = new EnrichmentService(sqsClient, tracer, logger)

    // Process the batch
    const result = await enrichmentService.enrichBatch(batchSize, tenantId)

    logger.info('Batch enrichment activity completed', result)
    return result

  } catch (error) {
    logger.error('Batch enrichment activity failed', { error, batchSize, tenantId })
    throw error
  }
}

/**
 * Activity: Get Batch Metrics
 * 
 * Retrieves metrics about the current state of unenriched activities.
 * Used for monitoring and alerting.
 */
export async function getBatchMetrics(tenantId?: string): Promise<{
  unenrichedCount: number
  totalActivities: number
  oldestUnenriched?: Date
}> {
  logger.info('Getting batch metrics', { tenantId })

  try {
    const dbConn = await getDbConnection(DB_CONFIG(), 1)
    
    // Query for unenriched activities count
    const unenrichedQuery = `
      SELECT COUNT(*) as count
      FROM activities 
      WHERE (signal_metadata IS NULL OR signal_metadata = '{}')
      ${tenantId ? 'AND "tenantId" = $1' : ''}
    `
    
    const totalQuery = `
      SELECT COUNT(*) as count
      FROM activities
      ${tenantId ? 'WHERE "tenantId" = $1' : ''}
    `
    
    const oldestQuery = `
      SELECT MIN("createdAt") as oldest
      FROM activities 
      WHERE (signal_metadata IS NULL OR signal_metadata = '{}')
      ${tenantId ? 'AND "tenantId" = $1' : ''}
    `

    const params = tenantId ? [tenantId] : []
    
    const [unenrichedResult, totalResult, oldestResult] = await Promise.all([
      dbConn.query(unenrichedQuery, params),
      dbConn.query(totalQuery, params),
      dbConn.query(oldestQuery, params),
    ])

    const metrics = {
      unenrichedCount: parseInt(unenrichedResult.rows[0]?.count || '0'),
      totalActivities: parseInt(totalResult.rows[0]?.count || '0'),
      oldestUnenriched: oldestResult.rows[0]?.oldest || undefined,
    }

    logger.info('Batch metrics retrieved', metrics)
    return metrics

  } catch (error) {
    logger.error('Failed to get batch metrics', { error, tenantId })
    throw error
  }
}