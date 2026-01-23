import { ClassificationService } from '../classificationService';
import { ClassificationConfig, IActivityData } from '../types';

describe('ClassificationService', () => {
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

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(classificationService.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error when classifying before initialization', async () => {
      const mockActivity: IActivityData = {
        id: 'test-123',
        type: 'issue-created',
        platform: 'github',
        timestamp: new Date(),
        content: {
          title: 'Test issue',
          body: 'This is a test issue'
        }
      };

      await expect(classificationService.classify(mockActivity)).rejects.toThrow('Classification service not initialized');
    });
  });

  describe('classification', () => {
    beforeEach(async () => {
      await classificationService.initialize(mockConfig);
    });

    it('should classify a bug report activity', async () => {
      const bugActivity: IActivityData = {
        id: 'bug-123',
        type: 'issue-created',
        platform: 'github',
        timestamp: new Date(),
        content: {
          title: 'Critical Bug: Application crashes on startup',
          body: 'The application crashes immediately when I try to start it. This is a critical issue that needs urgent attention.'
        }
      };

      const result = await classificationService.classify(bugActivity);

      expect(result).toHaveProperty('productArea');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');

      expect(Array.isArray(result.productArea)).toBe(true);
      expect(Array.isArray(result.intent)).toBe(true);
      expect(typeof result.sentiment).toBe('string');
      expect(typeof result.urgency).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should classify a feature request activity', async () => {
      const featureActivity: IActivityData = {
        id: 'feature-123',
        type: 'discussion',
        platform: 'discord',
        timestamp: new Date(),
        content: {
          title: 'Feature Request: Dark Mode',
          body: 'It would be great to have dark mode support in the application. This would improve user experience significantly.'
        }
      };

      const result = await classificationService.classify(featureActivity);

      expect(result.intent).toContain('feature_request');
      expect(result.sentiment).toBe('positive');
    });

    it('should handle empty content gracefully', async () => {
      const emptyActivity: IActivityData = {
        id: 'empty-123',
        type: 'comment',
        platform: 'slack',
        timestamp: new Date(),
        content: {}
      };

      const result = await classificationService.classify(emptyActivity);

      expect(result).toHaveProperty('productArea');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('intent');
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('model management', () => {
    beforeEach(async () => {
      await classificationService.initialize(mockConfig);
    });

    it('should update models successfully', async () => {
      const newModelPaths = {
        productAreaModel: 's3://test-bucket/product-area-v2.pkl',
        intentModel: 's3://test-bucket/intent-v2.pkl',
        urgencyModel: 's3://test-bucket/urgency-v2.pkl'
      };

      await expect(classificationService.updateModels(newModelPaths)).resolves.not.toThrow();
    });

    it('should return model metrics', async () => {
      const metrics = await classificationService.getModelMetrics();

      expect(metrics).toHaveProperty('productArea');
      expect(metrics).toHaveProperty('intent');
      expect(metrics).toHaveProperty('urgency');

      expect(metrics.productArea).toHaveProperty('precision');
      expect(metrics.productArea).toHaveProperty('recall');
      expect(metrics.productArea).toHaveProperty('f1');
    });
  });
});