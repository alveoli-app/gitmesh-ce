#!/usr/bin/env node

import { getServiceLogger } from '@gitmesh/logging'
import { TemporalWorkerService } from '../service/temporalWorkerService'

const logger = getServiceLogger()

async function main(): Promise<void> {
  const workerService = new TemporalWorkerService()

  try {
    logger.info('Starting Signal Enrichment Temporal Worker')

    // Start the worker
    await workerService.start()

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`)
      try {
        await workerService.stop()
        logger.info('Temporal worker shutdown complete')
        process.exit(0)
      } catch (error) {
        logger.error('Error during shutdown', { error })
        process.exit(1)
      }
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    // Keep the process running
    logger.info('Temporal worker is running. Press Ctrl+C to stop.')

  } catch (error) {
    logger.error('Failed to start Temporal worker', { error })
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}