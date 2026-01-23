/**
 * Configuration for embedding generation
 */
export interface EmbeddingConfig {
  /** Model name for sentence transformers */
  modelName: string;
  /** Cache TTL in seconds (default 7 days) */
  cacheTtlSeconds: number;
  /** Redis key prefix for embeddings */
  cacheKeyPrefix: string;
  /** Python worker timeout in milliseconds */
  pythonWorkerTimeoutMs: number;
  /** Maximum text length for embedding generation */
  maxTextLength: number;
  /** Target dimensions after quantization */
  quantizedDimensions: number;
  /** Original embedding dimensions */
  originalDimensions: number;
}

/**
 * Embedding generation result
 */
export interface EmbeddingResult {
  /** The generated embedding vector */
  embedding: number[];
  /** Whether the embedding was retrieved from cache */
  fromCache: boolean;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Quantized embedding result
 */
export interface QuantizedEmbeddingResult {
  /** The quantized embedding vector */
  quantizedEmbedding: number[];
  /** Original embedding dimensions */
  originalDimensions: number;
  /** Quantized dimensions */
  quantizedDimensions: number;
}

/**
 * Cache entry for embeddings
 */
export interface EmbeddingCacheEntry {
  /** The embedding vector */
  embedding: number[];
  /** Timestamp when cached */
  cachedAt: number;
  /** Text hash for validation */
  textHash: string;
}

/**
 * Interface for embedding service
 */
export interface IEmbeddingService {
  /**
   * Generate embedding for text content
   * @param text - Text to generate embedding for
   * @returns Promise resolving to embedding result
   */
  generateEmbedding(text: string): Promise<EmbeddingResult>;

  /**
   * Quantize embedding from 384 to 96 dimensions
   * @param embedding - Original 384-dimensional embedding
   * @returns Promise resolving to quantized embedding
   */
  quantizeEmbedding(embedding: number[]): Promise<QuantizedEmbeddingResult>;

  /**
   * Get cached embedding for activity
   * @param activityId - Activity ID to get cached embedding for
   * @returns Promise resolving to cached embedding or null
   */
  getCachedEmbedding(activityId: string): Promise<number[] | null>;

  /**
   * Cache embedding for activity
   * @param activityId - Activity ID to cache embedding for
   * @param embedding - Embedding vector to cache
   * @param textHash - Hash of the text for validation
   * @returns Promise resolving when caching is complete
   */
  cacheEmbedding(
    activityId: string,
    embedding: number[],
    textHash: string
  ): Promise<void>;

  /**
   * Generate embedding with caching
   * @param activityId - Activity ID for caching
   * @param text - Text to generate embedding for
   * @returns Promise resolving to embedding result
   */
  generateEmbeddingWithCache(
    activityId: string,
    text: string
  ): Promise<EmbeddingResult>;
}

/**
 * Python worker interface for embedding generation
 */
export interface IPythonEmbeddingWorker {
  /**
   * Generate embedding using Python sentence transformers
   * @param text - Text to generate embedding for
   * @param modelName - Model name to use
   * @returns Promise resolving to embedding vector
   */
  generateEmbedding(text: string, modelName: string): Promise<number[]>;

  /**
   * Quantize embedding vector
   * @param embedding - Original embedding vector
   * @param targetDimensions - Target dimensions after quantization
   * @returns Promise resolving to quantized embedding
   */
  quantizeEmbedding(
    embedding: number[],
    targetDimensions: number
  ): Promise<number[]>;
}