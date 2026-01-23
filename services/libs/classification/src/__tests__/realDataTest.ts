import { ClassificationService } from '../classificationService';
import { ClassificationConfig, IActivityData } from '../types';

/**
 * Test classification with real-world activity data
 * This test verifies that the classification system works with actual activity data
 */
describe('Classification with Real Data', () => {
  let classificationService: ClassificationService;
  let mockConfig: ClassificationConfig;

  beforeEach(() => {
    classificationService = new ClassificationService();
    
    mockConfig = {
      confidenceThreshold: 0.6,
      modelUpdateIntervalDays: 7,
      productAreaModel: {
        version: 'v1.0.0',
        s3Path: 's3://test-bucket/product-area-model.pkl',
        confidenceThreshold: 0.6,
        lastTrained: new Date()
      },
      intentModel: {
        version: 'v1.0.0',
        s3Path: 's3://test-bucket/intent-model.pkl',
        confidenceThreshold: 0.7,
        lastTrained: new Date()
      },
      urgencyModel: {
        version: 'v1.0.0',
        s3Path: 's3://test-bucket/urgency-model.pkl',
        confidenceThreshold: 0.6,
        lastTrained: new Date()
      },
      s3Config: {
        region: 'us-east-1',
        bucket: 'test-bucket'
      }
    };
  });

  describe('Basic Classification Test', () => {
    beforeEach(async () => {
      await classificationService.initialize(mockConfig);
    });

    it('should classify a simple GitHub issue activity', async () => {
      const githubIssue: IActivityData = {
        id: 'github-issue-123',
        type: 'issue-created',
        platform: 'github',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        content: {
          title: 'API endpoint returns 500 error',
          body: 'The server returns a 500 error when processing requests. This is a bug that needs to be fixed.',
        }
      };

      const result = await classificationService.classify(githubIssue);

      // Verify structure
      expect(result).toHaveProperty('productArea');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');

      // Verify types
      expect(Array.isArray(result.productArea)).toBe(true);
      expect(Array.isArray(result.intent)).toBe(true);
      expect(typeof result.sentiment).toBe('string');
      expect(typeof result.urgency).toBe('string');
      expect(typeof result.confidence).toBe('number');

      // Verify ranges
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Verify valid values
      expect(['positive', 'negative', 'neutral', 'mixed']).toContain(result.sentiment);
      expect(['critical', 'high', 'medium', 'low']).toContain(result.urgency);
      expect(result.productArea.length).toBeGreaterThan(0);
      expect(result.intent.length).toBeGreaterThan(0);

      console.log('GitHub Issue Classification Result:', JSON.stringify(result, null, 2));
    }, 10000);

    it('should handle activities with minimal content', async () => {
      const minimalActivity: IActivityData = {
        id: 'minimal-123',
        type: 'comment',
        platform: 'slack',
        timestamp: new Date(),
        content: {
          body: 'Thanks!'
        }
      };

      const result = await classificationService.classify(minimalActivity);

      // Should still return valid classification structure
      expect(result).toHaveProperty('productArea');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');

      // Should handle minimal content gracefully
      expect(Array.isArray(result.productArea)).toBe(true);
      expect(Array.isArray(result.intent)).toBe(true);
      expect(result.productArea.length).toBeGreaterThan(0);
      expect(result.intent.length).toBeGreaterThan(0);

      console.log('Minimal Activity Classification Result:', JSON.stringify(result, null, 2));
    }, 10000);
  });
});