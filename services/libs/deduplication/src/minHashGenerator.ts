import { createHash } from 'crypto';
import { IMinHashGenerator, SignatureResult } from './types';

/**
 * MinHash signature generator
 * Implements configurable n-gram shingle generation and MinHash signature computation
 */
export class MinHashGenerator implements IMinHashGenerator {
  /**
   * Generate n-gram shingles from text
   * @param text - Text to generate shingles from
   * @param shingleSize - Size of n-grams (default 3)
   * @returns Array of shingle strings
   */
  generateShingles(text: string, shingleSize: number = 3): string[] {
    const normalizedText = this.normalizeText(text);
    const words = normalizedText.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length < shingleSize) {
      // If text is too short, return the entire text as a single shingle
      return [words.join(' ')];
    }

    const shingles: string[] = [];
    for (let i = 0; i <= words.length - shingleSize; i++) {
      const shingle = words.slice(i, i + shingleSize).join(' ');
      shingles.push(shingle);
    }

    // Remove duplicates while preserving order
    return [...new Set(shingles)];
  }

  /**
   * Normalize text for consistent processing
   * - Convert to lowercase
   * - Normalize whitespace (multiple spaces to single space)
   * - Remove leading/trailing whitespace
   * - Remove special characters that don't contribute to content meaning
   * @param text - Text to normalize
   * @returns Normalized text
   */
  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // Multiple whitespace to single space
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Clean up multiple spaces again
      .trim();
  }

  /**
   * Compute MinHash signature from shingles
   * Uses multiple hash functions to create a signature
   * @param shingles - Array of shingle strings
   * @param signatureBits - Number of bits in signature (default 64)
   * @returns MinHash signature as hex string
   */
  computeMinHashSignature(shingles: string[], signatureBits: number = 64): string {
    if (shingles.length === 0) {
      // Return zero signature for empty input
      return '0'.repeat(signatureBits / 4); // Each hex char represents 4 bits
    }

    const signature: number[] = new Array(signatureBits).fill(Number.MAX_SAFE_INTEGER);

    // Generate hash functions using different seeds
    for (const shingle of shingles) {
      for (let i = 0; i < signatureBits; i++) {
        // Create hash function with seed i
        const hash = this.hashWithSeed(shingle, i);
        signature[i] = Math.min(signature[i], hash);
      }
    }

    // Convert signature to binary then to hex
    const binarySignature = signature.map(val => (val % 2).toString()).join('');
    return this.binaryToHex(binarySignature);
  }

  /**
   * Generate MinHash signature with timing and metadata
   * @param text - Text to generate signature for
   * @param shingleSize - Size of n-grams
   * @param signatureBits - Number of bits in signature
   * @param maxTextLength - Maximum text length (truncate if longer)
   * @returns Signature result with metadata
   */
  generateSignature(
    text: string,
    shingleSize: number = 3,
    signatureBits: number = 64,
    maxTextLength: number = 10000
  ): SignatureResult {
    const startTime = Date.now();
    
    // Truncate text if too long
    const wasTruncated = text.length > maxTextLength;
    const processedText = wasTruncated ? text.substring(0, maxTextLength) : text;
    
    // Generate shingles and signature
    const shingles = this.generateShingles(processedText, shingleSize);
    const signature = this.computeMinHashSignature(shingles, signatureBits);
    
    const processingTimeMs = Date.now() - startTime;

    return {
      signature,
      shingleCount: shingles.length,
      processingTimeMs,
      wasTruncated
    };
  }

  /**
   * Hash string with seed for different hash functions
   * @param input - String to hash
   * @param seed - Seed for hash function
   * @returns Hash value as number
   */
  private hashWithSeed(input: string, seed: number): number {
    const seedStr = seed.toString();
    const hash = createHash('sha256');
    hash.update(seedStr + input);
    const hexHash = hash.digest('hex');
    
    // Convert first 8 hex characters to number
    return parseInt(hexHash.substring(0, 8), 16);
  }

  /**
   * Convert binary string to hex string
   * @param binary - Binary string
   * @returns Hex string
   */
  private binaryToHex(binary: string): string {
    // Pad to multiple of 4 bits
    const paddedBinary = binary.padEnd(Math.ceil(binary.length / 4) * 4, '0');
    
    let hex = '';
    for (let i = 0; i < paddedBinary.length; i += 4) {
      const fourBits = paddedBinary.substring(i, i + 4);
      const hexDigit = parseInt(fourBits, 2).toString(16);
      hex += hexDigit;
    }
    
    return hex;
  }
}