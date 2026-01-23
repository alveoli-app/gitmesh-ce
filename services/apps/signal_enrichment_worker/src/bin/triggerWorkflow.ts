#!/usr/bin/env node

import { getServiceLogger } from '@gitmesh/logging'
import { TemporalService } from '../service/temporalService'

const logger = getServiceLogger()

interface TriggerWorkflowArgs {
  workflowType?: 'enrichment' | 'model-update'
  batchSize?: number
  tenantId?: string
  help?: boolean
}

function parseArgs(): TriggerWorkflowArgs {
  const args: TriggerWorkflowArgs = {}
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    
    if (arg === '--help' || arg === '-h') {
      args.help = true
    } else if (arg === '--workflow-type' || arg === '-w') {
      const value = process.argv[++i]
      if (value === 'enrichment' || value === 'model-update') {
        args.workflowType = value
      } else {
        throw new Error('Invalid workflow type. Must be "enrichment" or "model-update".')
      }
    } else if (arg === '--batch-size' || arg === '-b') {
      const value = process.argv[++i]
      if (value && !isNaN(parseInt(value))) {
        args.batchSize = parseInt(value)
      } else {
        throw new Error('Invalid batch size. Must be a number.')
      }
    } else if (arg === '--tenant-id' || arg === '-t') {
      args.tenantId = process.argv[++i]
      if (!args.tenantId) {
        throw new Error('Tenant ID cannot be empty.')
      }
    }
  }
  
  return args
}

function printUsage(): void {
  console.log(`
Usage: npm run script:trigger-workflow [options]

Options:
  -w, --workflow-type <type>   Workflow type: "enrichment" or "model-update" (default: enrichment)
  -b, --batch-size <number>    Number of activities to process (default: 1000, enrichment only)
  -t, --tenant-id <string>     Tenant ID to filter activities (optional)
  -h, --help                   Show this help message

Examples:
  npm run script:trigger-workflow
  npm run script:trigger-workflow --workflow-type enrichment --batch-size 500
  npm run script:trigger-workflow --workflow-type model-update --tenant-id abc123
`)
}

async function main(): Promise<void> {
  try {
    const args = parseArgs()
    
    if (args.help) {
      printUsage()
      process.exit(0)
    }

    logger.info('Starting manual workflow trigger', args)

    const temporalService = new TemporalService()
    
    // Initialize Temporal client
    await temporalService.initialize()
    
    // Determine workflow type
    const workflowType = args.workflowType === 'model-update' 
      ? 'modelUpdateWorkflow' as const
      : 'signalEnrichmentWorkflow' as const
    
    // Trigger the workflow
    const workflowId = await temporalService.triggerWorkflow(
      workflowType,
      args.batchSize, 
      args.tenantId
    )
    
    logger.info('Workflow triggered successfully', { workflowType, workflowId })
    console.log(`✅ ${workflowType} triggered successfully: ${workflowId}`)
    
    // Wait a moment for the workflow to start
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Get initial status
    try {
      const status = await temporalService.getWorkflowStatus(workflowId)
      console.log(`📊 Workflow Status: ${status.status}`)
      console.log(`🕐 Started at: ${status.startTime}`)
    } catch (statusError) {
      logger.warn('Could not retrieve workflow status', { error: statusError })
    }
    
    // Cleanup
    await temporalService.cleanup()
    
    process.exit(0)

  } catch (error) {
    logger.error('Failed to trigger workflow', { error })
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}