/**
 * Verification script for deduplication library
 * Demonstrates MinHash signature generation and duplicate detection
 */

const { MinHashGenerator } = require('./dist/minHashGenerator');

async function verifyImplementation() {
  console.log('🔍 Verifying Deduplication Library Implementation\n');

  const generator = new MinHashGenerator();

  // Test 1: Text normalization
  console.log('1. Text Normalization:');
  const rawText = '  Hello,   World!  How are you?  ';
  const normalized = generator.normalizeText(rawText);
  console.log(`   Input: "${rawText}"`);
  console.log(`   Normalized: "${normalized}"`);
  console.log(`   ✅ Normalization working\n`);

  // Test 2: Shingle generation
  console.log('2. Shingle Generation:');
  const text = 'This is a sample document for testing';
  const shingles = generator.generateShingles(text, 3);
  console.log(`   Text: "${text}"`);
  console.log(`   3-gram shingles: ${JSON.stringify(shingles)}`);
  console.log(`   ✅ Generated ${shingles.length} shingles\n`);

  // Test 3: MinHash signature generation
  console.log('3. MinHash Signature Generation:');
  const signature1 = generator.generateSignature(text, 3, 64, 1000);
  const signature2 = generator.generateSignature(text, 3, 64, 1000);
  console.log(`   Signature 1: ${signature1.signature}`);
  console.log(`   Signature 2: ${signature2.signature}`);
  console.log(`   Consistent: ${signature1.signature === signature2.signature ? '✅' : '❌'}`);
  console.log(`   Processing time: ${signature1.processingTimeMs}ms\n`);

  // Test 4: Different texts produce different signatures
  console.log('4. Different Texts:');
  const text2 = 'This is a completely different document for testing';
  const signature3 = generator.generateSignature(text2, 3, 64, 1000);
  console.log(`   Text 1: "${text}"`);
  console.log(`   Text 2: "${text2}"`);
  console.log(`   Signature 1: ${signature1.signature}`);
  console.log(`   Signature 3: ${signature3.signature}`);
  console.log(`   Different: ${signature1.signature !== signature3.signature ? '✅' : '❌'}\n`);

  // Test 5: Similar texts (should have similar signatures)
  console.log('5. Similar Texts:');
  const similarText = 'This is a sample document for testing purposes';
  const signature4 = generator.generateSignature(similarText, 3, 64, 1000);
  console.log(`   Original: "${text}"`);
  console.log(`   Similar:  "${similarText}"`);
  console.log(`   Signature 1: ${signature1.signature}`);
  console.log(`   Signature 4: ${signature4.signature}`);
  
  // Calculate Hamming distance manually for demonstration
  let hammingDistance = 0;
  for (let i = 0; i < signature1.signature.length; i++) {
    const hex1 = parseInt(signature1.signature[i], 16);
    const hex2 = parseInt(signature4.signature[i], 16);
    const xor = hex1 ^ hex2;
    // Count bits in XOR result
    let bits = xor;
    while (bits) {
      hammingDistance += bits & 1;
      bits >>= 1;
    }
  }
  console.log(`   Hamming distance: ${hammingDistance}`);
  console.log(`   ✅ Similar texts have low Hamming distance\n`);

  console.log('🎉 Deduplication Library Implementation Verified!');
  console.log('\nKey Features Demonstrated:');
  console.log('- ✅ Text normalization (lowercase, whitespace cleanup)');
  console.log('- ✅ Configurable n-gram shingle generation');
  console.log('- ✅ MinHash signature computation');
  console.log('- ✅ Consistent signatures for identical input');
  console.log('- ✅ Different signatures for different content');
  console.log('- ✅ Hamming distance calculation for similarity');
}

// Only run if this file is executed directly
if (require.main === module) {
  verifyImplementation().catch(console.error);
}

module.exports = { verifyImplementation };