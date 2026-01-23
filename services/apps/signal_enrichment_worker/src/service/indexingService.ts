import { getLogger } from '@gitmesh/logging'
import { OpenSearchService, SignalDocument } from './opensearchService'
import { ActivityData } from '../repo/activity.repo'
import { RetryService } from './retryService'
import { SqsClient } from '@gitmesh/sqs'
import { Tracer } from '@gitmesh/tracing'
import { Logger } from '@gitmesh/logging'

const logger = getLogger()

export interface IndexingResult {
  indexed: number
  failed: number
  skipped: number
}

export interface IndexingError {
  activityId: string
  error: Error
  retryable: boolean
}

/**
 * Service responsible for indexing enriched activities in OpenSearch
 * Handles indexing failures with retry queue (Requirements 8.2, 8.6)
 */
export class IndexingService {
  private opensearchService: OpenSearchService
  private retryService?: RetryService

  constructor(sqsClient?: SqsClient, tracer?: Tracer, parentLogger?: Logger) {
    this.opensearchService = new OpenSearchService()
    
    // Initialize retry service if SQS client is provided
    if (sqsClient && tracer && parentLogger) {
      this.retryService = new RetryService(sqsClient, tracer, parentLogger)
    }
  }

  /**
   * Index a single enriched activity
   */
  async indexActivity(activity: ActivityData, tenantId: string): Promise<void> {
    try {
      // Ensure index exists
      await this.opensearchService.createIndex(tenantId)

      // Convert activity to signal document
      const signalDocument = this.convertActivityToSignalDocument(activity, tenantId)
      
      // Skip indexing if activity is not fully enriched
      if (!this.isActivityFullyEnriched(activity)) {
        logger.debug(`Skipping indexing for partially enriched activity`, { 
          activityId: activity.id 
        })
        return
      }

      // Index the signal
      await this.opensearchService.indexSignal(tenantId, signalDocument)
      
      logger.debug(`Successfully indexed activity`, { 
        activityId: activity.id,
        tenantId 
      })
    } catch (error) {
      logger.error(`Failed to index activity`, { 
        error, 
        activityId: activity.id,
        tenantId 
      })

      // Enqueue for retry if retry service is available
      if (this.retryService && this.isRetryableError(error)) {
        try {
          await this.retryService.init()
          await this.retryService.enqueueForRetry(activity.id, error, tenantId)
          logger.info('Activity indexing enqueued for retry', { activityId: activity.id })
        } catch (retryError) {
          logger.error('Failed to enqueue activity indexing for retry', { 
            error: retryError, 
            activityId: activity.id 
          })
        }
      }

      throw error
    }
  }

  /**
   * Bulk index multiple enriched activities
   */
  async bulkIndexActivities(activities: ActivityData[], tenantId: string): Promise<IndexingResult> {
    const result: IndexingResult = {
      indexed: 0,
      failed: 0,
      skipped: 0
    }

    if (activities.length === 0) {
      return result
    }

    try {
      // Ensure index exists
      await this.opensearchService.createIndex(tenantId)

      // Filter and convert activities to signal documents
      const signalDocuments: SignalDocument[] = []
      const indexableActivities: ActivityData[] = []

      for (const activity of activities) {
        if (!this.isActivityFullyEnriched(activity)) {
          result.skipped++
          logger.debug(`Skipping partially enriched activity`, { 
            activityId: activity.id 
          })
          continue
        }

        const signalDocument = this.convertActivityToSignalDocument(activity, tenantId)
        signalDocuments.push(signalDocument)
        indexableActivities.push(activity)
      }

      if (signalDocuments.length === 0) {
        logger.info(`No activities ready for indexing`, { 
          total: activities.length,
          skipped: result.skipped 
        })
        return result
      }

      // Bulk index signals
      await this.opensearchService.bulkIndexSignals(tenantId, signalDocuments)
      result.indexed = signalDocuments.length

      logger.info(`Bulk indexing completed`, { 
        indexed: result.indexed,
        skipped: result.skipped,
        tenantId 
      })

      return result
    } catch (error) {
      logger.error(`Bulk indexing failed`, { 
        error, 
        activityCount: activities.length,
        tenantId 
      })

      // For bulk failures, enqueue individual activities for retry
      if (this.retryService && this.isRetryableError(error)) {
        const retryPromises = activities.map(async (activity) => {
          try {
            await this.retryService!.init()
            await this.retryService!.enqueueForRetry(activity.id, error, tenantId)
          } catch (retryError) {
            logger.error('Failed to enqueue activity for retry', { 
              error: retryError, 
              activityId: activity.id 
            })
          }
        })

        await Promise.allSettled(retryPromises)
        logger.info(`Enqueued ${activities.length} activities for retry after bulk failure`)
      }

      result.failed = activities.length - result.skipped
      return result
    }
  }

  /**
   * Update cluster assignments for indexed signals
   */
  async updateClusterAssignments(
    assignments: { activityId: string; clusterId: string }[], 
    tenantId: string
  ): Promise<void> {
    try {
      await this.opensearchService.updateClusterAssignments(tenantId, assignments)
      
      logger.info(`Updated cluster assignments`, { 
        count: assignments.length,
        tenantId 
      })
    } catch (error) {
      logger.error(`Failed to update cluster assignments`, { 
        error, 
        count: assignments.length,
        tenantId 
      })
      throw error
    }
  }

  /**
   * Delete a signal from the index
   */
  async deleteSignal(activityId: string, tenantId: string): Promise<void> {
    try {
      await this.opensearchService.deleteSignal(tenantId, activityId)
      
      logger.debug(`Deleted signal from index`, { 
        activityId,
        tenantId 
      })
    } catch (error) {
      logger.error(`Failed to delete signal from index`, { 
        error, 
        activityId,
        tenantId 
      })
      throw error
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(tenantId: string): Promise<any> {
    try {
      return await this.opensearchService.getIndexStats(tenantId)
    } catch (error) {
      logger.error(`Failed to get index stats`, { error, tenantId })
      throw error
    }
  }

  /**
   * Check if activity is fully enriched and ready for indexing
   */
  private isActivityFullyEnriched(activity: ActivityData): boolean {
    const signalMetadata = activity.signalMetadata

    if (!signalMetadata) {
      return false
    }

    // Check if all required enrichment steps are completed
    const hasEmbedding = signalMetadata.embedding && 
      signalMetadata.embedding.status !== 'pending' &&
      signalMetadata.embedding.quantized_vector

    const hasClassification = signalMetadata.classification && 
      signalMetadata.classification.status !== 'pending' &&
      signalMetadata.classification.product_area &&
      signalMetadata.classification.sentiment &&
      signalMetadata.classification.urgency &&
      signalMetadata.classification.intent

    const hasScores = signalMetadata.scores && 
      signalMetadata.scores.status !== 'pending' &&
      typeof signalMetadata.scores.velocity === 'number' &&
      typeof signalMetadata.scores.cross_platform === 'number' &&
      typeof signalMetadata.scores.actionability === 'number' &&
      typeof signalMetadata.scores.novelty === 'number'

    const hasDeduplication = signalMetadata.deduplication && 
      signalMetadata.deduplication.status !== 'pending'

    return hasEmbedding && hasClassification && hasScores && hasDeduplication
  }

  /**
   * Convert activity data to OpenSearch signal document
   */
  private convertActivityToSignalDocument(activity: ActivityData, tenantId: string): SignalDocument {
    const signalMetadata = activity.signalMetadata || {}
    
    return {
      activity_id: activity.id,
      tenant_id: tenantId,
      platform: activity.platform,
      type: activity.type,
      timestamp: activity.timestamp.toISOString(),
      member_id: activity.memberId || '',
      content: this.extractTextContent(activity),
      embedding: signalMetadata.embedding?.quantized_vector || [],
      classification: {
        product_area: signalMetadata.classification?.product_area || [],
        sentiment: signalMetadata.classification?.sentiment || 'unknown',
        urgency: signalMetadata.classification?.urgency || 'unknown',
        intent: signalMetadata.classification?.intent || []
      },
      scores: {
        velocity: signalMetadata.scores?.velocity || 0,
        cross_platform: signalMetadata.scores?.cross_platform || 0,
        actionability: signalMetadata.scores?.actionability || 0,
        novelty: signalMetadata.scores?.novelty || 0
      },
      cluster_id: signalMetadata.cluster_id,
      is_duplicate: signalMetadata.deduplication?.is_duplicate || false,
      canonical_id: signalMetadata.deduplication?.canonical_id
    }
  }

  /**
   * Extract text content from activity for indexing
   */
  private extractTextContent(activity: ActivityData): string {
    const parts: string[] = []
    
    if (activity.title) {
      parts.push(activity.title)
    }
    
    if (activity.body) {
      parts.push(activity.body)
    }
    
    return parts.join(' ').trim()
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx HTTP errors are typically retryable
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND') {
      return true
    }

    // OpenSearch specific retryable errors
    if (error.body?.error?.type) {
      const errorType = error.body.error.type
      
      // Retryable OpenSearch errors
      if (errorType === 'cluster_block_exception' ||
          errorType === 'unavailable_shards_exception' ||
          errorType === 'timeout_exception') {
        return true
      }
    }

    // HTTP 5xx errors are retryable
    if (error.statusCode >= 500 && error.statusCode < 600) {
      return true
    }

    // HTTP 429 (Too Many Requests) is retryable
    if (error.statusCode === 429) {
      return true
    }

    return false
  }
}