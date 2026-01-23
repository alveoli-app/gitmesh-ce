import { createHash } from 'crypto';
import { getServiceChildLogger } from '@gitmesh/logging';
import { RedisClient } from '@gitmesh/redis';
import {
  IEmbeddingService,
  EmbeddingConfig,
  EmbeddingResult,
  QuantizedEmbeddingResult,
  EmbeddingCacheEntry,
} from './types';
import { PythonEmbeddingWorker } from './pythonWorker';

/**
 * Default configuration for embedding service
 */
const DEFAULT_CONFIG: EmbeddingConfig = {
  modelName: 'all-MiniLM-L6-v2',
  cacheTtlSeconds: 7 * 24 * 60 * 60, // 7 days
  cacheKeyPrefix: 'signal:embedding',
  pythonWorkerTimeoutMs: 30000,
  maxTextLength: 10000,
  quantizedDimensions: 96,
  originalDimensions: 384,
};

/**
 * Embedding service implementation
 */
export class EmbeddingService implements IEmbeddingService {
  private logger: ReturnType<typeof getServiceChildLogger>;
  private config: EmbeddingConfig;
  private redisClient: RedisClient;
  private pythonWorker: PythonEmbeddingWorker;

  constructor(
    redisClient: RedisClient,
    config: Partial<EmbeddingConfig> = {}
  ) {
    this.logger = getServiceChildLogger('EmbeddingService');
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.redisClient = redisClient;
    this.pythonWorker = new PythonEmbeddingWorker(this.config.pythonWorkerTimeoutMs);

    this.logger.info('EmbeddingService initialized', {
      modelName: this.config.modelName,
      cacheTtlSeconds: this.config.cacheTtlSeconds,
      quantizedDimensions: this.config.quantizedDimensions,
    });
  }

  /**
   * Generate embedding for text content
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();

    try {
      // Validate and clean text
      const cleanText = this.preprocessText(text);
      
      // Generate embedding using Python worker
      const embedding = await this.pythonWorker.generateEmbedding(
        cleanText,
        this.config.modelName
      );

      const processingTime = Date.now() - startTime;

      this.logger.debug('Embedding generated', {
        textLength: cleanText.length,
        embeddingDimensions: embedding.length,
        processingTimeMs: processingTime,
      });

      return {
        embedding,
        fromCache: false,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Failed to generate embedding', {
        error: error.message,
        textLength: text?.length || 0,
        processingTimeMs: processingTime,
      });
      throw error;
    }
  }

  /**
   * Quantize embedding from 384 to 96 dimensions
   */
  async quantizeEmbedding(embedding: number[]): Promise<QuantizedEmbeddingResult> {
    try {
      // Validate embedding
      if (!Array.isArray(embedding) || embedding.length !== this.config.originalDimensions) {
        throw new Error(
          `Invalid embedding dimensions: expected ${this.config.originalDimensions}, got ${embedding?.length || 'undefined'}`
        );
      }

      const quantizedEmbedding = await this.pythonWorker.quantizeEmbedding(
        embedding,
        this.config.quantizedDimensions
      );

      return {
        quantizedEmbedding,
        originalDimensions: this.config.originalDimensions,
        quantizedDimensions: this.config.quantizedDimensions,
      };
    } catch (error) {
      this.logger.error('Failed to quantize embedding', {
        error: error.message,
        embeddingLength: embedding?.length || 0,
      });
      throw error;
    }
  }

  /**
   * Get cached embedding for activity
   */
  async getCachedEmbedding(activityId: string): Promise<number[] | null> {
    try {
      const cacheKey = this.getCacheKey(activityId);
      const cachedData = await this.redisClient.get(cacheKey);

      if (!cachedData) {
        this.logger.debug('Cache miss for embedding', { activityId });
        return null;
      }

      const cacheEntry: EmbeddingCacheEntry = JSON.parse(cachedData);
      
      // Validate cache entry
      if (!cacheEntry.embedding || !Array.isArray(cacheEntry.embedding)) {
        this.logger.warn('Invalid cached embedding data', { activityId });
        await this.redisClient.del(cacheKey);
        return null;
      }

      this.logger.debug('Cache hit for embedding', {
        activityId,
        embeddingDimensions: cacheEntry.embedding.length,
        cachedAt: new Date(cacheEntry.cachedAt).toISOString(),
      });

      return cacheEntry.embedding;
    } catch (error) {
      this.logger.error('Failed to get cached embedding', {
        error: error.message,
        activityId,
      });
      return null;
    }
  }

  /**
   * Cache embedding for activity
   */
  async cacheEmbedding(
    activityId: string,
    embedding: number[],
    textHash: string
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(activityId);
      const cacheEntry: EmbeddingCacheEntry = {
        embedding,
        cachedAt: Date.now(),
        textHash,
      };

      await this.redisClient.setex(
        cacheKey,
        this.config.cacheTtlSeconds,
        JSON.stringify(cacheEntry)
      );

      this.logger.debug('Embedding cached', {
        activityId,
        embeddingDimensions: embedding.length,
        ttlSeconds: this.config.cacheTtlSeconds,
      });
    } catch (error) {
      this.logger.error('Failed to cache embedding', {
        error: error.message,
        activityId,
        embeddingLength: embedding?.length || 0,
      });
      // Don't throw error for caching failures
    }
  }

  /**
   * Generate embedding with caching
   */
  async generateEmbeddingWithCache(
    activityId: string,
    text: string
  ): Promise<EmbeddingResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cachedEmbedding = await this.getCachedEmbedding(activityId);
      
      if (cachedEmbedding) {
        const processingTime = Date.now() - startTime;
        return {
          embedding: cachedEmbedding,
          fromCache: true,
          processingTimeMs: processingTime,
        };
      }

      // Generate new embedding
      const result = await this.generateEmbedding(text);
      
      // Cache the result
      const textHash = this.hashText(text);
      await this.cacheEmbedding(activityId, result.embedding, textHash);

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Failed to generate embedding with cache', {
        error: error.message,
        activityId,
        textLength: text?.length || 0,
        processingTimeMs: processingTime,
      });
      throw error;
    }
  }

  /**
   * Preprocess text for embedding generation
   */
  private preprocessText(text: string): string {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Trim whitespace
    let cleanText = text.trim();

    if (cleanText.length === 0) {
      throw new Error('Text cannot be empty after preprocessing');
    }

    // Truncate if too long
    if (cleanText.length > this.config.maxTextLength) {
      cleanText = cleanText.substring(0, this.config.maxTextLength);
      this.logger.debug('Text truncated for embedding generation', {
        originalLength: text.length,
        truncatedLength: cleanText.length,
      });
    }

    return cleanText;
  }

  /**
   * Generate cache key for activity
   */
  private getCacheKey(activityId: string): string {
    return `${this.config.cacheKeyPrefix}:${activityId}`;
  }

  /**
   * Generate hash for text content
   */
  private hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }
}