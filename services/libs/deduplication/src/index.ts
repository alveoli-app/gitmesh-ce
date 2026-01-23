/**
 * @gitmesh/deduplication library
 * 
 * Provides MinHash-based deduplication services for signal intelligence.
 * Uses LSH (Locality-Sensitive Hashing) for efficient duplicate detection.
 */

export * from './types';
export { DeduplicationService } from './deduplicationService';
export { MinHashGenerator } from './minHashGenerator';
export { LSHDetector } from './lshDetector';