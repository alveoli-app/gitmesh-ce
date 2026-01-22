/**
 * Retry logic with exponential backoff for database connection failures
 * 
 * This module provides robust retry mechanisms for database operations
 * with configurable exponential backoff parameters.
 */

import { getServiceChildLogger } from '@gitmesh/logging'

const logger = getServiceChildLogger('cubejs-retry-logic')

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number
  /** Initial delay in milliseconds */
  initialDelay: number
  /** Maximum delay in milliseconds */
  maxDelay: number
  /** Backoff multiplier (e.g., 2 for doubling) */
  backoffMultiplier: number
  /** Jitter factor to add randomness (0-1) */
  jitterFactor: number
  /** Function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean
}

export interface RetryResult<T> {
  /** The result of the successful operation */
  result?: T
  /** The final error if all attempts failed */
  error?: Error
  /** Number of attempts made */
  attempts: number
  /** Total time spent retrying in milliseconds */
  totalTime: number
  /** Whether the operation succeeded */
  success: boolean
}

/**
 * Default retry options for database connections
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  isRetryable: (error: Error) => {
    // Retry on connection-related errors
    const retryableErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'EPIPE',
      'connection terminated',
      'server closed the connection',
      'Connection terminated',
      'timeout expired'
    ]
    
    const errorMessage = error.message.toLowerCase()
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase())
    )
  }
}

/**
 * Executes an operation with exponential backoff retry logic
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  const startTime = Date.now()
  
  let lastError: Error | undefined
  let attempts = 0
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    attempts = attempt
    
    try {
      logger.debug(`Attempting operation (attempt ${attempt}/${config.maxAttempts})`)
      
      const result = await operation()
      
      const totalTime = Date.now() - startTime
      
      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempts`, {
          attempts: attempt,
          totalTime
        })
      }
      
      return {
        result,
        attempts: attempt,
        totalTime,
        success: true
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      logger.warn(`Operation failed on attempt ${attempt}`, {
        attempt,
        maxAttempts: config.maxAttempts,
        error: lastError.message
      })
      
      // Check if error is retryable
      if (config.isRetryable && !config.isRetryable(lastError)) {
        logger.info('Error is not retryable, stopping attempts', {
          error: lastError.message
        })
        break
      }
      
      // Don't wait after the last attempt
      if (attempt < config.maxAttempts) {
        const delay = calculateDelay(attempt, config)
        
        logger.debug(`Waiting ${delay}ms before next attempt`, {
          attempt,
          delay
        })
        
        await sleep(delay)
      }
    }
  }
  
  const totalTime = Date.now() - startTime
  
  logger.error(`Operation failed after ${attempts} attempts`, {
    attempts,
    totalTime,
    finalError: lastError?.message
  })
  
  return {
    error: lastError,
    attempts,
    totalTime,
    success: false
  }
}

/**
 * Calculates the delay for the next retry attempt using exponential backoff
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  // Calculate exponential backoff delay
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1)
  
  // Apply maximum delay limit
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay)
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * options.jitterFactor * Math.random()
  const finalDelay = cappedDelay + jitter
  
  return Math.floor(finalDelay)
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Specialized retry function for database connections
 */
export async function retryDatabaseConnection<T>(
  operation: () => Promise<T>,
  customOptions: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const databaseRetryOptions: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
    isRetryable: (error: Error) => {
      // Database-specific retryable errors
      const dbRetryableErrors = [
        'ECONNREFUSED',
        'ENOTFOUND', 
        'ETIMEDOUT',
        'ECONNRESET',
        'connection terminated',
        'server closed the connection',
        'Connection terminated',
        'timeout expired',
        'database is starting up',
        'too many connections',
        'connection limit exceeded'
      ]
      
      const errorMessage = error.message.toLowerCase()
      return dbRetryableErrors.some(retryableError => 
        errorMessage.includes(retryableError.toLowerCase())
      )
    },
    ...customOptions
  }
  
  return retryWithBackoff(operation, databaseRetryOptions)
}

/**
 * Specialized retry function for query operations
 */
export async function retryQuery<T>(
  operation: () => Promise<T>,
  customOptions: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const queryRetryOptions: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    isRetryable: (error: Error) => {
      // Query-specific retryable errors
      const queryRetryableErrors = [
        'connection terminated',
        'server closed the connection',
        'Connection terminated',
        'timeout expired',
        'connection reset',
        'broken pipe'
      ]
      
      const errorMessage = error.message.toLowerCase()
      return queryRetryableErrors.some(retryableError => 
        errorMessage.includes(retryableError.toLowerCase())
      )
    },
    ...customOptions
  }
  
  return retryWithBackoff(operation, queryRetryOptions)
}

/**
 * Circuit breaker pattern for database operations
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open'
        logger.info('Circuit breaker transitioning to half-open state')
      } else {
        throw new Error('Circuit breaker is open - operation not attempted')
      }
    }
    
    try {
      const result = await operation()
      
      if (this.state === 'half-open') {
        this.reset()
        logger.info('Circuit breaker reset to closed state')
      }
      
      return result
      
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }
  
  private recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open'
      logger.warn('Circuit breaker opened due to repeated failures', {
        failures: this.failures,
        threshold: this.failureThreshold
      })
    }
  }
  
  private reset(): void {
    this.failures = 0
    this.state = 'closed'
  }
  
  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
}