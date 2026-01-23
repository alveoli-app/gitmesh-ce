import { EmbeddingService } from '../embeddingService';
import { RedisClient } from '@gitmesh/redis';
import { EmbeddingConfig } from '../types';

// Mock Redis client for integration testing
const createMockRedisClient = (): RedisClient => {
  const cache = new Map<string, { value: string; ttl: number; expiry: number }>();
  
  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      const entry = cache.get(key);
      if (!entry) return null;
      
      // Check if expired
      if (Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
      }
      
      return entry.value;
    }),
    
    setex: jest.fn().mockImplementation(async (key: string, ttl: number, value: string) => {
      cache.set(key, {
        value,
        ttl,
        expiry: Date.now() + (ttl * 1000)
      });
      return 'OK';
    }),
    
    del: jest.fn().mockImplementation(async (key: string) => {
      const existed = cache.has(key);
      cache.delete(key);
      return existed ? 1 : 0;
    }),
    
    // Add method to inspect cache for testing
    _getCacheSize: () => cache.size,
    _getCacheKeys: () => Array.from(cache.keys()),
    _clearCache: () => cache.clear(),
  } as unknown as RedisClient;
};

// Mock Python worker
jest.mock('../pythonWorker', () => {
  return {
    PythonEmbeddingWorker: jest.fn().mockImplementation(() => ({
      generateEmbedding: jest.fn().mockImplementation(async (text: string) => {
        // Simulate different embeddings for different text
        const hash = text.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        return new Array(384).fill(0).map((_, i) => (hash + i) / 1000000);
      }),
      quantizeEmbedding: jest.fn().mockResolvedValue(new Array(96).fill(0.1)),
    })),
  };
});

describe('EmbeddingService - Redis Caching Integration', () => {
  let embeddingService: EmbeddingService;
  let mockRedisClient: ReturnType<typeof createMockRedisClient>;
  let mockConfig: EmbeddingConfig;

  beforeEach(() => {
    mockRedisClient = createMockRedisClient();
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
    
    // Clear cache and reset mocks
    (mockRedisClient as any)._clearCache();
    jest.clearAllMocks();
  });

  describe('Cache Key Pattern', () => {
    it('should use correct cache key pattern signal:embedding:{activity_id}', async () => {
      const activityId = 'test-activity-123';
      const text = 'Test text for embedding';
      
      await embeddingService.generateEmbeddingWithCache(activityId, text);
      
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'signal:embedding:test-activity-123',
        604800,
        expect.any(String)
      );
    });
  });

  describe('Cache TTL Configuration', () => {
    it('should use configured TTL (7 days default)', async () => {
      const activityId = 'test-activity-ttl';
      const text = 'Test text for TTL';
      
      await embeddingService.generateEmbeddingWithCache(activityId, text);
      
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        604800, // 7 days in seconds
        expect.any(String)
      );
    });

    it('should use custom TTL when configured', async () => {
      const customConfig = { ...mockConfig, cacheTtlSeconds: 3600 }; // 1 hour
      const customService = new EmbeddingService(mockRedisClient, customConfig);
      
      const activityId = 'test-activity-custom-ttl';
      const text = 'Test text for custom TTL';
      
      await customService.generateEmbeddingWithCache(activityId, text);
      
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        3600, // 1 hour in seconds
        expect.any(String)
      );
    });
  });

  describe('Cache Hit/Miss Logic', () => {
    it('should return cached embedding on cache hit', async () => {
      const activityId = 'test-activity-hit';
      const text = 'Test text for cache hit';
      
      // First call - should generate and cache
      const result1 = await embeddingService.generateEmbeddingWithCache(activityId, text);
      expect(result1.fromCache).toBe(false);
      expect(mockRedisClient.setex).toHaveBeenCalledTimes(1);
      
      // Second call - should hit cache
      const result2 = await embeddingService.generateEmbeddingWithCache(activityId, text);
      expect(result2.fromCache).toBe(true);
      expect(result2.embedding).toEqual(result1.embedding);
      expect(mockRedisClient.get).toHaveBeenCalledWith('signal:embedding:test-activity-hit');
      
      // Should not call setex again
      expect(mockRedisClient.setex).toHaveBeenCalledTimes(1);
    });

    it('should generate new embedding on cache miss', async () => {
      const activityId = 'test-activity-miss';
      const text = 'Test text for cache miss';
      
      // Mock cache miss
      (mockRedisClient.get as jest.Mock).mockResolvedValueOnce(null);
      
      const result = await embeddingService.generateEmbeddingWithCache(activityId, text);
      
      expect(result.fromCache).toBe(false);
      expect(result.embedding).toHaveLength(384);
      expect(mockRedisClient.get).toHaveBeenCalledWith('signal:embedding:test-activity-miss');
      expect(mockRedisClient.setex).toHaveBeenCalledTimes(1);
    });

    it('should handle different activity IDs independently', async () => {
      const text = 'Same text for different activities';
      
      const result1 = await embeddingService.generateEmbeddingWithCache('activity-1', text);
      const result2 = await embeddingService.generateEmbeddingWithCache('activity-2', text);
      
      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(false);
      expect(mockRedisClient.setex).toHaveBeenCalledTimes(2);
      
      // Verify different cache keys
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'signal:embedding:activity-1',
        expect.any(Number),
        expect.any(String)
      );
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'signal:embedding:activity-2',
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('Cache Data Validation', () => {
    it('should invalidate and regenerate for corrupted cache data', async () => {
      const activityId = 'test-activity-corrupt';
      const text = 'Test text for corruption';
      
      // Mock corrupted cache data
      (mockRedisClient.get as jest.Mock).mockResolvedValueOnce('invalid-json');
      
      const result = await embeddingService.generateEmbeddingWithCache(activityId, text);
      
      expect(result.fromCache).toBe(false);
      expect(result.embedding).toHaveLength(384);
      // Should not call del for JSON parse errors (handled gracefully)
    });

    it('should invalidate cache for invalid embedding data', async () => {
      const activityId = 'test-activity-invalid';
      
      // Mock invalid cached embedding
      const invalidCacheEntry = JSON.stringify({
        embedding: 'not-an-array',
        cachedAt: Date.now(),
        textHash: 'test-hash'
      });
      (mockRedisClient.get as jest.Mock).mockResolvedValueOnce(invalidCacheEntry);
      
      const result = await embeddingService.getCachedEmbedding(activityId);
      
      expect(result).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledWith('signal:embedding:test-activity-invalid');
    });
  });

  describe('Cache Error Handling', () => {
    it('should handle Redis get errors gracefully', async () => {
      const activityId = 'test-activity-get-error';
      
      (mockRedisClient.get as jest.Mock).mockRejectedValueOnce(new Error('Redis connection error'));
      
      const result = await embeddingService.getCachedEmbedding(activityId);
      
      expect(result).toBeNull();
    });

    it('should handle Redis set errors gracefully without throwing', async () => {
      const activityId = 'test-activity-set-error';
      const embedding = new Array(384).fill(0.5);
      const textHash = 'test-hash';
      
      (mockRedisClient.setex as jest.Mock).mockRejectedValueOnce(new Error('Redis write error'));
      
      // Should not throw
      await expect(embeddingService.cacheEmbedding(activityId, embedding, textHash))
        .resolves.not.toThrow();
    });

    it('should continue working when caching fails during generation', async () => {
      const activityId = 'test-activity-cache-fail';
      const text = 'Test text for cache failure';
      
      (mockRedisClient.get as jest.Mock).mockResolvedValueOnce(null); // Cache miss
      (mockRedisClient.setex as jest.Mock).mockRejectedValueOnce(new Error('Cache write failed'));
      
      const result = await embeddingService.generateEmbeddingWithCache(activityId, text);
      
      expect(result.fromCache).toBe(false);
      expect(result.embedding).toHaveLength(384);
      // Should still return valid result even if caching failed
    });
  });

  describe('Cache Entry Structure', () => {
    it('should store embedding with metadata in cache', async () => {
      const activityId = 'test-activity-metadata';
      const text = 'Test text for metadata';
      
      await embeddingService.generateEmbeddingWithCache(activityId, text);
      
      const cacheCall = (mockRedisClient.setex as jest.Mock).mock.calls[0];
      const cachedData = JSON.parse(cacheCall[2]);
      
      expect(cachedData).toHaveProperty('embedding');
      expect(cachedData).toHaveProperty('cachedAt');
      expect(cachedData).toHaveProperty('textHash');
      expect(Array.isArray(cachedData.embedding)).toBe(true);
      expect(cachedData.embedding).toHaveLength(384);
      expect(typeof cachedData.cachedAt).toBe('number');
      expect(typeof cachedData.textHash).toBe('string');
    });
  });
});