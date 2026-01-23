import { getServiceLogger } from '@gitmesh/logging'
import { ActivityRepository, ActivityData } from '../repo/activity.repo'
import { IdentityService, IdentityResolutionResult } from './identityService'
import { IndexingService } from './indexingService'
import { RetryService } from './retryService'
import { SqsClient } from '@gitmesh/sqs'
import { Tracer } from '@gitmesh/tracing'
import { Logger } from '@gitmesh/logging'

const logger = getServiceLogger()

export interface EnrichmentResult {
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
}

export interface EnrichmentStep {
  name: string
  success: boolean
  error?: Error
  duration?: number
}

export class EnrichmentService {
  private activityRepo: ActivityRepository
  private identityService: IdentityService
  private indexingService: IndexingService
  private retryService?: RetryService

  constructor(sqsClient?: SqsClient, tracer?: Tracer, parentLogger?: Logger) {
    this.activityRepo = new ActivityRepository()
    this.identityService = new IdentityService()
    this.indexingService = new IndexingService(sqsClient, tracer, parentLogger)
    
    // Initialize retry service if SQS client is provided
    if (sqsClient && tracer && parentLogger) {
      this.retryService = new RetryService(sqsClient, tracer, parentLogger)
    }
  }

  /**
   * Process a batch of activities through the full enrichment pipeline
   * Coordinates identity resolution, embedding, deduplication, classification, scoring
   * Handles partial failures gracefully (Requirements 7.2, 22.3, 22.4)
   */
  async enrichBatch(batchSize: number, tenantId?: string): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      processed: 0,
      enriched: 0,
      failed: 0,
      identitiesResolved: 0,
      newMembers: 0,
      newIdentities: 0,
      embeddingsGenerated: 0,
      duplicatesDetected: 0,
      classified: 0,
      scored: 0,
      indexed: 0,
      indexingFailed: 0,
      partialFailures: 0,
    }

    try {
      logger.info('Starting batch enrichment', { batchSize, tenantId })

      // Fetch unenriched activities
      const activities = await this.activityRepo.fetchUnenrichedActivities(batchSize, tenantId)
      result.processed = activities.length

      if (activities.length === 0) {
        logger.info('No unenriched activities found')
        return result
      }

      // Process each activity through the enrichment pipeline
      for (const activity of activities) {
        try {
          const enrichmentSteps = await this.enrichActivity(activity, result, tenantId)
          
          // Check if activity was fully enriched or had partial failures
          const hasFailures = enrichmentSteps.some(step => !step.success)
          if (hasFailures) {
            result.partialFailures++
            logger.warn('Activity had partial enrichment failures', { 
              activityId: activity.id,
              failedSteps: enrichmentSteps.filter(s => !s.success).map(s => s.name)
            })
          } else {
            result.enriched++
          }
        } catch (error) {
          logger.error('Failed to enrich activity', { 
            error, 
            activityId: activity.id,
            platform: activity.platform 
          })
          result.failed++

          // Enqueue for retry if retry service is available
          if (this.retryService) {
            try {
              await this.retryService.init() // Initialize if not already done
              await this.retryService.enqueueForRetry(activity.id, error, tenantId)
              logger.info('Activity enqueued for retry', { activityId: activity.id })
            } catch (retryError) {
              logger.error('Failed to enqueue activity for retry', { 
                error: retryError, 
                activityId: activity.id 
              })
            }
          }
        }
      }

      logger.info('Batch enrichment completed', result)
      return result

    } catch (error) {
      logger.error('Batch enrichment failed', { error, batchSize, tenantId })
      throw error
    }
  }

  /**
   * Enrich a single activity through the full enrichment pipeline
   * Handles partial failures gracefully - continues processing even if some steps fail
   */
  private async enrichActivity(activity: ActivityData, result: EnrichmentResult, tenantId?: string): Promise<EnrichmentStep[]> {
    const steps: EnrichmentStep[] = []
    const signalMetadata: any = {
      enriched_at: new Date().toISOString(),
      enrichment_version: '1.0',
    }

    try {
      // Step 1: Identity Resolution (Requirements 3.1, 3.2, 3.3, 3.4, 3.7)
      const identityStep = await this.performIdentityResolution(activity, result, signalMetadata)
      steps.push(identityStep)

      // Step 2: Embedding Generation (Requirements 4.1, 4.2, 4.3, 4.4, 4.5)
      const embeddingStep = await this.performEmbeddingGeneration(activity, result, signalMetadata)
      steps.push(embeddingStep)

      // Step 3: Deduplication (Requirements 5.1, 5.2, 5.4, 5.5, 5.6)
      const deduplicationStep = await this.performDeduplication(activity, result, signalMetadata)
      steps.push(deduplicationStep)

      // Step 4: Classification (Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.7)
      const classificationStep = await this.performClassification(activity, result, signalMetadata)
      steps.push(classificationStep)

      // Step 5: Scoring (Requirements 10.1, 10.2, 10.3, 10.4, 10.5)
      const scoringStep = await this.performScoring(activity, result, signalMetadata)
      steps.push(scoringStep)

      // Update signal metadata with all enrichment results
      await this.activityRepo.updateSignalMetadata(activity.id, signalMetadata)

      // Step 6: Index in OpenSearch (Requirements 8.2, 8.6)
      const indexingStep = await this.performIndexing(activity, result, signalMetadata, tenantId)
      steps.push(indexingStep)

      logger.debug('Activity enrichment pipeline completed', { 
        activityId: activity.id,
        successfulSteps: steps.filter(s => s.success).length,
        failedSteps: steps.filter(s => !s.success).length
      })

      return steps

    } catch (error) {
      logger.error('Failed to enrich activity', { error, activityId: activity.id })
      throw error
    }
  }

  /**
   * Step 1: Identity Resolution
   */
  private async performIdentityResolution(
    activity: ActivityData, 
    result: EnrichmentResult, 
    signalMetadata: any
  ): Promise<EnrichmentStep> {
    const startTime = Date.now()
    
    try {
      const identityResult: IdentityResolutionResult = await this.identityService.resolveIdentity(activity)
      
      result.identitiesResolved++
      if (identityResult.isNewMember) {
        result.newMembers++
      }
      if (identityResult.isNewIdentity) {
        result.newIdentities++
      }

      // Update activity with resolved member ID
      if (activity.memberId !== identityResult.memberId) {
        await this.activityRepo.updateActivityMember(activity.id, identityResult.memberId)
      }

      // Add to signal metadata
      signalMetadata.identity_resolution = {
        resolved_member_id: identityResult.memberId,
        is_new_member: identityResult.isNewMember,
        is_new_identity: identityResult.isNewIdentity,
      }

      return {
        name: 'identity_resolution',
        success: true,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      logger.error('Identity resolution failed', { error, activityId: activity.id })
      return {
        name: 'identity_resolution',
        success: false,
        error,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Step 2: Embedding Generation (Placeholder - will be implemented when embedding library is ready)
   */
  private async performEmbeddingGeneration(
    activity: ActivityData, 
    result: EnrichmentResult, 
    signalMetadata: any
  ): Promise<EnrichmentStep> {
    const startTime = Date.now()
    
    try {
      // TODO: Implement when @gitmesh/embeddings library is available
      // const embeddingService = new EmbeddingService()
      // const embedding = await embeddingService.generateEmbedding(activity.body || activity.title || '')
      // const quantizedEmbedding = await embeddingService.quantizeEmbedding(embedding)
      
      // For now, mark as placeholder
      signalMetadata.embedding = {
        status: 'pending',
        message: 'Embedding generation will be implemented when embedding library is available',
      }

      // Don't increment result.embeddingsGenerated since this is a placeholder
      
      return {
        name: 'embedding_generation',
        success: true, // Mark as success for now to avoid blocking pipeline
        duration: Date.now() - startTime,
      }
    } catch (error) {
      logger.error('Embedding generation failed', { error, activityId: activity.id })
      return {
        name: 'embedding_generation',
        success: false,
        error,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Step 3: Deduplication (Placeholder - will be implemented when deduplication library is ready)
   */
  private async performDeduplication(
    activity: ActivityData, 
    result: EnrichmentResult, 
    signalMetadata: any
  ): Promise<EnrichmentStep> {
    const startTime = Date.now()
    
    try {
      // TODO: Implement when @gitmesh/deduplication library is available
      // const deduplicationService = new DeduplicationService()
      // const signature = deduplicationService.computeSignature(activity.body || activity.title || '')
      // const duplicates = await deduplicationService.findDuplicates(signature)
      
      // For now, mark as placeholder
      signalMetadata.deduplication = {
        status: 'pending',
        message: 'Deduplication will be implemented when deduplication library is available',
        is_duplicate: false,
      }

      // Don't increment result.duplicatesDetected since this is a placeholder
      
      return {
        name: 'deduplication',
        success: true, // Mark as success for now to avoid blocking pipeline
        duration: Date.now() - startTime,
      }
    } catch (error) {
      logger.error('Deduplication failed', { error, activityId: activity.id })
      return {
        name: 'deduplication',
        success: false,
        error,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Step 4: Classification (Placeholder - will be implemented when classification library is ready)
   */
  private async performClassification(
    activity: ActivityData, 
    result: EnrichmentResult, 
    signalMetadata: any
  ): Promise<EnrichmentStep> {
    const startTime = Date.now()
    
    try {
      // TODO: Implement when @gitmesh/classification library is available
      // const classificationService = new ClassificationService()
      // const classification = await classificationService.classify(activity)
      
      // For now, mark as placeholder
      signalMetadata.classification = {
        status: 'pending',
        message: 'Classification will be implemented when classification library is available',
        product_area: [],
        sentiment: 'unknown',
        urgency: 'unknown',
        intent: [],
        confidence: 0,
      }

      // Don't increment result.classified since this is a placeholder
      
      return {
        name: 'classification',
        success: true, // Mark as success for now to avoid blocking pipeline
        duration: Date.now() - startTime,
      }
    } catch (error) {
      logger.error('Classification failed', { error, activityId: activity.id })
      return {
        name: 'classification',
        success: false,
        error,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Step 5: Scoring (Placeholder - will be implemented when scoring library is ready)
   */
  private async performScoring(
    activity: ActivityData, 
    result: EnrichmentResult, 
    signalMetadata: any
  ): Promise<EnrichmentStep> {
    const startTime = Date.now()
    
    try {
      // TODO: Implement when @gitmesh/scoring library is available
      // const scoringService = new ScoringService()
      // const scores = await scoringService.computeScores(activity, signalMetadata.classification)
      
      // For now, mark as placeholder
      signalMetadata.scores = {
        status: 'pending',
        message: 'Scoring will be implemented when scoring library is available',
        velocity: 0,
        cross_platform: 0,
        actionability: 0,
        novelty: 0,
      }

      // Don't increment result.scored since this is a placeholder
      
      return {
        name: 'scoring',
        success: true, // Mark as success for now to avoid blocking pipeline
        duration: Date.now() - startTime,
      }
    } catch (error) {
      logger.error('Scoring failed', { error, activityId: activity.id })
      return {
        name: 'scoring',
        success: false,
        error,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Step 6: Index in OpenSearch
   */
  private async performIndexing(
    activity: ActivityData, 
    result: EnrichmentResult, 
    signalMetadata: any,
    tenantId?: string
  ): Promise<EnrichmentStep> {
    const startTime = Date.now()
    
    try {
      // Use provided tenantId or extract from activity or use default
      const indexTenantId = tenantId || activity.tenantId || 'default'
      
      // Update activity with latest signal metadata for indexing
      const updatedActivity = { ...activity, signalMetadata }
      
      // Index the enriched activity
      await this.indexingService.indexActivity(updatedActivity, indexTenantId)
      
      result.indexed++
      
      return {
        name: 'indexing',
        success: true,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      logger.error('Indexing failed', { error, activityId: activity.id })
      result.indexingFailed++
      
      return {
        name: 'indexing',
        success: false,
        error,
        duration: Date.now() - startTime,
      }
    }
  }
}