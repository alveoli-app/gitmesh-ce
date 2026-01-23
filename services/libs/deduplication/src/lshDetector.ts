import { RedisClient } from '@gitmesh/redis';
import { Logger } from '@gitmesh/logging';
import { ILSHDetector, DuplicateDetectionResult } from './types';

/**
 * LSH-based duplicate detector
 * Uses Redis for signature storage and Hamming distance for similarity
 */
export class LSHDetector implements ILSHDetector {
  private readonly redisClient: RedisClient;
  private readonly logger: Logger;
  private readonly keyPrefix: string;

  constructor(
    redisClient: RedisClient,
    logger: Logger,
    keyPrefix: string = 'signal:minhash'
  ) {
    this.redisClient = redisClient;
    this.logger = logger;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Calculate Hamming distance between two hex signatures
   * @param signature1 - First signature (hex string)
   * @param signature2 - Second signature (hex string)
   * @returns Hamming distance (number of differing bits)
   */
  calculateHammingDistance(signature1: string, signature2: string): number {
    if (signature1.length !== signature2.length) {
      throw new Error('Signatures must have the same length');
    }

    let distance = 0;
    
    // Compare hex characters and count differing bits
    for (let i = 0; i < signature1.length; i++) {
      const hex1 = parseInt(signature1[i], 16);
      const hex2 = parseInt(signature2[i], 16);
      
      // XOR to find differing bits, then count them
      const xor = hex1 ^ hex2;
      distance += this.countBits(xor);
    }

    return distance;
  }

  /**
   * Find candidate duplicates using LSH
   * Searches Redis for signatures within Hamming distance threshold
   * @param signature - Signature to find duplicates for
   * @param threshold - Hamming distance threshold
   * @returns Promise resolving to array of candidate activity IDs with distances
   */
  async findCandidates(
    signature: string,
    threshold: number
  ): Promise<Array<{ activityId: string; distance: number }>> {
    const startTime = Date.now();
    const candidates: Array<{ activityId: string; distance: number }> = [];

    try {
      // Get all signatures from Redis
      // In a production system, this could be optimized with LSH buckets
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redisClient.keys(pattern);

      this.logger.debug('LSH candidate search', {
        signature,
        threshold,
        totalSignatures: keys.length,
        pattern
      });

      // Check each signature for similarity
      for (const key of keys) {
        const storedData = await this.redisClient.get(key);
        if (!storedData) continue;

        try {
          const data = JSON.parse(storedData);
          const storedSignature = data.signature;
          const activityId = data.activityId;

          // Skip self-comparison
          if (activityId && storedSignature) {
            const distance = this.calculateHammingDistance(signature, storedSignature);
            
            if (distance <= threshold) {
              candidates.push({ activityId, distance });
            }
          }
        } catch (parseError) {
          this.logger.warn('Failed to parse stored signature data', {
            key,
            error: parseError instanceof Error ? parseError.message : 'Unknown error'
          });
        }
      }

      // Sort by distance (closest first)
      candidates.sort((a, b) => a.distance - b.distance);

      const processingTimeMs = Date.now() - startTime;
      
      this.logger.debug('LSH candidate search completed', {
        signature,
        threshold,
        candidatesFound: candidates.length,
        processingTimeMs
      });

      return candidates;

    } catch (error) {
      this.logger.error('LSH candidate search failed', {
        signature,
        threshold,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Index signature for future duplicate detection
   * Stores signature in Redis with activity ID association
   * @param signature - Signature to index
   * @param activityId - Activity ID to associate with signature
   * @returns Promise resolving when indexing is complete
   */
  async indexSignature(signature: string, activityId: string): Promise<void> {
    try {
      const key = `${this.keyPrefix}:${signature}`;
      const data = {
        signature,
        activityId,
        indexedAt: Date.now()
      };

      await this.redisClient.set(key, JSON.stringify(data));

      this.logger.debug('Signature indexed', {
        signature,
        activityId,
        key
      });

    } catch (error) {
      this.logger.error('Failed to index signature', {
        signature,
        activityId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find duplicates and return formatted result
   * @param signature - Signature to find duplicates for
   * @param threshold - Hamming distance threshold
   * @returns Promise resolving to duplicate detection result
   */
  async findDuplicates(signature: string, threshold: number): Promise<DuplicateDetectionResult> {
    const startTime = Date.now();

    try {
      const candidates = await this.findCandidates(signature, threshold);
      
      const duplicateIds = candidates.map(c => c.activityId);
      const distances = candidates.map(c => c.distance);
      const hasDuplicates = candidates.length > 0;
      const processingTimeMs = Date.now() - startTime;

      return {
        duplicateIds,
        distances,
        hasDuplicates,
        processingTimeMs
      };

    } catch (error) {
      this.logger.error('Duplicate detection failed', {
        signature,
        threshold,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return empty result on error
      return {
        duplicateIds: [],
        distances: [],
        hasDuplicates: false,
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Set TTL for signature cache entries
   * @param signature - Signature to set TTL for
   * @param ttlSeconds - TTL in seconds
   * @returns Promise resolving when TTL is set
   */
  async setSignatureTTL(signature: string, ttlSeconds: number): Promise<void> {
    try {
      const key = `${this.keyPrefix}:${signature}`;
      await this.redisClient.expire(key, ttlSeconds);

      this.logger.debug('Signature TTL set', {
        signature,
        ttlSeconds,
        key
      });

    } catch (error) {
      this.logger.error('Failed to set signature TTL', {
        signature,
        ttlSeconds,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Remove signature from index
   * @param signature - Signature to remove
   * @returns Promise resolving when signature is removed
   */
  async removeSignature(signature: string): Promise<void> {
    try {
      const key = `${this.keyPrefix}:${signature}`;
      await this.redisClient.del(key);

      this.logger.debug('Signature removed', {
        signature,
        key
      });

    } catch (error) {
      this.logger.error('Failed to remove signature', {
        signature,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Count number of set bits in a number
   * @param n - Number to count bits in
   * @returns Number of set bits
   */
  private countBits(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }
}