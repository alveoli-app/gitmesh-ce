import { proxyActivities, log } from '@temporalio/workflow'
import type * as activities from '../activities/signalEnrichmentActivities'

export interface SignalEnrichmentWorkflowArgs {
  batchSize?: number
  tenantId?: string
}

export interface SignalEnrichmentResult {
  processed: number
  enriched: number
  failed: number
  identitiesResolved: number
  newMembers: number
  newIdentities: number
  embeddingsGenerated: number
  duplicatesDetected: number
  classified: number
  scored: number
  indexed: number
  indexingFailed: number
  partialFailures: number
  duration: number
  batchMetrics: {
    unenrichedCount: number
    totalActivities: number
    oldestUnenriched?: Date
  }
}

// Configure activity timeouts and retry policies
const activity = proxyActivities<typeof activities>({
  startToCloseTimeout: '5m', // 5 minutes per activity
  scheduleToCloseTimeout: '10m', // 10 minutes total workflow timeout
  retry: {
    maximumAttempts: 3,
    initialInterval: '1s',
    backoffCoefficient: 2.0,
    maximumInterval: '30s',
  },
})

/**
 * Signal Enrichment Workflow
 * 
 * Orchestrates the batch processing of activities through the enrichment pipeline.
 * Runs on a cron schedule (default every 15 minutes) to process unenriched activities.
 * 
 * Requirements: 7.1, 7.6 - Execute batch processing every 15 minutes via Temporal workflows
 */
export async function signalEnrichmentWorkflow(
  args: SignalEnrichmentWorkflowArgs = {}
): Promise<SignalEnrichmentResult> {
  const startTime = Date.now()
  const { batchSize = 1000, tenantId } = args

  log.info('Starting signal enrichment workflow', { batchSize, tenantId })

  try {
    // Step 1: Get current batch metrics for monitoring
    // Requirements: 7.5 - Report metrics for batch size, processing time, and error rate
    log.info('Fetching batch metrics')
    const batchMetrics = await activity.getBatchMetrics(tenantId)
    log.info('Batch metrics retrieved', batchMetrics)

    // Step 2: Fetch batch of unenriched activities and process through enrichment pipeline
    // Requirements: 7.2 - Coordinate ingestion, normalization, identity resolution, enrichment, deduplication, and classification steps
    log.info('Starting batch enrichment', { batchSize })
    const enrichmentResult = await activity.enrichBatch(batchSize, tenantId)
    log.info('Batch enrichment completed', enrichmentResult)

    // Step 3: Update signal_metadata in database (handled within enrichBatch)
    // Step 4: Index in OpenSearch (handled within enrichBatch)
    
    const duration = Date.now() - startTime
    const finalResult: SignalEnrichmentResult = {
      ...enrichmentResult,
      duration,
      batchMetrics,
    }

    // Step 5: Report comprehensive metrics
    // Requirements: 7.5 - Emit metrics for batch size, processing time, and error rate
    const errorRate = enrichmentResult.processed > 0 
      ? (enrichmentResult.failed / enrichmentResult.processed) * 100 
      : 0

    log.info('Workflow metrics', {
      batchSize: enrichmentResult.processed,
      processingTime: `${Math.round(duration / 1000)}s`,
      errorRate: `${errorRate.toFixed(2)}%`,
      successRate: `${((enrichmentResult.enriched / Math.max(enrichmentResult.processed, 1)) * 100).toFixed(2)}%`,
      identitiesResolved: enrichmentResult.identitiesResolved,
      newMembers: enrichmentResult.newMembers,
      duplicatesDetected: enrichmentResult.duplicatesDetected,
      indexed: enrichmentResult.indexed,
    })

    // Log warning if workflow execution exceeds 5 minutes (Requirement 7.7)
    if (duration > 5 * 60 * 1000) {
      log.warn('Workflow execution exceeded 5 minutes', { 
        duration: `${Math.round(duration / 1000)}s`,
        batchSize: enrichmentResult.processed,
        processed: enrichmentResult.processed 
      })
    }

    log.info('Signal enrichment workflow completed successfully', {
      processed: enrichmentResult.processed,
      enriched: enrichmentResult.enriched,
      failed: enrichmentResult.failed,
      duration: `${Math.round(duration / 1000)}s`,
    })

    return finalResult

  } catch (error) {
    const duration = Date.now() - startTime
    log.error('Signal enrichment workflow failed', { 
      error: error.message,
      duration: `${Math.round(duration / 1000)}s`,
      batchSize,
      tenantId 
    })
    
    // Re-throw to trigger workflow retry (Requirement 7.3 - retry with exponential backoff)
    throw error
  }
}