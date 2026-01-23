import { createHash } from 'crypto';
import { RedisClient } from '@gitmesh/redis';
import { Logger } from '@gitmesh/logging';
import {
  IDeduplicationService,
  DeduplicationConfig,
  SignatureResult,
  DuplicateDetectionResult,
  DuplicateMarkingResult,
  SignatureCacheEntry
} from './types';
import { MinHashGenerator } from './minHashGenerator';
import { LSHDetector } from './lshDetector';

/**
 * Main deduplication service
 * Orchestrates MinHash signature generation and LSH duplicate detection
 */
export class DeduplicationService implements IDeduplicationService {
  private readonly config: DeduplicationConfig;
  private readonly redisClient: RedisClient;
  private readonly logger: Logger;
  private readonly minHashGenerator: MinHashGenerator;
  private readonly lshDetector: LSHDetector;

  constructor(
    config: DeduplicationConfig,
    redisClient: RedisClient,
    logger: Logger
  ) {
    this.config = config;
    this.redisClient = redisClient;
    this.logger = logger;
    this.minHashGenerator = new MinHashGenerator();
    this.lshDetector = new LSHDetector(redisClient, logger, config.cacheKeyPrefix);
  }

  /**
   * Compute MinHash signature for text content
   * @param text - Text to generate signature for
   * @returns Promise resolving to signature result
   */
  async computeSignature(text: string): Promise<SignatureResult> {
    try {
      this.logger.debug('Computing MinHash signature', {
        textLength: text.length,
        shingleSize: this.config.shingleSize,
        signatureBits: this.config.signatureBits
      });

      const result = this.minHashGenerator.generateSignature(
        text,
        this.config.shingleSize,
        this.config.signatureBits,
        this.config.maxTextLength
      );

      this.logger.debug('MinHash signature computed', {
        signature: result.signature,
        shingleCount: result.shingleCount,
        processingTimeMs: result.processingTimeMs,
        wasTruncated: result.wasTruncated
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to compute MinHash signature', {
        textLength: text.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find duplicate activities based on MinHash signature
   * @param signature - MinHash signature to search for duplicates
   * @returns Promise resolving to duplicate detection result
   */
  async findDuplicates(signature: string): Promise<DuplicateDetectionResult> {
    try {
      this.logger.debug('Finding duplicates for signature', {
        signature,
        hammingThreshold: this.config.hammingThreshold
      });

      const result = await this.lshDetector.findDuplicates(
        signature,
        this.config.hammingThreshold
      );

      this.logger.debug('Duplicate detection completed', {
        signature,
        duplicatesFound: result.duplicateIds.length,
        hasDuplicates: result.hasDuplicates,
        processingTimeMs: result.processingTimeMs
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to find duplicates', {
        signature,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Mark activity as duplicate of canonical activity
   * @param activityId - Activity ID to mark as duplicate
   * @param canonicalId - Canonical activity ID (original)
   * @returns Promise resolving to duplicate marking result
   */
  async markDuplicate(activityId: string, canonicalId: string): Promise<DuplicateMarkingResult> {
    try {
      this.logger.debug('Marking activity as duplicate', {
        activityId,
        canonicalId
      });

      // Store duplicate relationship in Redis
      const duplicateKey = `${this.config.cacheKeyPrefix}:duplicate:${activityId}`;
      const duplicateData = {
        activityId,
        canonicalId,
        markedAt: Date.now()
      };

      await this.redisClient.set(duplicateKey, JSON.stringify(duplicateData));

      // Set TTL based on configuration
      const ttlSeconds = this.config.cacheTtlDays * 24 * 60 * 60;
      await this.redisClient.expire(duplicateKey, ttlSeconds);

      this.logger.info('Activity marked as duplicate', {
        activityId,
        canonicalId,
        duplicateKey
      });

      return {
        activityId,
        canonicalId,
        success: true
      };

    } catch (error) {
      this.logger.error('Failed to mark activity as duplicate', {
        activityId,
        canonicalId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        activityId,
        canonicalId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update Hamming distance threshold (evolvable parameter)
   * @param newThreshold - New threshold value
   * @returns Promise resolving when threshold is updated
   */
  async updateThreshold(newThreshold: number): Promise<void> {
    try {
      this.logger.info('Updating Hamming distance threshold', {
        oldThreshold: this.config.hammingThreshold,
        newThreshold
      });

      // Update configuration
      this.config.hammingThreshold = newThreshold;

      // Store updated threshold in Redis for persistence
      const thresholdKey = `${this.config.cacheKeyPrefix}:config:threshold`;
      await this.redisClient.set(thresholdKey, newThreshold.toString());

      this.logger.info('Hamming distance threshold updated', {
        newThreshold,
        thresholdKey
      });

    } catch (error) {
      this.logger.error('Failed to update threshold', {
        newThreshold,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Store signature in cache for future duplicate detection
   * @param activityId - Activity ID to associate with signature
   * @param signature - MinHash signature to cache
   * @param textHash - Hash of the original text for validation
   * @returns Promise resolving when caching is complete
   */
  async cacheSignature(activityId: string, signature: string, textHash: string): Promise<void> {
    try {
      this.logger.debug('Caching signature', {
        activityId,
        signature,
        textHash
      });

      // Store signature with activity association
      await this.lshDetector.indexSignature(signature, activityId);

      // Store activity-to-signature mapping
      const activityKey = `${this.config.cacheKeyPrefix}:activity:${activityId}`;
      const cacheEntry: SignatureCacheEntry = {
        signature,
        activityId,
        cachedAt: Date.now(),
        textHash
      };

      await this.redisClient.set(activityKey, JSON.stringify(cacheEntry));

      // Set TTL
      const ttlSeconds = this.config.cacheTtlDays * 24 * 60 * 60;
      await this.redisClient.expire(activityKey, ttlSeconds);
      await this.lshDetector.setSignatureTTL(signature, ttlSeconds);

      this.logger.debug('Signature cached successfully', {
        activityId,
        signature,
        activityKey,
        ttlSeconds
      });

    } catch (error) {
      this.logger.error('Failed to cache signature', {
        activityId,
        signature,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get cached signature for activity
   * @param activityId - Activity ID to get cached signature for
   * @returns Promise resolving to cached signature or null
   */
  async getCachedSignature(activityId: string): Promise<string | null> {
    try {
      const activityKey = `${this.config.cacheKeyPrefix}:activity:${activityId}`;
      const cachedData = await this.redisClient.get(activityKey);

      if (!cachedData) {
        this.logger.debug('No cached signature found', { activityId });
        return null;
      }

      const cacheEntry: SignatureCacheEntry = JSON.parse(cachedData);
      
      this.logger.debug('Cached signature retrieved', {
        activityId,
        signature: cacheEntry.signature,
        cachedAt: cacheEntry.cachedAt
      });

      return cacheEntry.signature;

    } catch (error) {
      this.logger.error('Failed to get cached signature', {
        activityId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Process activity for deduplication (full pipeline)
   * @param activityId - Activity ID to process
   * @param text - Text content to process
   * @returns Promise resolving to duplicate detection result
   */
  async processActivity(activityId: string, text: string): Promise<DuplicateDetectionResult> {
    const startTime = Date.now();

    try {
      this.logger.debug('Processing activity for deduplication', {
        activityId,
        textLength: text.length
      });

      // Check for cached signature first
      let signature = await this.getCachedSignature(activityId);
      
      if (!signature) {
        // Generate new signature
        const signatureResult = await this.computeSignature(text);
        signature = signatureResult.signature;

        // Cache the signature
        const textHash = this.generateTextHash(text);
        await this.cacheSignature(activityId, signature, textHash);
      } else {
        this.logger.debug('Using cached signature', { activityId, signature });
      }

      // Find duplicates
      const duplicateResult = await this.findDuplicates(signature);

      // Filter out self-matches
      const filteredDuplicateIds = duplicateResult.duplicateIds.filter(id => id !== activityId);
      const filteredDistances = duplicateResult.distances.slice(0, filteredDuplicateIds.length);

      const finalResult: DuplicateDetectionResult = {
        duplicateIds: filteredDuplicateIds,
        distances: filteredDistances,
        hasDuplicates: filteredDuplicateIds.length > 0,
        processingTimeMs: Date.now() - startTime
      };

      this.logger.info('Activity deduplication completed', {
        activityId,
        signature,
        duplicatesFound: finalResult.duplicateIds.length,
        processingTimeMs: finalResult.processingTimeMs
      });

      return finalResult;

    } catch (error) {
      this.logger.error('Failed to process activity for deduplication', {
        activityId,
        textLength: text.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate hash of text content for validation
   * @param text - Text to hash
   * @returns SHA-256 hash of text
   */
  private generateTextHash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }
}