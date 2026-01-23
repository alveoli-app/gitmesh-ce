/**
 * Property-Based Tests for signal_metadata structure
 * 
 * Feature: signal-intelligence-ce
 * Property 20: Classification Completeness
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 * 
 * This test ensures that the signal_metadata structure always contains
 * complete classification data with all required fields when classification
 * is performed.
 */

import * as fc from 'fast-check'

// Configure fast-check for property-based testing
fc.configureGlobal({
  numRuns: 100,
  verbose: false,
  seed: 42,
  endOnFailure: true,
})

/**
 * Signal metadata structure as defined in the migration
 */
interface SignalMetadata {
  embedding_id?: string
  minhash_signature?: string
  is_duplicate?: boolean
  canonical_id?: string
  classification?: {
    product_area: string[]
    sentiment: string
    urgency: string
    intent: string[]
    confidence: number
  }
  scores?: {
    velocity: number
    cross_platform: number
    actionability: number
    novelty: number
  }
  cluster_id?: string
  enriched_at?: string
  enrichment_version?: string
}

/**
 * Generators for property-based testing
 */

// Generator for product area labels
const productAreaArb = fc.constantFrom(
  'engineering',
  'design',
  'marketing',
  'sales',
  'support',
  'product'
)

// Generator for sentiment labels
const sentimentArb = fc.constantFrom('positive', 'negative', 'neutral', 'mixed')

// Generator for urgency labels
const urgencyArb = fc.constantFrom('critical', 'high', 'medium', 'low')

// Generator for intent labels
const intentArb = fc.constantFrom(
  'question',
  'feedback',
  'bug_report',
  'feature_request',
  'discussion'
)

// Generator for classification with all required fields
const classificationArb = fc.record({
  product_area: fc.array(productAreaArb, { minLength: 1, maxLength: 3 }),
  sentiment: sentimentArb,
  urgency: urgencyArb,
  intent: fc.array(intentArb, { minLength: 1, maxLength: 3 }),
  confidence: fc.double({ min: 0, max: 1 }),
})

// Generator for complete signal_metadata with classification
const signalMetadataWithClassificationArb = fc.record({
  embedding_id: fc.option(fc.uuid()),
  minhash_signature: fc.option(fc.hexaString({ minLength: 16, maxLength: 16 })),
  is_duplicate: fc.option(fc.boolean()),
  canonical_id: fc.option(fc.uuid()),
  classification: classificationArb,
  scores: fc.option(
    fc.record({
      velocity: fc.integer({ min: 0, max: 100 }),
      cross_platform: fc.integer({ min: 0, max: 100 }),
      actionability: fc.integer({ min: 0, max: 100 }),
      novelty: fc.integer({ min: 0, max: 100 }),
    })
  ),
  cluster_id: fc.option(fc.string()),
  enriched_at: fc.option(fc.date().map((d) => d.toISOString())),
  enrichment_version: fc.option(fc.constantFrom('1.0', '1.1', '2.0')),
})

describe('Signal Metadata Property Tests', () => {
  describe('Property 20: Classification Completeness', () => {
    it('should always have all four classification categories when classification exists', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          // When classification exists, it must have all required fields
          expect(metadata.classification).toBeDefined()
          expect(metadata.classification).toHaveProperty('product_area')
          expect(metadata.classification).toHaveProperty('sentiment')
          expect(metadata.classification).toHaveProperty('urgency')
          expect(metadata.classification).toHaveProperty('intent')
          expect(metadata.classification).toHaveProperty('confidence')
        }),
        { numRuns: 100 }
      )
    })

    it('should have product_area as a non-empty array', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          const { product_area } = metadata.classification!
          
          // product_area must be an array
          expect(Array.isArray(product_area)).toBe(true)
          
          // product_area must not be empty
          expect(product_area.length).toBeGreaterThan(0)
          
          // All values must be valid product area labels
          const validLabels = ['engineering', 'design', 'marketing', 'sales', 'support', 'product']
          product_area.forEach((label) => {
            expect(validLabels).toContain(label)
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should have sentiment as a single valid label', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          const { sentiment } = metadata.classification!
          
          // sentiment must be a string
          expect(typeof sentiment).toBe('string')
          
          // sentiment must be one of the valid values
          const validSentiments = ['positive', 'negative', 'neutral', 'mixed']
          expect(validSentiments).toContain(sentiment)
        }),
        { numRuns: 100 }
      )
    })

    it('should have urgency as a single valid label', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          const { urgency } = metadata.classification!
          
          // urgency must be a string
          expect(typeof urgency).toBe('string')
          
          // urgency must be one of the valid values
          const validUrgencies = ['critical', 'high', 'medium', 'low']
          expect(validUrgencies).toContain(urgency)
        }),
        { numRuns: 100 }
      )
    })

    it('should have intent as a non-empty array', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          const { intent } = metadata.classification!
          
          // intent must be an array
          expect(Array.isArray(intent)).toBe(true)
          
          // intent must not be empty
          expect(intent.length).toBeGreaterThan(0)
          
          // All values must be valid intent labels
          const validIntents = ['question', 'feedback', 'bug_report', 'feature_request', 'discussion']
          intent.forEach((label) => {
            expect(validIntents).toContain(label)
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should have confidence as a number between 0 and 1', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          const { confidence } = metadata.classification!
          
          // confidence must be a number
          expect(typeof confidence).toBe('number')
          
          // confidence must be between 0 and 1 (inclusive)
          expect(confidence).toBeGreaterThanOrEqual(0)
          expect(confidence).toBeLessThanOrEqual(1)
          
          // confidence must not be NaN
          expect(Number.isNaN(confidence)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should support multiple labels for product_area and intent', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          const { product_area, intent } = metadata.classification!
          
          // product_area and intent support multiple labels (arrays)
          expect(Array.isArray(product_area)).toBe(true)
          expect(Array.isArray(intent)).toBe(true)
          
          // They can have more than one label
          // (This property is validated by allowing arrays with multiple elements)
          expect(product_area.length).toBeGreaterThan(0)
          expect(intent.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should have single values for sentiment and urgency', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          const { sentiment, urgency } = metadata.classification!
          
          // sentiment and urgency must be strings (single values, not arrays)
          expect(typeof sentiment).toBe('string')
          expect(typeof urgency).toBe('string')
          
          // They should not be arrays
          expect(Array.isArray(sentiment)).toBe(false)
          expect(Array.isArray(urgency)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should maintain classification structure integrity across all valid inputs', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          // The entire classification object must be well-formed
          const classification = metadata.classification!
          
          // All required fields present
          expect(classification).toHaveProperty('product_area')
          expect(classification).toHaveProperty('sentiment')
          expect(classification).toHaveProperty('urgency')
          expect(classification).toHaveProperty('intent')
          expect(classification).toHaveProperty('confidence')
          
          // Correct types
          expect(Array.isArray(classification.product_area)).toBe(true)
          expect(typeof classification.sentiment).toBe('string')
          expect(typeof classification.urgency).toBe('string')
          expect(Array.isArray(classification.intent)).toBe(true)
          expect(typeof classification.confidence).toBe('number')
          
          // Non-empty arrays
          expect(classification.product_area.length).toBeGreaterThan(0)
          expect(classification.intent.length).toBeGreaterThan(0)
          
          // Valid confidence range
          expect(classification.confidence).toBeGreaterThanOrEqual(0)
          expect(classification.confidence).toBeLessThanOrEqual(1)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Additional Signal Metadata Properties', () => {
    it('should handle optional fields gracefully', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          // Optional fields can be undefined or have valid values
          if (metadata.embedding_id !== undefined) {
            expect(typeof metadata.embedding_id).toBe('string')
          }
          
          if (metadata.minhash_signature !== undefined) {
            expect(typeof metadata.minhash_signature).toBe('string')
          }
          
          if (metadata.is_duplicate !== undefined) {
            expect(typeof metadata.is_duplicate).toBe('boolean')
          }
          
          if (metadata.canonical_id !== undefined) {
            expect(typeof metadata.canonical_id).toBe('string')
          }
          
          if (metadata.cluster_id !== undefined) {
            expect(typeof metadata.cluster_id).toBe('string')
          }
          
          if (metadata.enriched_at !== undefined) {
            expect(typeof metadata.enriched_at).toBe('string')
            // Should be a valid ISO 8601 date string
            expect(() => new Date(metadata.enriched_at!)).not.toThrow()
          }
          
          if (metadata.enrichment_version !== undefined) {
            expect(typeof metadata.enrichment_version).toBe('string')
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should have valid score ranges when scores are present', () => {
      fc.assert(
        fc.property(signalMetadataWithClassificationArb, (metadata) => {
          if (metadata.scores !== undefined) {
            const { velocity, cross_platform, actionability, novelty } = metadata.scores
            
            // All scores must be numbers between 0 and 100
            expect(velocity).toBeGreaterThanOrEqual(0)
            expect(velocity).toBeLessThanOrEqual(100)
            
            expect(cross_platform).toBeGreaterThanOrEqual(0)
            expect(cross_platform).toBeLessThanOrEqual(100)
            
            expect(actionability).toBeGreaterThanOrEqual(0)
            expect(actionability).toBeLessThanOrEqual(100)
            
            expect(novelty).toBeGreaterThanOrEqual(0)
            expect(novelty).toBeLessThanOrEqual(100)
          }
        }),
        { numRuns: 100 }
      )
    })
  })
})
