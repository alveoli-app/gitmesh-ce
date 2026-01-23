import { getServiceLogger } from '@gitmesh/logging'
import { getTemporalClient, Client as TemporalClient, ScheduleHandle } from '@gitmesh/temporal'
import { TEMPORAL_CONFIG } from '../conf'
import signalConfig from '../conf'

const logger = getServiceLogger()

export interface TemporalServiceConfig {
  workflowId: string
  taskQueue: string
  cronSchedule: string
  workflowTimeout: string
}

/**
 * Temporal Service for Signal Enrichment
 * 
 * Manages the scheduling and execution of signal enrichment workflows.
 * Integrates with @gitmesh/temporal library and configures cron schedule.
 * 
 * Requirements: 7.1, 7.6 - Use @gitmesh/temporal library and configure cron schedule
 */
export class TemporalService {
  private client: TemporalClient | null = null
  private scheduleHandle: ScheduleHandle | null = null
  private config: TemporalServiceConfig

  constructor() {
    this.config = {
      workflowId: signalConfig.temporal.workflowId,
      taskQueue: signalConfig.temporal.taskQueue,
      cronSchedule: signalConfig.temporal.cronSchedule,
      workflowTimeout: signalConfig.temporal.workflowTimeout,
    }
  }

  /**
   * Initialize the Temporal client connection
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Temporal client', {
        workflowId: this.config.workflowId,
        taskQueue: this.config.taskQueue,
        cronSchedule: this.config.cronSchedule,
      })

      this.client = await getTemporalClient(TEMPORAL_CONFIG())
      logger.info('Temporal client initialized successfully')

    } catch (error) {
      logger.error('Failed to initialize Temporal client', { error })
      throw error
    }
  }

  /**
   * Create and start the scheduled workflow for batch processing
   * Requirements: 7.1 - Execute batch processing every 15 minutes
   */
  async startScheduledWorkflow(): Promise<void> {
    if (!this.client) {
      throw new Error('Temporal client not initialized. Call initialize() first.')
    }

    try {
      logger.info('Creating scheduled workflows', {
        enrichmentScheduleId: `${this.config.workflowId}-schedule`,
        modelUpdateScheduleId: `${this.config.workflowId}-model-update-schedule`,
        cronSchedule: this.config.cronSchedule,
      })

      // Create schedule for signal enrichment workflow (every 15 minutes)
      this.scheduleHandle = await this.client.schedule.create({
        scheduleId: `${this.config.workflowId}-schedule`,
        spec: {
          cronExpressions: [this.config.cronSchedule],
        },
        action: {
          type: 'startWorkflow',
          workflowType: 'signalEnrichmentWorkflow',
          taskQueue: this.config.taskQueue,
          workflowExecutionTimeout: this.config.workflowTimeout,
          args: [
            {
              batchSize: signalConfig.batchProcessing.batchSize,
            },
          ],
        },
        policies: {
          // Allow overlapping executions but limit to 1
          overlapPolicy: 'BUFFER_ONE',
          // Keep trying if workflow fails
          catchupWindow: '1h',
        },
      })

      // Create schedule for model update workflow (daily at 2 AM)
      await this.client.schedule.create({
        scheduleId: `${this.config.workflowId}-model-update-schedule`,
        spec: {
          cronExpressions: ['0 2 * * *'], // Daily at 2 AM
        },
        action: {
          type: 'startWorkflow',
          workflowType: 'modelUpdateWorkflow',
          taskQueue: this.config.taskQueue,
          workflowExecutionTimeout: '2h', // Longer timeout for model training
          args: [
            {
              modelTypes: ['product_area', 'intent', 'urgency'],
              validationThreshold: 0.75,
            },
          ],
        },
        policies: {
          // Don't allow overlapping model update workflows
          overlapPolicy: 'SKIP',
          catchupWindow: '6h',
        },
      })

      logger.info('Scheduled workflows created successfully')

    } catch (error) {
      logger.error('Failed to create scheduled workflows', { error })
      throw error
    }
  }

  /**
   * Manually trigger a workflow execution (for testing or manual runs)
   */
  async triggerWorkflow(
    workflowType: 'signalEnrichmentWorkflow' | 'modelUpdateWorkflow' = 'signalEnrichmentWorkflow',
    batchSize?: number, 
    tenantId?: string
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Temporal client not initialized. Call initialize() first.')
    }

    try {
      logger.info('Manually triggering workflow', { workflowType, batchSize, tenantId })

      const workflowId = `${this.config.workflowId}-${workflowType}-manual-${Date.now()}`
      
      let args: any[]
      let timeout = this.config.workflowTimeout

      if (workflowType === 'modelUpdateWorkflow') {
        args = [{
          tenantId,
          modelTypes: ['product_area', 'intent', 'urgency'],
          validationThreshold: 0.75,
        }]
        timeout = '2h' // Longer timeout for model training
      } else {
        args = [{
          batchSize: batchSize || signalConfig.batchProcessing.batchSize,
          tenantId,
        }]
      }
      
      const handle = await this.client.workflow.start(workflowType, {
        workflowId,
        taskQueue: this.config.taskQueue,
        workflowExecutionTimeout: timeout,
        args,
      })

      logger.info('Workflow triggered successfully', { 
        workflowType,
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId,
      })

      return handle.workflowId

    } catch (error) {
      logger.error('Failed to trigger workflow', { error, workflowType, batchSize, tenantId })
      throw error
    }
  }

  /**
   * Stop the scheduled workflow
   */
  async stopScheduledWorkflow(): Promise<void> {
    try {
      logger.info('Stopping scheduled workflows')
      
      // Stop enrichment workflow schedule
      if (this.scheduleHandle) {
        await this.scheduleHandle.delete()
        this.scheduleHandle = null
      }

      // Stop model update workflow schedule
      try {
        const modelUpdateSchedule = this.client?.schedule.getHandle(
          `${this.config.workflowId}-model-update-schedule`
        )
        if (modelUpdateSchedule) {
          await modelUpdateSchedule.delete()
        }
      } catch (error) {
        // Schedule might not exist, ignore error
        logger.debug('Model update schedule not found or already deleted')
      }

      logger.info('Scheduled workflows stopped successfully')
    } catch (error) {
      logger.error('Failed to stop scheduled workflows', { error })
      throw error
    }
  }

  /**
   * Get workflow execution status and metrics
   */
  async getWorkflowStatus(workflowId: string): Promise<any> {
    if (!this.client) {
      throw new Error('Temporal client not initialized. Call initialize() first.')
    }

    try {
      const handle = this.client.workflow.getHandle(workflowId)
      const description = await handle.describe()
      
      return {
        workflowId: description.workflowExecutionInfo.execution.workflowId,
        runId: description.workflowExecutionInfo.execution.runId,
        status: description.workflowExecutionInfo.status,
        startTime: description.workflowExecutionInfo.startTime,
        closeTime: description.workflowExecutionInfo.closeTime,
        executionTime: description.workflowExecutionInfo.executionTime,
      }

    } catch (error) {
      logger.error('Failed to get workflow status', { error, workflowId })
      throw error
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stopScheduledWorkflow()
    
    if (this.client) {
      // Note: Temporal client doesn't have explicit close method
      // Connection cleanup is handled by the library
      this.client = null
      logger.info('Temporal service cleaned up')
    }
  }
}