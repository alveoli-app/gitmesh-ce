import { Client } from '@opensearch-project/opensearch'
import { getOpensearchClient } from '@gitmesh/opensearch'
import { getLogger } from '@gitmesh/logging'
import { OPENSEARCH_CONFIG } from '../conf'
import signalConfig from '../conf'

const logger = getLogger()

export interface SignalDocument {
  activity_id: string
  tenant_id: string
  platform: string
  type: string
  timestamp: string
  member_id: string
  content: string
  embedding: number[]
  classification: {
    product_area: string[]
    sentiment: string
    urgency: string
    intent: string[]
  }
  scores: {
    velocity: number
    cross_platform: number
    actionability: number
    novelty: number
  }
  cluster_id?: string
  is_duplicate: boolean
  canonical_id?: string
}

export interface IndexMappingProperties {
  activity_id: { type: string }
  tenant_id: { type: string }
  platform: { type: string }
  type: { type: string }
  timestamp: { type: string }
  member_id: { type: string }
  content: { type: string; analyzer: string }
  embedding: {
    type: string
    dimension: number
    method: {
      name: string
      space_type: string
      engine: string
      parameters: {
        ef_construction: number
        m: number
      }
    }
  }
  classification: {
    properties: {
      product_area: { type: string }
      sentiment: { type: string }
      urgency: { type: string }
      intent: { type: string }
    }
  }
  scores: {
    properties: {
      velocity: { type: string }
      cross_platform: { type: string }
      actionability: { type: string }
      novelty: { type: string }
    }
  }
  cluster_id: { type: string }
  is_duplicate: { type: string }
  canonical_id: { type: string }
}

export class OpenSearchService {
  private client: Client
  private indexPrefix: string

  constructor() {
    this.client = getOpensearchClient(OPENSEARCH_CONFIG())
    this.indexPrefix = signalConfig.opensearch.indexPrefix
  }

  /**
   * Create index with proper mapping for signal documents
   */
  async createIndex(tenantId: string): Promise<void> {
    const indexName = this.getIndexName(tenantId)
    
    try {
      // Check if index already exists
      const exists = await this.client.indices.exists({ index: indexName })
      if (exists.body) {
        logger.info(`Index ${indexName} already exists`)
        return
      }

      const mapping: IndexMappingProperties = {
        activity_id: { type: 'keyword' },
        tenant_id: { type: 'keyword' },
        platform: { type: 'keyword' },
        type: { type: 'keyword' },
        timestamp: { type: 'date' },
        member_id: { type: 'keyword' },
        content: {
          type: 'text',
          analyzer: 'standard'
        },
        embedding: {
          type: 'knn_vector',
          dimension: 96, // Quantized from 384 to 96
          method: {
            name: signalConfig.opensearch.vectorAlgorithm,
            space_type: 'l2',
            engine: 'nmslib',
            parameters: {
              ef_construction: signalConfig.opensearch.vectorParams.efConstruction,
              m: signalConfig.opensearch.vectorParams.m
            }
          }
        },
        classification: {
          properties: {
            product_area: { type: 'keyword' },
            sentiment: { type: 'keyword' },
            urgency: { type: 'keyword' },
            intent: { type: 'keyword' }
          }
        },
        scores: {
          properties: {
            velocity: { type: 'integer' },
            cross_platform: { type: 'integer' },
            actionability: { type: 'integer' },
            novelty: { type: 'integer' }
          }
        },
        cluster_id: { type: 'keyword' },
        is_duplicate: { type: 'boolean' },
        canonical_id: { type: 'keyword' }
      }

      const response = await this.client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: mapping
          },
          settings: {
            index: {
              knn: true,
              'knn.algo_param.ef_search': 100
            }
          }
        }
      })

      logger.info(`Created index ${indexName}`, { response: response.body })
    } catch (error) {
      logger.error(`Failed to create index ${indexName}`, { error })
      throw error
    }
  }

  /**
   * Index a signal document
   */
  async indexSignal(tenantId: string, signal: SignalDocument): Promise<void> {
    const indexName = this.getIndexName(tenantId)
    
    try {
      await this.client.index({
        index: indexName,
        id: signal.activity_id,
        body: signal
      })

      logger.debug(`Indexed signal ${signal.activity_id} in ${indexName}`)
    } catch (error) {
      logger.error(`Failed to index signal ${signal.activity_id}`, { error, indexName })
      throw error
    }
  }

  /**
   * Bulk index multiple signals
   */
  async bulkIndexSignals(tenantId: string, signals: SignalDocument[]): Promise<void> {
    if (signals.length === 0) return

    const indexName = this.getIndexName(tenantId)
    const body = []

    for (const signal of signals) {
      body.push({ index: { _index: indexName, _id: signal.activity_id } })
      body.push(signal)
    }

    try {
      const response = await this.client.bulk({ body })
      
      if (response.body.errors) {
        const errors = response.body.items
          .filter((item: any) => item.index?.error)
          .map((item: any) => item.index.error)
        
        logger.error(`Bulk indexing had errors`, { errors, indexName })
        throw new Error(`Bulk indexing failed with ${errors.length} errors`)
      }

      logger.info(`Bulk indexed ${signals.length} signals in ${indexName}`)
    } catch (error) {
      logger.error(`Failed to bulk index signals`, { error, indexName, count: signals.length })
      throw error
    }
  }

  /**
   * Search for similar signals using vector similarity
   */
  async searchSimilarSignals(
    tenantId: string, 
    embedding: number[], 
    limit: number = 10,
    minScore: number = 0.7
  ): Promise<SignalDocument[]> {
    const indexName = this.getIndexName(tenantId)
    
    try {
      const response = await this.client.search({
        index: indexName,
        body: {
          query: {
            knn: {
              embedding: {
                vector: embedding,
                k: limit
              }
            }
          },
          min_score: minScore,
          size: limit
        }
      })

      return response.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score
      }))
    } catch (error) {
      logger.error(`Failed to search similar signals`, { error, indexName })
      throw error
    }
  }

  /**
   * Get all signals for clustering
   */
  async getAllSignalsForClustering(tenantId: string): Promise<{ id: string; embedding: number[] }[]> {
    const indexName = this.getIndexName(tenantId)
    
    try {
      const response = await this.client.search({
        index: indexName,
        body: {
          query: { match_all: {} },
          _source: ['activity_id', 'embedding'],
          size: 10000, // Adjust based on expected data size
          scroll: '5m'
        }
      })

      let signals = response.body.hits.hits.map((hit: any) => ({
        id: hit._source.activity_id,
        embedding: hit._source.embedding
      }))

      // Handle scrolling for large datasets
      let scrollId = response.body._scroll_id
      while (response.body.hits.hits.length > 0) {
        const scrollResponse = await this.client.scroll({
          scroll_id: scrollId,
          scroll: '5m'
        })

        if (scrollResponse.body.hits.hits.length === 0) break

        const moreSignals = scrollResponse.body.hits.hits.map((hit: any) => ({
          id: hit._source.activity_id,
          embedding: hit._source.embedding
        }))

        signals = signals.concat(moreSignals)
        scrollId = scrollResponse.body._scroll_id
      }

      // Clear scroll
      if (scrollId) {
        await this.client.clearScroll({ scroll_id: scrollId })
      }

      return signals
    } catch (error) {
      logger.error(`Failed to get signals for clustering`, { error, indexName })
      throw error
    }
  }

  /**
   * Update cluster assignments for signals
   */
  async updateClusterAssignments(tenantId: string, assignments: { activityId: string; clusterId: string }[]): Promise<void> {
    if (assignments.length === 0) return

    const indexName = this.getIndexName(tenantId)
    const body = []

    for (const assignment of assignments) {
      body.push({
        update: {
          _index: indexName,
          _id: assignment.activityId
        }
      })
      body.push({
        doc: {
          cluster_id: assignment.clusterId
        }
      })
    }

    try {
      const response = await this.client.bulk({ body })
      
      if (response.body.errors) {
        const errors = response.body.items
          .filter((item: any) => item.update?.error)
          .map((item: any) => item.update.error)
        
        logger.error(`Bulk cluster update had errors`, { errors, indexName })
        throw new Error(`Bulk cluster update failed with ${errors.length} errors`)
      }

      logger.info(`Updated cluster assignments for ${assignments.length} signals in ${indexName}`)
    } catch (error) {
      logger.error(`Failed to update cluster assignments`, { error, indexName, count: assignments.length })
      throw error
    }
  }

  /**
   * Delete a signal from the index
   */
  async deleteSignal(tenantId: string, activityId: string): Promise<void> {
    const indexName = this.getIndexName(tenantId)
    
    try {
      await this.client.delete({
        index: indexName,
        id: activityId
      })

      logger.debug(`Deleted signal ${activityId} from ${indexName}`)
    } catch (error) {
      if (error.body?.found === false) {
        logger.debug(`Signal ${activityId} not found in ${indexName}`)
        return
      }
      
      logger.error(`Failed to delete signal ${activityId}`, { error, indexName })
      throw error
    }
  }

  /**
   * Check if index exists
   */
  async indexExists(tenantId: string): Promise<boolean> {
    const indexName = this.getIndexName(tenantId)
    
    try {
      const response = await this.client.indices.exists({ index: indexName })
      return response.body
    } catch (error) {
      logger.error(`Failed to check if index exists`, { error, indexName })
      return false
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(tenantId: string): Promise<any> {
    const indexName = this.getIndexName(tenantId)
    
    try {
      const response = await this.client.indices.stats({ index: indexName })
      return response.body
    } catch (error) {
      logger.error(`Failed to get index stats`, { error, indexName })
      throw error
    }
  }

  private getIndexName(tenantId: string): string {
    return `${this.indexPrefix}-${tenantId}`
  }
}