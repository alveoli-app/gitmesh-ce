import { getServiceLogger } from '@gitmesh/logging'
import { SignalIntelligenceConfiguration } from './configTypes'

const log = getServiceLogger()

interface ValidationError {
  field: string
  message: string
  value?: any
}

export class SignalIntelligenceConfigValidator {
  private errors: ValidationError[] = []

  validateConfiguration(config: SignalIntelligenceConfiguration): void {
    this.errors = []
    
    if (!config) {
      this.addError('signalIntelligence', 'configuration is required but was undefined or null', config)
      throw new Error('Signal Intelligence configuration is required but was undefined or null')
    }
    
    this.validateProcessingConfig(config.processing)
    this.validateEmbeddingConfig(config.embedding)
    this.validateDeduplicationConfig(config.deduplication)
    this.validateClassificationConfig(config.classification)
    this.validateScoringConfig(config.scoring)
    this.validateClusteringConfig(config.clustering)
    this.validateOpensearchConfig(config.opensearch)
    this.validateApiConfig(config.api)
    this.validateTemporalConfig(config.temporal)
    this.validateSqsConfig(config.sqs)

    if (this.errors.length > 0) {
      const errorMessage = this.formatErrors()
      log.error({ errors: this.errors }, 'Signal Intelligence configuration validation failed')
      throw new Error(`Signal Intelligence configuration validation failed:\n${errorMessage}`)
    }

    log.info('Signal Intelligence configuration validation passed')
  }

  private validateProcessingConfig(processing: SignalIntelligenceConfiguration['processing']): void {
    if (!processing) {
      this.addError('processing', 'is required but was undefined or null', processing)
      return
    }

    this.validateRequired('processing.batchSize', processing.batchSize)
    this.validatePositiveInteger('processing.batchSize', processing.batchSize)
    this.validateRange('processing.batchSize', processing.batchSize, 1, 10000)

    this.validateRequired('processing.intervalMinutes', processing.intervalMinutes)
    this.validatePositiveInteger('processing.intervalMinutes', processing.intervalMinutes)
    this.validateRange('processing.intervalMinutes', processing.intervalMinutes, 1, 1440) // Max 24 hours

    this.validateRequired('processing.maxRetries', processing.maxRetries)
    this.validatePositiveInteger('processing.maxRetries', processing.maxRetries)
    this.validateRange('processing.maxRetries', processing.maxRetries, 1, 10)

    this.validateRequired('processing.retryBackoffMs', processing.retryBackoffMs)
    this.validatePositiveInteger('processing.retryBackoffMs', processing.retryBackoffMs)
    this.validateRange('processing.retryBackoffMs', processing.retryBackoffMs, 100, 60000) // 100ms to 60s

    this.validateRequired('processing.deadLetterQueueEnabled', processing.deadLetterQueueEnabled)
    this.validateBoolean('processing.deadLetterQueueEnabled', processing.deadLetterQueueEnabled)
  }

  private validateEmbeddingConfig(embedding: SignalIntelligenceConfiguration['embedding']): void {
    this.validateRequired('embedding.model', embedding.model)
    this.validateString('embedding.model', embedding.model)

    this.validateRequired('embedding.dimensions', embedding.dimensions)
    this.validatePositiveInteger('embedding.dimensions', embedding.dimensions)
    this.validateRange('embedding.dimensions', embedding.dimensions, 1, 2048)

    this.validateRequired('embedding.quantizedDimensions', embedding.quantizedDimensions)
    this.validatePositiveInteger('embedding.quantizedDimensions', embedding.quantizedDimensions)
    this.validateRange('embedding.quantizedDimensions', embedding.quantizedDimensions, 1, embedding.dimensions)

    this.validateRequired('embedding.cacheTtlDays', embedding.cacheTtlDays)
    this.validatePositiveInteger('embedding.cacheTtlDays', embedding.cacheTtlDays)
    this.validateRange('embedding.cacheTtlDays', embedding.cacheTtlDays, 1, 365)
  }

  private validateDeduplicationConfig(deduplication: SignalIntelligenceConfiguration['deduplication']): void {
    this.validateRequired('deduplication.hammingThreshold', deduplication.hammingThreshold)
    this.validatePositiveInteger('deduplication.hammingThreshold', deduplication.hammingThreshold)
    this.validateRange('deduplication.hammingThreshold', deduplication.hammingThreshold, 1, 64)

    this.validateRequired('deduplication.signatureBits', deduplication.signatureBits)
    this.validatePositiveInteger('deduplication.signatureBits', deduplication.signatureBits)
    this.validateRange('deduplication.signatureBits', deduplication.signatureBits, 8, 256)

    this.validateRequired('deduplication.shingleSize', deduplication.shingleSize)
    this.validatePositiveInteger('deduplication.shingleSize', deduplication.shingleSize)
    this.validateRange('deduplication.shingleSize', deduplication.shingleSize, 1, 10)

    this.validateRequired('deduplication.cacheTtlDays', deduplication.cacheTtlDays)
    this.validatePositiveInteger('deduplication.cacheTtlDays', deduplication.cacheTtlDays)
    this.validateRange('deduplication.cacheTtlDays', deduplication.cacheTtlDays, 1, 365)
  }

  private validateClassificationConfig(classification: SignalIntelligenceConfiguration['classification']): void {
    this.validateRequired('classification.confidenceThreshold', classification.confidenceThreshold)
    this.validateNumber('classification.confidenceThreshold', classification.confidenceThreshold)
    this.validateRange('classification.confidenceThreshold', classification.confidenceThreshold, 0, 1)

    this.validateRequired('classification.modelUpdateIntervalDays', classification.modelUpdateIntervalDays)
    this.validatePositiveInteger('classification.modelUpdateIntervalDays', classification.modelUpdateIntervalDays)
    this.validateRange('classification.modelUpdateIntervalDays', classification.modelUpdateIntervalDays, 1, 365)

    this.validateRequired('classification.productAreaModel', classification.productAreaModel)
    this.validateString('classification.productAreaModel', classification.productAreaModel)

    this.validateRequired('classification.intentModel', classification.intentModel)
    this.validateString('classification.intentModel', classification.intentModel)

    this.validateRequired('classification.urgencyModel', classification.urgencyModel)
    this.validateString('classification.urgencyModel', classification.urgencyModel)
  }

  private validateScoringConfig(scoring: SignalIntelligenceConfiguration['scoring']): void {
    this.validateRequired('scoring.velocityTimeWindowHours', scoring.velocityTimeWindowHours)
    this.validatePositiveInteger('scoring.velocityTimeWindowHours', scoring.velocityTimeWindowHours)
    this.validateRange('scoring.velocityTimeWindowHours', scoring.velocityTimeWindowHours, 1, 168) // Max 7 days

    this.validateRequired('scoring.decayFactor', scoring.decayFactor)
    this.validateNumber('scoring.decayFactor', scoring.decayFactor)
    this.validateRange('scoring.decayFactor', scoring.decayFactor, 0, 1)

    this.validateRequired('scoring.normalizationRange', scoring.normalizationRange)
    this.validateRequired('scoring.normalizationRange.min', scoring.normalizationRange.min)
    this.validateRequired('scoring.normalizationRange.max', scoring.normalizationRange.max)
    this.validateNumber('scoring.normalizationRange.min', scoring.normalizationRange.min)
    this.validateNumber('scoring.normalizationRange.max', scoring.normalizationRange.max)

    if (scoring.normalizationRange.min >= scoring.normalizationRange.max) {
      this.addError('scoring.normalizationRange', 'min must be less than max', {
        min: scoring.normalizationRange.min,
        max: scoring.normalizationRange.max
      })
    }
  }

  private validateClusteringConfig(clustering: SignalIntelligenceConfiguration['clustering']): void {
    this.validateRequired('clustering.algorithm', clustering.algorithm)
    this.validateString('clustering.algorithm', clustering.algorithm)

    this.validateRequired('clustering.minClusterSize', clustering.minClusterSize)
    this.validatePositiveInteger('clustering.minClusterSize', clustering.minClusterSize)
    this.validateRange('clustering.minClusterSize', clustering.minClusterSize, 2, 1000)

    this.validateRequired('clustering.updateIntervalHours', clustering.updateIntervalHours)
    this.validatePositiveInteger('clustering.updateIntervalHours', clustering.updateIntervalHours)
    this.validateRange('clustering.updateIntervalHours', clustering.updateIntervalHours, 1, 168) // Max 7 days

    this.validateRequired('clustering.outlierClusterId', clustering.outlierClusterId)
    this.validateInteger('clustering.outlierClusterId', clustering.outlierClusterId)
  }

  private validateOpensearchConfig(opensearch: SignalIntelligenceConfiguration['opensearch']): void {
    this.validateRequired('opensearch.indexPrefix', opensearch.indexPrefix)
    this.validateString('opensearch.indexPrefix', opensearch.indexPrefix)

    this.validateRequired('opensearch.vectorAlgorithm', opensearch.vectorAlgorithm)
    this.validateString('opensearch.vectorAlgorithm', opensearch.vectorAlgorithm)

    this.validateRequired('opensearch.vectorParams', opensearch.vectorParams)
    this.validateRequired('opensearch.vectorParams.m', opensearch.vectorParams.m)
    this.validateRequired('opensearch.vectorParams.efConstruction', opensearch.vectorParams.efConstruction)
    this.validateRequired('opensearch.vectorParams.efSearch', opensearch.vectorParams.efSearch)

    this.validatePositiveInteger('opensearch.vectorParams.m', opensearch.vectorParams.m)
    this.validatePositiveInteger('opensearch.vectorParams.efConstruction', opensearch.vectorParams.efConstruction)
    this.validatePositiveInteger('opensearch.vectorParams.efSearch', opensearch.vectorParams.efSearch)

    this.validateRange('opensearch.vectorParams.m', opensearch.vectorParams.m, 2, 100)
    this.validateRange('opensearch.vectorParams.efConstruction', opensearch.vectorParams.efConstruction, 10, 1000)
    this.validateRange('opensearch.vectorParams.efSearch', opensearch.vectorParams.efSearch, 10, 1000)
  }

  private validateApiConfig(api: SignalIntelligenceConfiguration['api']): void {
    this.validateRequired('api.defaultPageSize', api.defaultPageSize)
    this.validatePositiveInteger('api.defaultPageSize', api.defaultPageSize)
    this.validateRange('api.defaultPageSize', api.defaultPageSize, 1, 1000)

    this.validateRequired('api.maxPageSize', api.maxPageSize)
    this.validatePositiveInteger('api.maxPageSize', api.maxPageSize)
    this.validateRange('api.maxPageSize', api.maxPageSize, 1, 10000)

    if (api.defaultPageSize > api.maxPageSize) {
      this.addError('api.defaultPageSize', 'defaultPageSize must be less than or equal to maxPageSize', {
        defaultPageSize: api.defaultPageSize,
        maxPageSize: api.maxPageSize
      })
    }

    this.validateRequired('api.rateLimitPerHour', api.rateLimitPerHour)
    this.validatePositiveInteger('api.rateLimitPerHour', api.rateLimitPerHour)
    this.validateRange('api.rateLimitPerHour', api.rateLimitPerHour, 1, 100000)

    this.validateRequired('api.cacheTtlMinutes', api.cacheTtlMinutes)
    this.validatePositiveInteger('api.cacheTtlMinutes', api.cacheTtlMinutes)
    this.validateRange('api.cacheTtlMinutes', api.cacheTtlMinutes, 1, 1440) // Max 24 hours
  }

  private validateTemporalConfig(temporal: SignalIntelligenceConfiguration['temporal']): void {
    this.validateRequired('temporal.workflowId', temporal.workflowId)
    this.validateString('temporal.workflowId', temporal.workflowId)

    this.validateRequired('temporal.taskQueue', temporal.taskQueue)
    this.validateString('temporal.taskQueue', temporal.taskQueue)

    this.validateRequired('temporal.cronSchedule', temporal.cronSchedule)
    this.validateString('temporal.cronSchedule', temporal.cronSchedule)
    this.validateCronExpression('temporal.cronSchedule', temporal.cronSchedule)
  }

  private validateSqsConfig(sqs: SignalIntelligenceConfiguration['sqs']): void {
    if (!sqs) {
      this.addError('sqs', 'is required but was undefined or null', sqs)
      return
    }

    this.validateRequired('sqs.enrichmentQueue', sqs.enrichmentQueue)
    this.validateString('sqs.enrichmentQueue', sqs.enrichmentQueue)

    this.validateRequired('sqs.retryQueue', sqs.retryQueue)
    this.validateString('sqs.retryQueue', sqs.retryQueue)

    this.validateRequired('sqs.deadLetterQueue', sqs.deadLetterQueue)
    this.validateString('sqs.deadLetterQueue', sqs.deadLetterQueue)
  }

  private validateRequired(field: string, value: any): void {
    if (value === undefined || value === null) {
      this.addError(field, 'is required', value)
    }
  }

  private validateString(field: string, value: any): void {
    if (typeof value !== 'string') {
      this.addError(field, 'must be a string', value)
    } else if (value.trim().length === 0) {
      this.addError(field, 'must not be empty', value)
    }
  }

  private validateNumber(field: string, value: any): void {
    if (typeof value !== 'number' || isNaN(value)) {
      this.addError(field, 'must be a number', value)
    }
  }

  private validateInteger(field: string, value: any): void {
    if (!Number.isInteger(value)) {
      this.addError(field, 'must be an integer', value)
    }
  }

  private validatePositiveInteger(field: string, value: any): void {
    this.validateInteger(field, value)
    if (typeof value === 'number' && value <= 0) {
      this.addError(field, 'must be a positive integer', value)
    }
  }

  private validateBoolean(field: string, value: any): void {
    if (typeof value !== 'boolean') {
      this.addError(field, 'must be a boolean', value)
    }
  }

  private validateRange(field: string, value: any, min: number, max: number): void {
    if (typeof value === 'number' && (value < min || value > max)) {
      this.addError(field, `must be between ${min} and ${max}`, value)
    }
  }

  private validateCronExpression(field: string, value: any): void {
    if (typeof value !== 'string') {
      return // Already validated as string
    }

    // Basic cron validation - 5 or 6 fields separated by spaces
    const cronParts = value.trim().split(/\s+/)
    if (cronParts.length !== 5 && cronParts.length !== 6) {
      this.addError(field, 'must be a valid cron expression (5 or 6 fields)', value)
      return
    }

    // Validate each field contains valid characters
    const cronRegex = /^[0-9\*\-\,\/]+$/
    for (let i = 0; i < cronParts.length; i++) {
      if (!cronRegex.test(cronParts[i])) {
        this.addError(field, 'contains invalid cron expression characters', value)
        break
      }
    }
  }

  private addError(field: string, message: string, value?: any): void {
    this.errors.push({ field, message, value })
  }

  private formatErrors(): string {
    return this.errors
      .map(error => `  - ${error.field}: ${error.message}${error.value !== undefined ? ` (got: ${JSON.stringify(error.value)})` : ''}`)
      .join('\n')
  }
}

export function validateSignalIntelligenceConfig(config: SignalIntelligenceConfiguration): void {
  const validator = new SignalIntelligenceConfigValidator()
  validator.validateConfiguration(config)
}