import { getLogger } from '@gitmesh/logging'
import { OpenSearchService } from './opensearchService'
import { ClusteringService, ClusteringResult } from './clusteringService'
import { IndexingService } from './indexingService'
import { ActivityRepository } from '../repo/activity.repo'

const logger = getLogger()

export interface ClusteringOrchestrationResult {
  tenantId: string
  signalsProcessed: number
  clustersCreated: number
  outliers: number
  duration: number
  success: boolean
  error?: Error
}

/**
 * Service that orchestrates the clustering process for signals
 * Fetches signals from OpenSearch, runs HDBSCAN clustering, and updates cluster assignments
 */
export class ClusteringOrchestrationService {
  private opensearchService: OpenSearchService
  private clusteringService: ClusteringService
  private indexingService: IndexingService
  private activityRepo: ActivityRepository

  constructor() {
    this.opensearchService = new OpenSearchService()
    this.clusteringService = new ClusteringService()
    this.indexingService = new IndexingService()
    this.activityRepo = new ActivityRepository()
  }

  /**
   * Run clustering for a specific tenant
   */
  async runClusteringForTenant(tenantId: string): Promise<ClusteringOrchestrationResult> {
    const startTime = Date.now()
    const result: ClusteringOrchestrationResult = {
      tenantId,
      signalsProcessed: 0,
      clustersCreated: 0,
      outliers: 0,
      duration: 0,
      success: false
    }

    try {
      logger.info(`Starting clustering for tenant ${tenantId}`)

      // Check if index exists
      const indexExists = await this.opensearchService.indexExists(tenantId)
      if (!indexExists) {
        logger.info(`No index found for tenant ${tenantId}, skipping clustering`)
        result.success = true
        result.duration = Date.now() - startTime
        return result
      }

      // Fetch all signals for clustering
      const signals = await this.opensearchService.getAllSignalsForClustering(tenantId)
      result.signalsProcessed = signals.length

      if (signals.length === 0) {
        logger.info(`No signals found for clustering in tenant ${tenantId}`)
        result.success = true
        result.duration = Date.now() - startTime
        return result
      }

      logger.info(`Fetched ${signals.length} signals for clustering`)

      // Run HDBSCAN clustering
      const clusteringResult: ClusteringResult = await this.clusteringService.clusterSignals(signals)
      
      result.clustersCreated = clusteringResult.clusterStats.length
      result.outliers = clusteringResult.outliers.length

      logger.info(`Clustering completed: ${result.clustersCreated} clusters, ${result.outliers} outliers`)

      // Update cluster assignments in OpenSearch
      if (clusteringResult.assignments.length > 0) {
        await this.indexingService.updateClusterAssignments(clusteringResult.assignments, tenantId)
        logger.info(`Updated cluster assignments in OpenSearch`)
      }

      // Update cluster assignments in PostgreSQL
      await this.updateClusterAssignmentsInDatabase(clusteringResult.assignments)
      logger.info(`Updated cluster assignments in database`)

      // Store cluster statistics (for materialized view refresh)
      await this.storeClusterStatistics(tenantId, clusteringResult.clusterStats)
      logger.info(`Stored cluster statistics`)

      result.success = true
      result.duration = Date.now() - startTime

      logger.info(`Clustering completed successfully for tenant ${tenantId}`, result)
      return result

    } catch (error) {
      logger.error(`Clustering failed for tenant ${tenantId}`, { error })
      result.error = error
      result.success = false
      result.duration = Date.now() - startTime
      return result
    }
  }

  /**
   * Run clustering for all tenants
   */
  async runClusteringForAllTenants(): Promise<ClusteringOrchestrationResult[]> {
    try {
      logger.info('Starting clustering for all tenants')

      // Get list of tenants with activities
      const tenants = await this.getTenantsWithActivities()
      logger.info(`Found ${tenants.length} tenants with activities`)

      const results: ClusteringOrchestrationResult[] = []

      // Process each tenant sequentially to avoid overwhelming the system
      for (const tenantId of tenants) {
        try {
          const result = await this.runClusteringForTenant(tenantId)
          results.push(result)
        } catch (error) {
          logger.error(`Failed to run clustering for tenant ${tenantId}`, { error })
          results.push({
            tenantId,
            signalsProcessed: 0,
            clustersCreated: 0,
            outliers: 0,
            duration: 0,
            success: false,
            error
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      const totalSignals = results.reduce((sum, r) => sum + r.signalsProcessed, 0)
      const totalClusters = results.reduce((sum, r) => sum + r.clustersCreated, 0)

      logger.info(`Clustering completed for all tenants`, {
        totalTenants: tenants.length,
        successfulTenants: successCount,
        totalSignals,
        totalClusters
      })

      return results

    } catch (error) {
      logger.error('Failed to run clustering for all tenants', { error })
      throw error
    }
  }

  /**
   * Update cluster assignments in the database
   */
  private async updateClusterAssignmentsInDatabase(
    assignments: { activityId: string; clusterId: string }[]
  ): Promise<void> {
    if (assignments.length === 0) return

    try {
      // Update activities in batches to avoid overwhelming the database
      const batchSize = 100
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize)
        
        const updatePromises = batch.map(async (assignment) => {
          const signalMetadata = {
            cluster_id: assignment.clusterId,
            clustered_at: new Date().toISOString()
          }
          
          return this.activityRepo.updateSignalMetadata(assignment.activityId, signalMetadata)
        })

        await Promise.all(updatePromises)
        logger.debug(`Updated cluster assignments for batch ${Math.floor(i / batchSize) + 1}`)
      }

      logger.info(`Updated cluster assignments in database for ${assignments.length} activities`)
    } catch (error) {
      logger.error('Failed to update cluster assignments in database', { error })
      throw error
    }
  }

  /**
   * Store cluster statistics for materialized view
   */
  private async storeClusterStatistics(
    tenantId: string,
    clusterStats: { clusterId: string; size: number; centroid?: number[] }[]
  ): Promise<void> {
    try {
      // This would typically update a cluster_statistics table or trigger
      // a materialized view refresh. For now, we'll log the statistics.
      
      logger.info(`Cluster statistics for tenant ${tenantId}:`, {
        clusters: clusterStats.map(stat => ({
          id: stat.clusterId,
          size: stat.size,
          centroidDimensions: stat.centroid?.length || 0
        }))
      })

      // TODO: Implement actual cluster statistics storage
      // This could involve:
      // 1. Updating a cluster_statistics table
      // 2. Refreshing a materialized view
      // 3. Storing centroids for similarity search

    } catch (error) {
      logger.error('Failed to store cluster statistics', { error, tenantId })
      throw error
    }
  }

  /**
   * Get list of tenants that have activities
   */
  private async getTenantsWithActivities(): Promise<string[]> {
    try {
      // This would typically query the database for distinct tenant IDs
      // For now, return a default tenant
      return ['default']

      // TODO: Implement actual tenant discovery
      // const tenants = await this.activityRepo.getDistinctTenants()
      // return tenants
    } catch (error) {
      logger.error('Failed to get tenants with activities', { error })
      throw error
    }
  }

  /**
   * Get clustering configuration
   */
  getClusteringConfig(): { minClusterSize: number; outlierClusterId: number } {
    return this.clusteringService.getConfig()
  }

  /**
   * Update clustering configuration
   */
  updateClusteringConfig(minClusterSize?: number, outlierClusterId?: number): void {
    this.clusteringService.updateConfig(minClusterSize, outlierClusterId)
  }

  /**
   * Get clustering statistics for a tenant
   */
  async getClusteringStats(tenantId: string): Promise<any> {
    try {
      const indexStats = await this.opensearchService.getIndexStats(tenantId)
      return {
        tenantId,
        indexExists: await this.opensearchService.indexExists(tenantId),
        documentCount: indexStats?.indices?.[`gitmesh-signals-${tenantId}`]?.total?.docs?.count || 0,
        indexSize: indexStats?.indices?.[`gitmesh-signals-${tenantId}`]?.total?.store?.size_in_bytes || 0
      }
    } catch (error) {
      logger.error(`Failed to get clustering stats for tenant ${tenantId}`, { error })
      throw error
    }
  }
}