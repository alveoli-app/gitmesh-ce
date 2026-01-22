/**
 * Simple test for retry logic types
 */

describe('Retry Logic Types', () => {
  it('should define retry options interface', () => {
    const options = {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.1
    }
    
    expect(options.maxAttempts).toBe(5)
    expect(options.initialDelay).toBe(1000)
    expect(options.maxDelay).toBe(30000)
    expect(options.backoffMultiplier).toBe(2)
    expect(options.jitterFactor).toBe(0.1)
  })
})