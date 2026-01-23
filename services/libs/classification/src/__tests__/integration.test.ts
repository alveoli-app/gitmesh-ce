/**
 * Integration test for classification system
 * Tests the classification pipeline with real activity data
 */

// Set development environment to avoid AWS dependencies
process.env.NODE_ENV = 'development';
process.env.IS_DEV_ENV = 'true';

import { ClassificationService } from '../classificationService';
import { ClassificationConfig, IActivityData } from '../types';

describe('Classification Integration Test', () => {
  let classificationService: ClassificationService;
  let config: ClassificationConfig;

  beforeAll(async () => {
    // Mock configuration for testing
    config = {
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

    classificationService = new ClassificationService();
    await classificationService.initialize(config);
  });

  it('should classify a GitHub bug report correctly', async () => {
    const activity: IActivityData = {
      id: 'test-github-bug',
      type: 'issue-created',
      platform: 'github',
      timestamp: new Date(),
      content: {
        title: 'Critical Bug: Application crashes on startup',
        body: 'The application crashes immediately when I try to start it. This is blocking our development work and needs urgent attention. Error logs show memory allocation issues.'
      }
    };

    const result = await classificationService.classify(activity);

    // Verify basic structure
    expect(result).toHaveProperty('productArea');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('urgency');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('confidence');

    // Verify data types
    expect(Array.isArray(result.productArea)).toBe(true);
    expect(Array.isArray(result.intent)).toBe(true);
    expect(typeof result.sentiment).toBe('string');
    expect(typeof result.urgency).toBe('string');
    expect(typeof result.confidence).toBe('number');

    // Verify value ranges
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);

    // Verify valid enum values
    expect(['positive', 'negative', 'neutral', 'mixed']).toContain(result.sentiment);
    expect(['critical', 'high', 'medium', 'low']).toContain(result.urgency);

    // Verify arrays are not empty
    expect(result.productArea.length).toBeGreaterThan(0);
    expect(result.intent.length).toBeGreaterThan(0);

    console.log('Bug Report Classification:', JSON.stringify(result, null, 2));
  });

  it('should classify a feature request correctly', async () => {
    const activity: IActivityData = {
      id: 'test-feature-request',
      type: 'discussion',
      platform: 'discord',
      timestamp: new Date(),
      content: {
        title: 'Feature Request: Dark Mode Support',
        body: 'It would be great to have dark mode support in the application. This would improve user experience significantly and many users have requested this feature.'
      }
    };

    const result = await classificationService.classify(activity);

    // Verify structure and types
    expect(result).toHaveProperty('productArea');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('urgency');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('confidence');

    expect(Array.isArray(result.productArea)).toBe(true);
    expect(Array.isArray(result.intent)).toBe(true);
    expect(result.productArea.length).toBeGreaterThan(0);
    expect(result.intent.length).toBeGreaterThan(0);

    console.log('Feature Request Classification:', JSON.stringify(result, null, 2));
  });

  it('should handle empty content gracefully', async () => {
    const activity: IActivityData = {
      id: 'test-empty',
      type: 'comment',
      platform: 'slack',
      timestamp: new Date(),
      content: {}
    };

    const result = await classificationService.classify(activity);

    // Should still return valid structure
    expect(result).toHaveProperty('productArea');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('urgency');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('confidence');

    expect(Array.isArray(result.productArea)).toBe(true);
    expect(Array.isArray(result.intent)).toBe(true);

    console.log('Empty Content Classification:', JSON.stringify(result, null, 2));
  });

  it('should classify multiple activities consistently', async () => {
    const activities: IActivityData[] = [
      {
        id: 'test-1',
        type: 'issue-created',
        platform: 'github',
        timestamp: new Date(),
        content: {
          title: 'API Performance Issue',
          body: 'The API response time is very slow for large datasets'
        }
      },
      {
        id: 'test-2',
        type: 'message',
        platform: 'discord',
        timestamp: new Date(),
        content: {
          title: 'API Performance Problem',
          body: 'API is really slow when handling big data requests'
        }
      }
    ];

    const results = await Promise.all(
      activities.map(activity => classificationService.classify(activity))
    );

    // Both should have valid classifications
    results.forEach((result, index) => {
      expect(result).toHaveProperty('productArea');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');

      expect(Array.isArray(result.productArea)).toBe(true);
      expect(Array.isArray(result.intent)).toBe(true);
      expect(result.productArea.length).toBeGreaterThan(0);
      expect(result.intent.length).toBeGreaterThan(0);

      console.log(`Activity ${index + 1} Classification:`, JSON.stringify(result, null, 2));
    });
  });

  it('should complete classification within reasonable time', async () => {
    const activity: IActivityData = {
      id: 'test-performance',
      type: 'issue-created',
      platform: 'github',
      timestamp: new Date(),
      content: {
        title: 'Performance Test',
        body: 'This is a test to measure classification performance and ensure it completes quickly.'
      }
    };

    const startTime = Date.now();
    const result = await classificationService.classify(activity);
    const endTime = Date.now();

    const duration = endTime - startTime;

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
    expect(result).toHaveProperty('confidence');

    console.log(`Classification completed in ${duration}ms`);
  });
});