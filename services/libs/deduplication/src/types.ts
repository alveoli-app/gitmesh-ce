/**
 * Configuration for deduplication service
 */
export interface DeduplicationConfig {
  /** Hamming distance threshold for duplicate detection (learned parameter) */
  hammingThreshold: number;
  /** Number of bits in MinHash signature */
  signatureBits: number;
  /** Size of n-gram shingles for text processing */
  shingleSize: number;
  /** Cache TTL in days for MinHash signatures */
  cacheTtlDays: number;
  /** Redis key prefix for MinHash signatures */
  cacheKeyPrefix: string;
  /** Maximum text length for signature generation */
  maxTextLength: number;
}

/**
 * MinHash signature generation result
 */
export interface SignatureResult {
  /** The generated MinHash signature as hex string */
  signature: string;
  /** Number of shingles generated from text */
  shingleCount: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Whether text was truncated due to length limit */
  wasTruncated: boolean;
}

/**
 * Duplicate detection result
 */
export interface DuplicateDetectionResult {
  /** List of activity IDs that are duplicates */
  duplicateIds: string[];
  /** Hamming distances for each duplicate */
  distances: number[];
  /** Whether any duplicates were found */
  hasDuplicates: boolean;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Duplicate marking result
 */
export interface DuplicateMarkingResult {
  /** Activity ID that was marked as duplicate */
  activityId: string;
  /** Canonical activity ID (original) */
  canonicalId: string;
  /** Whether the marking was successful */
  success: boolean;
  /** Error message if marking failed */
  error?: string;
}

/**
 * Cache entry for MinHash signatures
 */
export interface SignatureCacheEntry {
  /** The MinHash signature */
  signature: string;
  /** Activity ID associated with this signature */
  activityId: string;
  /** Timestamp when cached */
  cachedAt: number;
  /** Text hash for validation */
  textHash: string;
}

/**
 * Interface for deduplication service
 */
export interface IDeduplicationService {
  /**
   * Compute MinHash signature for text content
   * @param text - Text to generate signature for
   * @returns Promise resolving to signature result
   */
  computeSignature(text: string): Promise<SignatureResult>;

  /**
   * Find duplicate activities based on MinHash signature
   * @param signature - MinHash signature to search for duplicates
   * @returns Promise resolving to duplicate detection result
   */
  findDuplicates(signature: string): Promise<DuplicateDetectionResult>;

  /**
   * Mark activity as duplicate of canonical activity
   * @param activityId - Activity ID to mark as duplicate
   * @param canonicalId - Canonical activity ID (original)
   * @returns Promise resolving to duplicate marking result
   */
  markDuplicate(activityId: string, canonicalId: string): Promise<DuplicateMarkingResult>;

  /**
   * Update Hamming distance threshold (evolvable parameter)
   * @param newThreshold - New threshold value
   * @returns Promise resolving when threshold is updated
   */
  updateThreshold(newThreshold: number): Promise<void>;

  /**
   * Store signature in cache for future duplicate detection
   * @param activityId - Activity ID to associate with signature
   * @param signature - MinHash signature to cache
   * @param textHash - Hash of the original text for validation
   * @returns Promise resolving when caching is complete
   */
  cacheSignature(activityId: string, signature: string, textHash: string): Promise<void>;

  /**
   * Get cached signature for activity
   * @param activityId - Activity ID to get cached signature for
   * @returns Promise resolving to cached signature or null
   */
  getCachedSignature(activityId: string): Promise<string | null>;

  /**
   * Process activity for deduplication (full pipeline)
   * @param activityId - Activity ID to process
   * @param text - Text content to process
   * @returns Promise resolving to duplicate detection result
   */
  processActivity(activityId: string, text: string): Promise<DuplicateDetectionResult>;
}

/**
 * Interface for MinHash signature generator
 */
export interface IMinHashGenerator {
  /**
   * Generate n-gram shingles from text
   * @param text - Text to generate shingles from
   * @param shingleSize - Size of n-grams
   * @returns Array of shingle strings
   */
  generateShingles(text: string, shingleSize: number): string[];

  /**
   * Normalize text for consistent processing
   * @param text - Text to normalize
   * @returns Normalized text
   */
  normalizeText(text: string): string;

  /**
   * Compute MinHash signature from shingles
   * @param shingles - Array of shingle strings
   * @param signatureBits - Number of bits in signature
   * @returns MinHash signature as hex string
   */
  computeMinHashSignature(shingles: string[], signatureBits: number): string;
}

/**
 * Interface for LSH duplicate detector
 */
export interface ILSHDetector {
  /**
   * Calculate Hamming distance between two signatures
   * @param signature1 - First signature
   * @param signature2 - Second signature
   * @returns Hamming distance
   */
  calculateHammingDistance(signature1: string, signature2: string): number;

  /**
   * Find candidate duplicates using LSH
   * @param signature - Signature to find duplicates for
   * @param threshold - Hamming distance threshold
   * @returns Promise resolving to array of candidate activity IDs with distances
   */
  findCandidates(signature: string, threshold: number): Promise<Array<{ activityId: string; distance: number }>>;

  /**
   * Index signature for future duplicate detection
   * @param signature - Signature to index
   * @param activityId - Activity ID to associate with signature
   * @returns Promise resolving when indexing is complete
   */
  indexSignature(signature: string, activityId: string): Promise<void>;
}