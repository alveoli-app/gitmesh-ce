#!/usr/bin/env node

import { getServiceLogger, getServiceTracer } from '@gitmesh/logging'
import { getDbConnection } from '@gitmesh/database'
import { getRedisClient } from '@gitmesh/redis'
import { getSqsClient } from '@gitmesh/sqs'
import { EnrichmentService } from '../service/enrichmentService'
import { SQS_CONFIG, DB_CONFIG, REDIS_CONFIG } from '../conf'

const logger = getServiceLogger()
const tracer = getServiceTracer()

async function main() {
  try {
    const args = process.argv.slice(2)
    const batchSize = parseInt(args[0]) || 100
    const tenantId = args[1] || undefined

    logger.info('Starting manual batch enrichment', { batchSize, tenantId })

    // Initialize connections
    const sqsClient = getSqsClient(SQS_CONFIG())
    await getDbConnection(DB_CONFIG(), 1)
    await getRedisClient(REDIS_CONFIG(), true)

    // Run enrichment with retry capability
    const enrichmentService = new EnrichmentService(sqsClient, tracer, logger)
    const result = await enrichmentService.enrichBatch(batchSize, tenantId)

    logger.info('Manual batch enrichment completed', result)
    
    console.log('\n=== Enrichment Results ===')
    console.log(`Processed: ${result.processed}`)
    console.log(`Enriched: ${result.enriched}`)
    console.log(`Failed: ${result.failed}`)
    console.log(`Partial Failures: ${result.partialFailures}`)
    console.log(`Identities Resolved: ${result.identitiesResolved}`)
    console.log(`New Members: ${result.newMembers}`)
    console.log(`New Identities: ${result.newIdentities}`)
    console.log(`Embeddings Generated: ${result.embeddingsGenerated}`)
    console.log(`Duplicates Detected: ${result.duplicatesDetected}`)
    console.log(`Classified: ${result.classified}`)
    console.log(`Scored: ${result.scored}`)

    process.exit(0)
  } catch (error) {
    logger.error('Manual batch enrichment failed', { error })
    console.error('Error:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}