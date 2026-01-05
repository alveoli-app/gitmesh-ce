/**
 * Cleanup Archived Cycles Worker
 * Permanently deletes cycles that have been archived for more than 30 days
 * 
 * This should be run as a scheduled job (e.g., daily cron)
 */

import { LoggerBase } from '@gitmesh/logging'
import DevtelCycleService from '../../../../../services/devtel/devtelCycleService'
import { IServiceOptions } from '../../../../../services/IServiceOptions'

export default class CleanupArchivedCyclesWorker extends LoggerBase {
    options: IServiceOptions

    constructor(options: IServiceOptions) {
        super(options.log)
        this.options = options
    }

    /**
     * Execute the cleanup job
     * Returns the number of cycles permanently deleted
     */
    async execute(): Promise<number> {
        this.log.info('[CleanupArchivedCycles] Starting cleanup job')

        try {
            const service = new DevtelCycleService(this.options)
            const deletedCount = await service.cleanupExpiredArchives()

            this.log.info(`[CleanupArchivedCycles] Cleaned up ${deletedCount} expired archives`)

            return deletedCount
        } catch (error) {
            this.log.error('[CleanupArchivedCycles] Error during cleanup:', error)
            throw error
        }
    }
}

/**
 * Standalone function for cron job execution
 * Usage: node -e "require('./cleanupArchivedCyclesWorker').runCleanup()"
 */
export async function runCleanup() {
    const { getServiceOptions } = require('../../../../../services/serviceOptionsHelper')
    
    try {
        const options = await getServiceOptions()
        const worker = new CleanupArchivedCyclesWorker(options)
        const deletedCount = await worker.execute()
        
        console.log(`✓ Cleanup completed: ${deletedCount} cycles permanently deleted`)
        process.exit(0)
    } catch (error) {
        console.error('✗ Cleanup failed:', error)
        process.exit(1)
    }
}

// Allow direct execution
if (require.main === module) {
    runCleanup()
}
