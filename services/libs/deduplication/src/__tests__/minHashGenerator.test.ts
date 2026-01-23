import { MinHashGenerator } from '../minHashGenerator';

describe('MinHashGenerator', () => {
  let generator: MinHashGenerator;

  beforeEach(() => {
    generator = new MinHashGenerator();
  });

  describe('normalizeText', () => {
    it('should normalize text correctly', () => {
      const input = '  Hello,   World!  How are you?  ';
      const expected = 'hello world how are you';
      const result = generator.normalizeText(input);
      expect(result).toBe(expected);
    });

    it('should handle empty text', () => {
      const result = generator.normalizeText('');
      expect(result).toBe('');
    });
  });

  describe('generateShingles', () => {
    it('should generate 3-gram shingles correctly', () => {
      const text = 'hello world how are you';
      const shingles = generator.generateShingles(text, 3);
      
      expect(shingles).toContain('hello world how');
      expect(shingles).toContain('world how are');
      expect(shingles).toContain('how are you');
      expect(shingles).toHaveLength(3);
    });

    it('should handle text shorter than shingle size', () => {
      const text = 'hello world';
      const shingles = generator.generateShingles(text, 3);
      
      expect(shingles).toEqual(['hello world']);
    });

    it('should remove duplicate shingles', () => {
      const text = 'hello hello hello world';
      const shingles = generator.generateShingles(text, 2);
      
      // Should not have duplicate 'hello hello'
      const helloHelloCount = shingles.filter(s => s === 'hello hello').length;
      expect(helloHelloCount).toBe(1);
    });
  });

  describe('computeMinHashSignature', () => {
    it('should generate consistent signatures for same input', () => {
      const shingles = ['hello world', 'world how', 'how are'];
      const signature1 = generator.computeMinHashSignature(shingles, 64);
      const signature2 = generator.computeMinHashSignature(shingles, 64);
      
      expect(signature1).toBe(signature2);
      expect(signature1).toHaveLength(16); // 64 bits = 16 hex chars
    });

    it('should generate different signatures for different inputs', () => {
      const shingles1 = ['hello world', 'world how'];
      const shingles2 = ['goodbye world', 'world how'];
      
      const signature1 = generator.computeMinHashSignature(shingles1, 64);
      const signature2 = generator.computeMinHashSignature(shingles2, 64);
      
      expect(signature1).not.toBe(signature2);
    });

    it('should handle empty shingles', () => {
      const signature = generator.computeMinHashSignature([], 64);
      expect(signature).toBe('0000000000000000');
    });
  });

  describe('generateSignature', () => {
    it('should generate signature with metadata', () => {
      const text = 'This is a test document for signature generation';
      const result = generator.generateSignature(text, 3, 64, 1000);
      
      expect(result.signature).toBeDefined();
      expect(result.signature).toHaveLength(16);
      expect(result.shingleCount).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.wasTruncated).toBe(false);
    });

    it('should truncate long text', () => {
      const longText = 'a'.repeat(2000);
      const result = generator.generateSignature(longText, 3, 64, 1000);
      
      expect(result.wasTruncated).toBe(true);
    });
  });
});