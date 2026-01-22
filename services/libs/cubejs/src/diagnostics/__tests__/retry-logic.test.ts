/**
 * Tests for retry logic with exponential backoff
 */

import { 
  DEFAULT_RETRY_OPTIONS 
} from '../retry-logic'

describe('Retry Logic', () => {
  describe('DEFAULT_RETRY_OPTIONS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_RETRY_OPTIONS.maxAttempts).toBe(5)
      expect(DEFAULT_RETRY_OPTIONS.initialDelay).toBe(1000)
      expect(DEFAULT_RETRY_OPTIONS.maxDelay).toBe(30000)
      expect(DEFAULT_RETRY_OPTIONS.backoffMultiplier).toBe(2)
      expect(DEFAULT_RETRY_OPTIONS.jitterFactor).toBe(0.1)
    })

    it('should identify retryable connection errors', () => {
      const retryableErrors = [
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'connection terminated',
        'server closed the connection'
      ]
      
      retryableErrors.forEach(errorMessage => {
        const error = new Error(errorMessage)
        expect(DEFAULT_RETRY_OPTIONS.isRetryable!(error)).toBe(true)
      })
    })

    it('should not retry non-connection errors', () => {
      const nonRetryableErrors = [
        'Syntax error',
        'Permission denied',
        'Invalid query'
      ]
      
      nonRetryableErrors.forEach(errorMessage => {
        const error = new Error(errorMessage)
        expect(DEFAULT_RETRY_OPTIONS.isRetryable!(error)).toBe(false)
      })
    })
  })
})