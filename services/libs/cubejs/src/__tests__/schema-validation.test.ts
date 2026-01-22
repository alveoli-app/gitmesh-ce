/**
 * Basic tests for schema validation system
 */

import { SchemaValidator } from '../diagnostics/schema-validator'
import { SchemaCorrector } from '../diagnostics/schema-corrector'
import { Pool } from 'pg'

// Mock Pool for testing
const mockPool = {
  query: jest.fn()
} as unknown as Pool

describe('Schema Validation System', () => {
  describe('SchemaValidator', () => {
    it('should create SchemaValidator instance', () => {
      const validator = new SchemaValidator(mockPool)
      expect(validator).toBeInstanceOf(SchemaValidator)
    })

    it('should have required methods', () => {
      const validator = new SchemaValidator(mockPool)
      expect(typeof validator.validateCube).toBe('function')
      expect(typeof validator.validateAllCubes).toBe('function')
      expect(typeof validator.checkMaterializedViews).toBe('function')
    })
  })

  describe('SchemaCorrector', () => {
    it('should create SchemaCorrector instance', () => {
      const corrector = new SchemaCorrector(mockPool)
      expect(corrector).toBeInstanceOf(SchemaCorrector)
    })

    it('should have required methods', () => {
      const corrector = new SchemaCorrector(mockPool)
      expect(typeof corrector.generateSchemaFixes).toBe('function')
      expect(typeof corrector.generateCorrectionGuidance).toBe('function')
      expect(typeof corrector.detectInvalidJoins).toBe('function')
      expect(typeof corrector.applyAutomaticFixes).toBe('function')
      expect(typeof corrector.suggestColumnMappings).toBe('function')
    })
  })
})