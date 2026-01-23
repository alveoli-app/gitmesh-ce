import { signalEnrichmentWorkflow } from '../workflows/signalEnrichmentWorkflow'

// Mock the activities
jest.mock('../activities/signalEnrichmentActivities', () => ({
  enrichBatch: jest.fn().mockResolvedValue({
    processed: 10,
    enriched: 8,
    failed: 2,
    identitiesResolved: 5,
    newMembers: 2,
    newIdentities: 3,
    embeddingsGenerated: 8,
    duplicatesDetected: 1,
    classified: 8,
    scored: 8,
    indexed: 7,
    indexingFailed: 1,
    partialFailures: 0,
  }),
  getBatchMetrics: jest.fn().mockResolvedValue({
    unenrichedCount: 100,
    totalActivities: 1000,
    oldestUnenriched: new Date('2024-01-01'),
  }),
}))

// Mock Temporal workflow functions
jest.mock('@temporalio/workflow', () => ({
  proxyActivities: jest.fn((activities) => activities),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Signal Enrichment Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('signalEnrichmentWorkflow', () => {
    it('should execute workflow with default parameters', async () => {
      const result = await signalEnrichmentWorkflow()

      expect(result).toBeDefined()
      expect(result.processed).toBe(10)
      expect(result.enriched).toBe(8)
      expect(result.failed).toBe(2)
      expect(result.duration).toBeGreaterThan(0)
      expect(result.batchMetrics).toBeDefined()
      expect(result.batchMetrics.unenrichedCount).toBe(100)
    })

    it('should execute workflow with custom parameters', async () => {
      const args = {
        batchSize: 500,
        tenantId: 'test-tenant',
      }

      const result = await signalEnrichmentWorkflow(args)

      expect(result).toBeDefined()
      expect(result.processed).toBe(10)
      expect(result.enriched).toBe(8)
      expect(result.failed).toBe(2)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should handle workflow errors gracefully', async () => {
      // Mock activities to throw an error
      const { enrichBatch } = require('../activities/signalEnrichmentActivities')
      enrichBatch.mockRejectedValueOnce(new Error('Test error'))

      await expect(signalEnrichmentWorkflow()).rejects.toThrow('Test error')
    })

    it('should calculate correct metrics', async () => {
      const result = await signalEnrichmentWorkflow()

      // Verify metrics calculation
      expect(result.processed).toBe(10)
      expect(result.enriched).toBe(8)
      expect(result.failed).toBe(2)
      
      // Success rate should be 80% (8/10)
      const expectedSuccessRate = (result.enriched / result.processed) * 100
      expect(expectedSuccessRate).toBe(80)
      
      // Error rate should be 20% (2/10)
      const expectedErrorRate = (result.failed / result.processed) * 100
      expect(expectedErrorRate).toBe(20)
    })

    it('should include all required result fields', async () => {
      const result = await signalEnrichmentWorkflow()

      // Verify all required fields are present
      expect(result).toHaveProperty('processed')
      expect(result).toHaveProperty('enriched')
      expect(result).toHaveProperty('failed')
      expect(result).toHaveProperty('identitiesResolved')
      expect(result).toHaveProperty('newMembers')
      expect(result).toHaveProperty('newIdentities')
      expect(result).toHaveProperty('embeddingsGenerated')
      expect(result).toHaveProperty('duplicatesDetected')
      expect(result).toHaveProperty('classified')
      expect(result).toHaveProperty('scored')
      expect(result).toHaveProperty('indexed')
      expect(result).toHaveProperty('indexingFailed')
      expect(result).toHaveProperty('partialFailures')
      expect(result).toHaveProperty('duration')
      expect(result).toHaveProperty('batchMetrics')
    })

    it('should log warning for long-running workflows', async () => {
      // Mock a slow activity to trigger the warning
      const { enrichBatch } = require('../activities/signalEnrichmentActivities')
      enrichBatch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            processed: 10,
            enriched: 8,
            failed: 2,
            identitiesResolved: 5,
            newMembers: 2,
            newIdentities: 3,
            embeddingsGenerated: 8,
            duplicatesDetected: 1,
            classified: 8,
            scored: 8,
            indexed: 7,
            indexingFailed: 1,
            partialFailures: 0,
          }), 100) // Short delay for test
        )
      )

      // Mock Date.now to simulate 6 minutes duration
      const originalDateNow = Date.now
      let callCount = 0
      Date.now = jest.fn(() => {
        callCount++
        if (callCount === 1) return 0 // Start time
        return 6 * 60 * 1000 // End time (6 minutes later)
      })

      const result = await signalEnrichmentWorkflow()

      expect(result.duration).toBe(6 * 60 * 1000)

      // Restore Date.now
      Date.now = originalDateNow
    })
  })
})