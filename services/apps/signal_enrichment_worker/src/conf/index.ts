import config from 'config'
import { IDatabaseConfig } from '@gitmesh/database'
import { IRedisConfiguration } from '@gitmesh/redis'
import { ISqsClientConfig } from '@gitmesh/sqs'
import { IOpenSearchConfig } from '@gitmesh/types'
import { ITemporalConfig } from '@gitmesh/temporal'

export interface SignalEnrichmentConfig {
  identityResolution: {
    fuzzyMatchingThreshold: number
    enableFuzzyMatching: boolean
  }
  batchProcessing: {
    batchSize: number
    processingInterval: number
  }
  retry: {
    maxRetries: number
    backoffMultiplier: number
    initialDelay: number
  }
  opensearch: {
    indexPrefix: string
    vectorAlgorithm: string
    vectorParams: {
      m: number
      efConstruction: number
    }
    clustering: {
      minClusterSize: number
      outlierClusterId: number
    }
  }
  temporal: {
    workflowId: string
    taskQueue: string
    cronSchedule: string
    workflowTimeout: string
  }
}

const signalConfig: SignalEnrichmentConfig = {
  identityResolution: {
    fuzzyMatchingThreshold: config.get('signalIntelligence.identityResolution.fuzzyMatchingThreshold') || 0.85,
    enableFuzzyMatching: config.get('signalIntelligence.identityResolution.enableFuzzyMatching') || true,
  },
  batchProcessing: {
    batchSize: config.get('signalIntelligence.batchProcessing.batchSize') || 1000,
    processingInterval: config.get('signalIntelligence.batchProcessing.processingInterval') || 15 * 60 * 1000, // 15 minutes
  },
  retry: {
    maxRetries: config.get('signalIntelligence.retry.maxRetries') || 3,
    backoffMultiplier: config.get('signalIntelligence.retry.backoffMultiplier') || 2,
    initialDelay: config.get('signalIntelligence.retry.initialDelay') || 1000,
  },
  opensearch: {
    indexPrefix: config.get('signalIntelligence.opensearch.indexPrefix') || 'gitmesh-signals',
    vectorAlgorithm: config.get('signalIntelligence.opensearch.vectorAlgorithm') || 'hnsw',
    vectorParams: {
      m: config.get('signalIntelligence.opensearch.vectorParams.m') || 16,
      efConstruction: config.get('signalIntelligence.opensearch.vectorParams.efConstruction') || 100,
    },
    clustering: {
      minClusterSize: config.get('signalIntelligence.clustering.minClusterSize') || 5,
      outlierClusterId: config.get('signalIntelligence.clustering.outlierClusterId') || -1,
    },
  },
  temporal: {
    workflowId: config.get('signalIntelligence.temporal.workflowId') || 'signal-enrichment-workflow',
    taskQueue: config.get('signalIntelligence.temporal.taskQueue') || 'signal-enrichment-queue',
    cronSchedule: config.get('signalIntelligence.temporal.cronSchedule') || '*/15 * * * *', // Every 15 minutes
    workflowTimeout: config.get('signalIntelligence.temporal.workflowTimeout') || '10m',
  },
}

let sqsConfig: ISqsClientConfig
export const SQS_CONFIG = (): ISqsClientConfig => {
  if (sqsConfig) return sqsConfig

  sqsConfig = config.get<ISqsClientConfig>('sqs')
  return sqsConfig
}

let dbConfig: IDatabaseConfig
export const DB_CONFIG = (): IDatabaseConfig => {
  if (dbConfig) return dbConfig

  dbConfig = config.get<IDatabaseConfig>('db')
  return dbConfig
}

let redisConfig: IRedisConfiguration
export const REDIS_CONFIG = (): IRedisConfiguration => {
  if (redisConfig) return redisConfig

  redisConfig = config.get<IRedisConfiguration>('redis')
  return redisConfig
}

let opensearchConfig: IOpenSearchConfig
export const OPENSEARCH_CONFIG = (): IOpenSearchConfig => {
  if (opensearchConfig) return opensearchConfig

  opensearchConfig = config.get<IOpenSearchConfig>('opensearch')
  return opensearchConfig
}

let temporalConfig: ITemporalConfig
export const TEMPORAL_CONFIG = (): ITemporalConfig => {
  if (temporalConfig) return temporalConfig

  temporalConfig = config.get<ITemporalConfig>('temporal')
  return temporalConfig
}

export default signalConfig