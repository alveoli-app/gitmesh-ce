import { getLogger } from '@gitmesh/logging'
import signalConfig from '../conf'

const logger = getLogger()

export interface ClusteringResult {
  assignments: { activityId: string; clusterId: string }[]
  clusterStats: { clusterId: string; size: number; centroid?: number[] }[]
  outliers: string[]
}

export interface ClusteringInput {
  id: string
  embedding: number[]
}

/**
 * HDBSCAN Clustering Service
 * 
 * This service implements HDBSCAN clustering algorithm for grouping similar signals.
 * It uses Python's scikit-learn HDBSCAN implementation via a Python worker process.
 */
export class ClusteringService {
  private minClusterSize: number
  private outlierClusterId: number

  constructor() {
    this.minClusterSize = signalConfig.opensearch.clustering.minClusterSize
    this.outlierClusterId = signalConfig.opensearch.clustering.outlierClusterId
  }

  /**
   * Cluster signals using HDBSCAN algorithm
   */
  async clusterSignals(signals: ClusteringInput[]): Promise<ClusteringResult> {
    if (signals.length === 0) {
      return {
        assignments: [],
        clusterStats: [],
        outliers: []
      }
    }

    if (signals.length < this.minClusterSize) {
      logger.info(`Not enough signals for clustering (${signals.length} < ${this.minClusterSize}), marking all as outliers`)
      return {
        assignments: signals.map(signal => ({
          activityId: signal.id,
          clusterId: this.outlierClusterId.toString()
        })),
        clusterStats: [],
        outliers: signals.map(signal => signal.id)
      }
    }

    try {
      logger.info(`Starting HDBSCAN clustering for ${signals.length} signals`)
      
      // Prepare data for Python clustering
      const embeddings = signals.map(signal => signal.embedding)
      const signalIds = signals.map(signal => signal.id)

      // Call Python HDBSCAN clustering
      const clusterLabels = await this.runHDBSCAN(embeddings)
      
      // Process clustering results
      const assignments: { activityId: string; clusterId: string }[] = []
      const clusterMap = new Map<string, string[]>()
      const outliers: string[] = []

      for (let i = 0; i < signalIds.length; i++) {
        const signalId = signalIds[i]
        const clusterId = clusterLabels[i].toString()
        
        assignments.push({
          activityId: signalId,
          clusterId: clusterId
        })

        if (clusterId === this.outlierClusterId.toString()) {
          outliers.push(signalId)
        } else {
          if (!clusterMap.has(clusterId)) {
            clusterMap.set(clusterId, [])
          }
          clusterMap.get(clusterId)!.push(signalId)
        }
      }

      // Calculate cluster statistics
      const clusterStats = Array.from(clusterMap.entries()).map(([clusterId, memberIds]) => {
        const clusterEmbeddings = memberIds.map(id => {
          const index = signalIds.indexOf(id)
          return signals[index].embedding
        })
        
        const centroid = this.calculateCentroid(clusterEmbeddings)
        
        return {
          clusterId,
          size: memberIds.length,
          centroid
        }
      })

      logger.info(`Clustering completed: ${clusterStats.length} clusters, ${outliers.length} outliers`)
      
      return {
        assignments,
        clusterStats,
        outliers
      }
    } catch (error) {
      logger.error('Failed to cluster signals', { error })
      throw error
    }
  }

  /**
   * Run HDBSCAN clustering using Python worker
   * This is a placeholder implementation - in a real system, this would call
   * a Python worker process that runs scikit-learn HDBSCAN
   */
  private async runHDBSCAN(embeddings: number[][]): Promise<number[]> {
    // TODO: Implement actual Python worker call
    // For now, return a simple clustering simulation
    
    logger.info('Running HDBSCAN clustering (simulated)')
    
    // Simulate clustering by grouping similar embeddings
    const clusterLabels: number[] = new Array(embeddings.length).fill(this.outlierClusterId)
    const clusters: number[][] = []
    let nextClusterId = 0

    for (let i = 0; i < embeddings.length; i++) {
      if (clusterLabels[i] !== this.outlierClusterId) continue

      const currentEmbedding = embeddings[i]
      const similarIndices = [i]

      // Find similar embeddings using cosine similarity
      for (let j = i + 1; j < embeddings.length; j++) {
        if (clusterLabels[j] !== this.outlierClusterId) continue

        const similarity = this.cosineSimilarity(currentEmbedding, embeddings[j])
        if (similarity > 0.8) { // Similarity threshold
          similarIndices.push(j)
        }
      }

      // If we have enough similar embeddings, create a cluster
      if (similarIndices.length >= this.minClusterSize) {
        for (const index of similarIndices) {
          clusterLabels[index] = nextClusterId
        }
        clusters.push(similarIndices)
        nextClusterId++
      }
    }

    logger.info(`HDBSCAN simulation created ${clusters.length} clusters`)
    return clusterLabels
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  /**
   * Calculate centroid of a cluster
   */
  private calculateCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return []

    const dimensions = embeddings[0].length
    const centroid = new Array(dimensions).fill(0)

    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += embedding[i]
      }
    }

    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= embeddings.length
    }

    return centroid
  }

  /**
   * Update clustering configuration
   */
  updateConfig(minClusterSize?: number, outlierClusterId?: number): void {
    if (minClusterSize !== undefined) {
      this.minClusterSize = minClusterSize
      logger.info(`Updated min cluster size to ${minClusterSize}`)
    }
    
    if (outlierClusterId !== undefined) {
      this.outlierClusterId = outlierClusterId
      logger.info(`Updated outlier cluster ID to ${outlierClusterId}`)
    }
  }

  /**
   * Get current clustering configuration
   */
  getConfig(): { minClusterSize: number; outlierClusterId: number } {
    return {
      minClusterSize: this.minClusterSize,
      outlierClusterId: this.outlierClusterId
    }
  }
}