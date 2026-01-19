import { IntegrationRunState } from '@gitmesh/types'
import Permissions from '../../security/permissions'
import PermissionChecker from '../../services/user/permissionChecker'
import IntegrationRunRepository from '../../database/repositories/integrationRunRepository'
import IntegrationStreamRepository from '../../database/repositories/integrationStreamRepository'
import { IntegrationStreamState } from '../../types/integrationStreamTypes'

export default async (req, res) => {
  new PermissionChecker(req).validateHas(Permissions.values.integrationRead)

  const { id } = req.params

  const runRepo = new IntegrationRunRepository(req)
  const streamRepo = new IntegrationStreamRepository(req)

  // Get the last run for this integration
  const lastRun = await runRepo.findLastRun(id)

  if (!lastRun) {
    return req.responseHandler.success(req, res, {
      hasRun: false,
      status: 'no-run',
      message: 'No integration run found',
    })
  }

  // Get stream statistics
  const allStreams = await streamRepo.findByRunId(lastRun.id, 1, 1000)
  
  const stats = {
    total: allStreams.length,
    processed: allStreams.filter(s => s.state === IntegrationStreamState.PROCESSED).length,
    processing: allStreams.filter(s => s.state === IntegrationStreamState.PROCESSING).length,
    pending: allStreams.filter(s => s.state === IntegrationStreamState.PENDING).length,
    error: allStreams.filter(s => s.state === IntegrationStreamState.ERROR).length,
  }

  // Calculate progress percentage
  const progress = stats.total > 0 
    ? Math.round(((stats.processed + stats.error) / stats.total) * 100)
    : 0

  // Determine status message
  let statusMessage = ''
  let isStuck = false
  
  const now = new Date()
  const lastUpdate = new Date(lastRun.updatedAt)
  const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 1000 / 60

  if (lastRun.state === IntegrationRunState.PROCESSED) {
    statusMessage = `Completed successfully. Processed ${stats.processed} streams.`
  } else if (lastRun.state === IntegrationRunState.ERROR) {
    statusMessage = `Completed with errors. ${stats.error} streams failed after retries.`
  } else if (lastRun.state === IntegrationRunState.DELAYED) {
    const delayedUntil = lastRun.delayedUntil ? new Date(lastRun.delayedUntil) : null
    if (delayedUntil) {
      const minutesUntilResume = Math.max(0, Math.round((delayedUntil.getTime() - now.getTime()) / 1000 / 60))
      statusMessage = `Delayed due to rate limiting. Will resume in ${minutesUntilResume} minutes.`
    } else {
      statusMessage = 'Delayed, waiting to resume...'
    }
  } else if (lastRun.state === IntegrationRunState.PROCESSING) {
    if (stats.total === 0) {
      statusMessage = 'Detecting data streams to process...'
    } else if (stats.processing > 0) {
      statusMessage = `Processing stream ${stats.processed + stats.processing} of ${stats.total}...`
    } else if (stats.pending > 0) {
      statusMessage = `Processed ${stats.processed} of ${stats.total} streams. ${stats.pending} pending...`
    } else {
      statusMessage = `Finalizing... ${stats.processed} streams processed.`
    }
    
    // Check if stuck
    if (minutesSinceUpdate > 60) {
      isStuck = true
      statusMessage += ` (Warning: No progress for ${Math.round(minutesSinceUpdate)} minutes)`
    }
  } else if (lastRun.state === IntegrationRunState.PENDING) {
    statusMessage = 'Waiting to start...'
  }

  // Get recent error streams for debugging
  const errorStreams = allStreams
    .filter(s => s.state === IntegrationStreamState.ERROR)
    .slice(0, 5)
    .map(s => ({
      name: s.name,
      error: s.error,
      retries: s.retries,
    }))

  const payload = {
    hasRun: true,
    runId: lastRun.id,
    runState: lastRun.state,
    status: lastRun.state,
    progress,
    stats,
    statusMessage,
    isStuck,
    createdAt: lastRun.createdAt,
    updatedAt: lastRun.updatedAt,
    processedAt: lastRun.processedAt,
    delayedUntil: lastRun.delayedUntil,
    errorStreams: errorStreams.length > 0 ? errorStreams : undefined,
  }

  return req.responseHandler.success(req, res, payload)
}
