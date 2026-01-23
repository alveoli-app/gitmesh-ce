#!/usr/bin/env node

import { getServiceLogger } from '@gitmesh/logging'
import { ClusteringOrchestrationService } from '../service/clusteringOrchestrationService'

const logger = getServiceLogger()

interface ClusteringOptions {
  tenantId?: string
  allTenants?: boolean
  minClusterSize?: number
  outlierClusterId?: number
  verbose?: boolean
}

/**
 * CLI script to run HDBSCAN clustering on signals
 * 
 * Usage:
 *   npm run script:run-clustering -- --all-tenants
 *   npm run script:run-clustering -- --tenant-id=abc123
 *   npm run script:run-clustering -- --tenant-id=abc123 --min-cluster-size=10
 */
async function runClustering(options: ClusteringOptions = {}) {
  try {
    logger.info('Starting clustering script', options)

    const clusteringService = new ClusteringOrchestrationService()

    // Update configuration if provided
    if (options.minClusterSize !== undefined || options.outlierClusterId !== undefined) {
      clusteringService.updateClusteringConfig(options.minClusterSize, options.outlierClusterId)
      logger.info('Updated clustering configuration', {
        minClusterSize: options.minClusterSize,
        outlierClusterId: options.outlierClusterId
      })
    }

    let results

    if (options.allTenants) {
      // Run clustering for all tenants
      logger.info('Running clustering for all tenants')
      results = await clusteringService.runClusteringForAllTenants()
      
      // Log summary
      const successCount = results.filter(r => r.success).length
      const totalSignals = results.reduce((sum, r) => sum + r.signalsProcessed, 0)
      const totalClusters = results.reduce((sum, r) => sum + r.clustersCreated, 0)
      const totalOutliers = results.reduce((sum, r) => sum + r.outliers, 0)

      logger.info('Clustering completed for all tenants', {
        totalTenants: results.length,
        successfulTenants: successCount,
        failedTenants: results.length - successCount,
        totalSignals,
        totalClusters,
        totalOutliers
      })

      if (options.verbose) {
        results.forEach(result => {
          logger.info(`Tenant ${result.tenantId}:`, {
            success: result.success,
            signalsProcessed: result.signalsProcessed,
            clustersCreated: result.clustersCreated,
            outliers: result.outliers,
            duration: `${result.duration}ms`,
            error: result.error?.message
          })
        })
      }

    } else if (options.tenantId) {
      // Run clustering for specific tenant
      logger.info(`Running clustering for tenant ${options.tenantId}`)
      const result = await clusteringService.runClusteringForTenant(options.tenantId)
      
      logger.info('Clustering completed', {
        tenantId: result.tenantId,
        success: result.success,
        signalsProcessed: result.signalsProcessed,
        clustersCreated: result.clustersCreated,
        outliers: result.outliers,
        duration: `${result.duration}ms`,
        error: result.error?.message
      })

      results = [result]
    } else {
      throw new Error('Must specify either --tenant-id or --all-tenants')
    }

    // Exit with appropriate code
    const hasFailures = results.some(r => !r.success)
    if (hasFailures) {
      logger.error('Some clustering operations failed')
      process.exit(1)
    } else {
      logger.info('All clustering operations completed successfully')
      process.exit(0)
    }

  } catch (error) {
    logger.error('Clustering script failed', { error })
    process.exit(1)
  }
}

// Parse command line arguments
function parseArgs(): ClusteringOptions {
  const args = process.argv.slice(2)
  const options: ClusteringOptions = {}

  for (const arg of args) {
    if (arg === '--all-tenants') {
      options.allTenants = true
    } else if (arg.startsWith('--tenant-id=')) {
      options.tenantId = arg.split('=')[1]
    } else if (arg.startsWith('--min-cluster-size=')) {
      options.minClusterSize = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--outlier-cluster-id=')) {
      options.outlierClusterId = parseInt(arg.split('=')[1], 10)
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npm run script:run-clustering [options]

Options:
  --all-tenants                Run clustering for all tenants
  --tenant-id=<id>            Run clustering for specific tenant
  --min-cluster-size=<n>      Minimum cluster size (default: 5)
  --outlier-cluster-id=<id>   Outlier cluster ID (default: -1)
  --verbose, -v               Verbose output
  --help, -h                  Show this help message

Examples:
  npm run script:run-clustering -- --all-tenants
  npm run script:run-clustering -- --tenant-id=abc123
  npm run script:run-clustering -- --tenant-id=abc123 --min-cluster-size=10 --verbose
      `)
      process.exit(0)
    }
  }

  return options
}

// Run the script if called directly
if (require.main === module) {
  const options = parseArgs()
  runClustering(options)
}

export { runClustering, ClusteringOptions }