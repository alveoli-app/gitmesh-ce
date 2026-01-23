import { getServiceLogger } from '@gitmesh/logging'
import { NativeConnection, Worker } from '@temporalio/worker'
import { TEMPORAL_CONFIG } from '../conf'
import signalConfig from '../conf'

const logger = getServiceLogger()

/**
 * Temporal Worker Service for Signal Enrichment
 * 
 * Runs a Temporal worker that can execute signal enrichment workflows and activities.
 * This worker listens to the configured task queue and processes workflow executions.
 */
export class TemporalWorkerService {
  private worker: Worker | null = null
  private connection: NativeConnection | null = null

  /**
   * Start the Temporal worker
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting Temporal worker', {
        taskQueue: signalConfig.temporal.taskQueue,
      })

      // Create connection to Temporal server
      const temporalConfig = TEMPORAL_CONFIG()
      this.connection = await NativeConnection.connect({
        address: temporalConfig.serverUrl,
        tls: temporalConfig.certificate && temporalConfig.privateKey ? {
          clientCertPair: {
            crt: Buffer.from(temporalConfig.certificate, 'base64'),
            key: Buffer.from(temporalConfig.privateKey, 'base64'),
          },
        } : undefined,
      })

      // Create and start worker
      this.worker = await Worker.create({
        connection: this.connection,
        namespace: temporalConfig.namespace,
        taskQueue: signalConfig.temporal.taskQueue,
        workflowsPath: require.resolve('../workflows'),
        activitiesPath: require.resolve('../activities'),
        // Configure worker options
        maxConcurrentActivityTaskExecutions: 5,
        maxConcurrentWorkflowTaskExecutions: 10,
        // Enable structured logging
        sinks: {
          logger: {
            log: {
              level: 'INFO',
              logger: logger,
            },
          },
        },
      })

      // Start the worker
      await this.worker.run()

      logger.info('Temporal worker started successfully')

    } catch (error) {
      logger.error('Failed to start Temporal worker', { error })
      throw error
    }
  }

  /**
   * Stop the Temporal worker
   */
  async stop(): Promise<void> {
    try {
      logger.info('Stopping Temporal worker')

      if (this.worker) {
        this.worker.shutdown()
        this.worker = null
      }

      if (this.connection) {
        await this.connection.close()
        this.connection = null
      }

      logger.info('Temporal worker stopped successfully')

    } catch (error) {
      logger.error('Failed to stop Temporal worker', { error })
      throw error
    }
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.worker !== null && this.connection !== null
  }
}