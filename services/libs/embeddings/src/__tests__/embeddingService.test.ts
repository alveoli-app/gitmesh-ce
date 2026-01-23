import { EmbeddingService } from '../embeddingService';
import { RedisClient } from '@gitmesh/redis';
import { EmbeddingConfig } from '../types';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClient;

// Mock Python worker
jest.mock('../pythonWorker', () => {
  return {
    PythonEmbeddingWorker: jest.fn().mockImplementation(() => ({
      generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0.1)),
      quantizeEmbedding: jest.fn().mockResolvedValue(new Array(96).fill(0.1)),
    })),
  };
});

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;
  let mockConfig: Partial<EmbeddingConfig>;

  beforeEach(() => {
    mockConfig = {
      modelName: 'all-MiniLM-L6-v2',
      cacheTtlSeconds: 604800, // 7 days
      cacheKeyPrefix: 'signal:embedding',
      pythonWorkerTimeoutMs: 30000,
      maxTextLength: 10000,
      quantizedDimensions: 96,
      originalDimensions: 384,
    };

    embeddingService = new EmbeddingService(mockRedisClient, mockConfig);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for valid text', async () => {
      const text = 'This is a test message for embedding generation';
      
      const result = await embeddingService.generateEmbedding(text);
      
      expect(result).toHaveProperty('embedding');
      expect(result).toHaveProperty('fromCache', false);
      expect(result).toHaveProperty('processingTimeMs');
      expect(result.embedding).toHaveLength(384);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should handle empty text gracefully', async () => {
      const text = '';
      
      await expect(embeddingService.generateEmbedding(text))
        .rejects.toThrow('Text must be a non-empty string');
    });

    it('should handle null text gracefully', async () => {
      const text = null as any;
      
      await expect(embeddingService.generateEmbedding(text))
        .rejects.toThrow('Text must be a non-empty string');
    });

    it('should handle whitespace-only text gracefully', async () => {
      const text = '   \n\t   ';
      
      await expect(embeddingService.generateEmbedding(text))
        .rejects.toThrow('Text cannot be empty after preprocessing');
    });

    it('should truncate very long text', async () => {
      const longText = 'a'.repeat(15000);
      
      const result = await embeddingService.generateEmbedding(longText);
      
      expect(result.embedding).toHaveLength(384);
    });
  });

  describe('quantizeEmbedding', () => {
    it('should quantize 384-dimensional embedding to 96 dimensions', async () => {
      const embedding = new Array(384).fill(0.5);
      
      const result = await embeddingService.quantizeEmbedding(embedding);
      
      expect(result).toHaveProperty('quantizedEmbedding');
      expect(result).toHaveProperty('originalDimensions', 384);
      expect(result).toHaveProperty('quantizedDimensions', 96);
      expect(result.quantizedEmbedding).toHaveLength(96);
    });

    it('should reject invalid embedding dimensions', async () => {
      const invalidEmbedding = new Array(256).fill(0.5);
      
      await expect(embeddingService.quantizeEmbedding(invalidEmbedding))
        .rejects.toThrow('Invalid embedding dimensions: expected 384, got 256');
    });

    it('should reject non-array input', async () => {
      const invalidEmbedding = null as any;
      
      await expect(embeddingService.quantizeEmbedding(invalidEmbedding))
        .rejects.toThrow('Invalid embedding dimensions: expected 384, got undefined');
    });
  });

  describe('getCachedEmbedding', () => {
    it('should return cached embedding when available', async () => {
      const activityId = 'test-activity-123';
      const cachedEmbedding = new Array(384).fill(0.3);
      const cacheEntry = {
        embedding: cachedEmbedding,
        cachedAt: Date.now(),
        textHash: 'test-hash',
      };
      
      (mockRedisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));
      
      const result = await embeddingService.getCachedEmbedding(activityId);
      
      expect(result).toEqual(cachedEmbedding);
      expect(mockRedisClient.get).toHaveBeenCalledWith('signal:embedding:test-activity-123');
    });

    it('should return null when cache miss', async () => {
      const activityId = 'test-activity-456';
      
      (mockRedisClient.get as jest.Mock).mockResolvedValue(null);
      
      const result = await embeddingService.getCachedEmbedding(activityId);
      
      expect(result).toBeNull();
    });

    it('should handle invalid cached data gracefully', async () => {
      const activityId = 'test-activity-789';
      
      (mockRedisClient.get as jest.Mock).mockResolvedValue('invalid-json');
      
      const result = await embeddingService.getCachedEmbedding(activityId);
      
      expect(result).toBeNull();
    });
  });

  describe('cacheEmbedding', () => {
    it('should cache embedding with correct TTL', async () => {
      const activityId = 'test-activity-cache';
      const embedding = new Array(384).fill(0.7);
      const textHash = 'test-hash-123';
      
      await embeddingService.cacheEmbedding(activityId, embedding, textHash);
      
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'signal:embedding:test-activity-cache',
        604800, // 7 days
        expect.stringContaining('"embedding"')
      );
    });

    it('should not throw on cache failures', async () => {
      const activityId = 'test-activity-fail';
      const embedding = new Array(384).fill(0.8);
      const textHash = 'test-hash-456';
      
      (mockRedisClient.setex as jest.Mock).mockRejectedValue(new Error('Redis error'));
      
      await expect(embeddingService.cacheEmbedding(activityId, embedding, textHash))
        .resolves.not.toThrow();
    });
  });

  describe('generateEmbeddingWithCache', () => {
    it('should return cached embedding when available', async () => {
      const activityId = 'test-activity-cached';
      const text = 'Test text for caching';
      const cachedEmbedding = new Array(384).fill(0.9);
      const cacheEntry = {
        embedding: cachedEmbedding,
        cachedAt: Date.now(),
        textHash: 'cached-hash',
      };
      
      (mockRedisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));
      
      const result = await embeddingService.generateEmbeddingWithCache(activityId, text);
      
      expect(result.embedding).toEqual(cachedEmbedding);
      expect(result.fromCache).toBe(true);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should generate and cache new embedding when cache miss', async () => {
      const activityId = 'test-activity-new';
      const text = 'New text for embedding';
      
      (mockRedisClient.get as jest.Mock).mockResolvedValue(null);
      
      const result = await embeddingService.generateEmbeddingWithCache(activityId, text);
      
      expect(result.embedding).toHaveLength(384);
      expect(result.fromCache).toBe(false);
      expect(typeof result.processingTimeMs).toBe('number');
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });
  });
});