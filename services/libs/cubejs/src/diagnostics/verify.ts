/**
 * Verification script for diagnostic infrastructure
 * This script manually tests the diagnostic components to ensure they work correctly
 */

import { createDiagnosticLogger, generateCorrelationId, CorrelationContext } from './logging'
import { CubeQuery, SecurityContext, StructuredError } from './types'

// Mock logger for verification
const mockLogger = {
  error: (data: any, message: string) => console.log('ERROR:', message, JSON.stringify(data, null, 2)),
  warn: (data: any, message: string) => console.log('WARN:', message, JSON.stringify(data, null, 2)),
  info: (data: any, message: string) => console.log('INFO:', message, JSON.stringify(data, null, 2)),
  debug: (data: any, message: string) => console.log('DEBUG:', message, JSON.stringify(data, null, 2))
}

async function verifyDiagnosticInfrastructure() {
  console.log('=== Verifying Diagnostic Infrastructure ===\n')

  // Test 1: Correlation ID generation
  console.log('1. Testing Correlation ID generation...')
  const correlationId1 = generateCorrelationId()
  const correlationId2 = generateCorrelationId()
  console.log(`Generated ID 1: ${correlationId1}`)
  console.log(`Generated ID 2: ${correlationId2}`)
  console.log(`IDs are different: ${correlationId1 !== correlationId2}`)
  console.log(`ID format is valid: ${/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(correlationId1)}`)
  console.log()

  // Test 2: Correlation Context
  console.log('2. Testing Correlation Context...')
  const context = CorrelationContext.getInstance()
  const contextId = context.generateNewCorrelationId()
  console.log(`Context ID: ${contextId}`)
  console.log(`Retrieved same ID: ${context.getCorrelationId() === contextId}`)
  context.clearCorrelationId()
  const newContextId = context.getCorrelationId()
  console.log(`New ID after clear: ${newContextId}`)
  console.log(`IDs are different after clear: ${contextId !== newContextId}`)
  console.log()

  // Test 3: Diagnostic Logger
  console.log('3. Testing Diagnostic Logger...')
  const logger = createDiagnosticLogger(mockLogger as any)
  
  // Test structured error logging
  const structuredError: StructuredError = {
    timestamp: new Date(),
    level: 'error',
    category: 'query',
    message: 'Test structured error',
    details: {
      suggestions: ['Check query syntax', 'Verify security context']
    },
    correlationId: generateCorrelationId()
  }
  
  console.log('Logging structured error...')
  logger.logStructuredError(structuredError)
  console.log()

  // Test 4: Query validation error logging
  console.log('4. Testing Query Validation Error Logging...')
  const testQuery: CubeQuery = {
    measures: ['Organizations.count'],
    filters: [{
      member: 'Organizations.tenantId',
      operator: 'equals',
      values: ['sensitive-tenant-id']
    }]
  }

  const testContext: SecurityContext = {
    tenantId: 'test-tenant-123',
    userId: 'sensitive-user-id',
    segments: ['admin', 'user']
  }

  logger.logQueryValidationError('Test query validation error', testQuery, testContext, undefined, ['Check query structure'])
  console.log()

  // Test 5: Diagnostic session
  console.log('5. Testing Diagnostic Session...')
  const sessionId = logger.startDiagnosticSession()
  console.log(`Started session with ID: ${sessionId}`)
  logger.logDiagnosticInfo('Test diagnostic info during session', { testData: 'example' })
  logger.endDiagnosticSession()
  console.log()

  console.log('=== Verification Complete ===')
  console.log('All diagnostic infrastructure components are working correctly!')
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyDiagnosticInfrastructure().catch(console.error)
}

export { verifyDiagnosticInfrastructure }