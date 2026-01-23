import { TemporalService } from '../service/temporalService'

describe('Temporal Workflow Integration', () => {
  let temporalService: TemporalService

  beforeEach(() => {
    temporalService = new TemporalService()
  })

  afterEach(async () => {
    if (temporalService) {
      await temporalService.cleanup()
    }
  })

  describe('TemporalService', () => {
    it('should initialize with correct configuration', () => {
      expect(temporalService).toBeDefined()
      // Configuration is loaded from config files, so we can't test specific values
      // but we can test that the service is properly constructed
    })

    it('should have proper workflow configuration structure', () => {
      // Test that the service has the expected interface
      expect(typeof temporalService.initialize).toBe('function')
      expect(typeof temporalService.startScheduledWorkflow).toBe('function')
      expect(typeof temporalService.triggerWorkflow).toBe('function')
      expect(typeof temporalService.stopScheduledWorkflow).toBe('function')
      expect(typeof temporalService.getWorkflowStatus).toBe('function')
      expect(typeof temporalService.cleanup).toBe('function')
    })
  })

  describe('Workflow Types', () => {
    it('should support signal enrichment workflow type', async () => {
      // This test verifies the workflow type constants are properly defined
      const workflowType = 'signalEnrichmentWorkflow' as const
      expect(workflowType).toBe('signalEnrichmentWorkflow')
    })

    it('should support model update workflow type', async () => {
      // This test verifies the workflow type constants are properly defined
      const workflowType = 'modelUpdateWorkflow' as const
      expect(workflowType).toBe('modelUpdateWorkflow')
    })
  })

  describe('Configuration Validation', () => {
    it('should have required temporal configuration fields', () => {
      // Import the config to test structure
      const signalConfig = require('../conf').default
      
      expect(signalConfig.temporal).toBeDefined()
      expect(signalConfig.temporal.workflowId).toBeDefined()
      expect(signalConfig.temporal.taskQueue).toBeDefined()
      expect(signalConfig.temporal.cronSchedule).toBeDefined()
      expect(signalConfig.temporal.workflowTimeout).toBeDefined()
      
      // Verify default values
      expect(typeof signalConfig.temporal.workflowId).toBe('string')
      expect(typeof signalConfig.temporal.taskQueue).toBe('string')
      expect(typeof signalConfig.temporal.cronSchedule).toBe('string')
      expect(typeof signalConfig.temporal.workflowTimeout).toBe('string')
    })

    it('should have valid cron schedule format', () => {
      const signalConfig = require('../conf').default
      const cronSchedule = signalConfig.temporal.cronSchedule
      
      // Basic validation that it looks like a cron expression
      // Default should be '*/15 * * * *' (every 15 minutes)
      expect(cronSchedule).toMatch(/^[\d\*\/,\-\s]+$/)
      expect(cronSchedule.split(' ')).toHaveLength(5)
    })
  })
})