import { SignalIntelligenceConfigValidator, validateSignalIntelligenceConfig } from '../signalIntelligenceConfigValidator'
import { SignalIntelligenceConfiguration } from '../configTypes'

describe('SignalIntelligenceConfigValidator', () => {
  let validator: SignalIntelligenceConfigValidator

  beforeEach(() => {
    validator = new SignalIntelligenceConfigValidator()
  })

  const validConfig: SignalIntelligenceConfiguration = {
    processing: {
      batchSize: 1000,
      intervalMinutes: 15,
      maxRetries: 3,
      retryBackoffMs: 1000,
      deadLetterQueueEnabled: true
    },
    embedding: {
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
      quantizedDimensions: 96,
      cacheTtlDays: 7
    },
    deduplication: {
      hammingThreshold: 3,
      signatureBits: 64,
      shingleSize: 3,
      cacheTtlDays: 30
    },
    classification: {
      confidenceThreshold: 0.6,
      modelUpdateIntervalDays: 7,
      productAreaModel: 'models/product-area-classifier.pkl',
      intentModel: 'models/intent-classifier.pkl',
      urgencyModel: 'models/urgency-classifier.pkl'
    },
    scoring: {
      velocityTimeWindowHours: 24,
      decayFactor: 0.8,
      normalizationRange: {
        min: 0,
        max: 100
      }
    },
    clustering: {
      algorithm: 'hdbscan',
      minClusterSize: 5,
      updateIntervalHours: 24,
      outlierClusterId: -1
    },
    opensearch: {
      indexPrefix: 'gitmesh-signals',
      vectorAlgorithm: 'hnsw',
      vectorParams: {
        m: 16,
        efConstruction: 100,
        efSearch: 100
      }
    },
    api: {
      defaultPageSize: 50,
      maxPageSize: 1000,
      rateLimitPerHour: 1000,
      cacheTtlMinutes: 5
    },
    temporal: {
      workflowId: 'signal-enrichment-workflow',
      taskQueue: 'signal-enrichment',
      cronSchedule: '*/15 * * * *'
    },
    sqs: {
      enrichmentQueue: 'signal-enrichment-queue',
      retryQueue: 'signal-retry-queue',
      deadLetterQueue: 'signal-dlq'
    }
  }

  describe('validateConfiguration', () => {
    it('should pass validation for valid configuration', () => {
      expect(() => validator.validateConfiguration(validConfig)).not.toThrow()
    })

    it('should fail validation for missing required fields', () => {
      const invalidConfig = { ...validConfig }
      delete (invalidConfig as any).processing.batchSize

      expect(() => validator.validateConfiguration(invalidConfig)).toThrow(
        'Signal Intelligence configuration validation failed'
      )
    })

    it('should fail validation for invalid batch size', () => {
      const invalidConfig = {
        ...validConfig,
        processing: {
          ...validConfig.processing,
          batchSize: -1
        }
      }

      expect(() => validator.validateConfiguration(invalidConfig)).toThrow(
        'Signal Intelligence configuration validation failed'
      )
    })

    it('should fail validation for invalid confidence threshold', () => {
      const invalidConfig = {
        ...validConfig,
        classification: {
          ...validConfig.classification,
          confidenceThreshold: 1.5
        }
      }

      expect(() => validator.validateConfiguration(invalidConfig)).toThrow(
        'Signal Intelligence configuration validation failed'
      )
    })

    it('should fail validation for invalid cron expression', () => {
      const invalidConfig = {
        ...validConfig,
        temporal: {
          ...validConfig.temporal,
          cronSchedule: 'invalid-cron'
        }
      }

      expect(() => validator.validateConfiguration(invalidConfig)).toThrow(
        'Signal Intelligence configuration validation failed'
      )
    })

    it('should fail validation when defaultPageSize > maxPageSize', () => {
      const invalidConfig = {
        ...validConfig,
        api: {
          ...validConfig.api,
          defaultPageSize: 2000,
          maxPageSize: 1000
        }
      }

      expect(() => validator.validateConfiguration(invalidConfig)).toThrow(
        'Signal Intelligence configuration validation failed'
      )
    })

    it('should fail validation when normalization min >= max', () => {
      const invalidConfig = {
        ...validConfig,
        scoring: {
          ...validConfig.scoring,
          normalizationRange: {
            min: 100,
            max: 50
          }
        }
      }

      expect(() => validator.validateConfiguration(invalidConfig)).toThrow(
        'Signal Intelligence configuration validation failed'
      )
    })
  })

  describe('validateSignalIntelligenceConfig', () => {
    it('should validate configuration without throwing', () => {
      expect(() => validateSignalIntelligenceConfig(validConfig)).not.toThrow()
    })

    it('should throw for invalid configuration', () => {
      const invalidConfig = { ...validConfig }
      delete (invalidConfig as any).processing

      expect(() => validateSignalIntelligenceConfig(invalidConfig)).toThrow()
    })
  })
})