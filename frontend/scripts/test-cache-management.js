#!/usr/bin/env node

/**
 * Cache Management Test Suite
 * 
 * This script tests the cache validation and recovery functionality
 * to ensure it properly handles cache integrity, selective rebuilding,
 * and invalidation loop prevention.
 */

const fs = require('fs');
const path = require('path');
const CacheManager = require('./cache-manager');

const CACHE_DIR = path.join(__dirname, '../node_modules/.vite-cache');
const TEST_CACHE_DIR = path.join(__dirname, '../test-cache');

class CacheManagementTester {
  constructor() {
    this.testResults = [];
    this.originalCacheDir = CACHE_DIR;
  }

  /**
   * Setup test environment
   */
  setup() {
    console.log('🔧 Setting up test environment...\n');
    
    // Create test cache directory
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
    
    // Create some test cache files
    this.createTestCacheFiles();
  }

  /**
   * Create test cache files for validation
   */
  createTestCacheFiles() {
    const testFiles = [
      { name: 'vue.js', content: 'console.log("Vue cached");' },
      { name: 'element-plus.js', content: 'console.log("Element Plus cached");' },
      { name: 'axios.js', content: 'console.log("Axios cached");' },
      { name: 'corrupted.js', content: 'invalid javascript content {{{' },
    ];

    testFiles.forEach(file => {
      const filePath = path.join(TEST_CACHE_DIR, file.name);
      fs.writeFileSync(filePath, file.content);
    });

    console.log(`📁 Created ${testFiles.length} test cache files`);
  }

  /**
   * Test cache directory validation
   */
  testCacheDirectoryValidation() {
    console.log('🧪 Testing cache directory validation...');
    
    const cacheManager = new CacheManager();
    
    // Test with existing directory
    const result1 = cacheManager.validateCacheDirectory();
    this.assert(
      result1.state === 'valid',
      'Cache directory validation should pass for existing directory',
      result1
    );

    // Test with non-existent directory
    const tempCacheDir = path.join(__dirname, '../non-existent-cache');
    const cacheManagerWithTempDir = new CacheManager({ cacheDir: tempCacheDir });
    
    const result2 = cacheManagerWithTempDir.validateCacheDirectory();
    this.assert(
      result2.state === 'missing',
      'Cache directory validation should fail for non-existent directory',
      result2
    );

    console.log('✅ Cache directory validation tests passed\n');
  }

  /**
   * Test cache chunk validation
   */
  testCacheChunkValidation() {
    console.log('🧪 Testing cache chunk validation...');
    
    const cacheManager = new CacheManager({ cacheDir: TEST_CACHE_DIR });

    const results = cacheManager.validateCacheChunks();
    
    this.assert(
      results.valid.length > 0,
      'Should find valid cache chunks',
      results
    );

    this.assert(
      results.corrupted.includes('corrupted.js'),
      'Should detect corrupted chunks',
      results
    );

    console.log('✅ Cache chunk validation tests passed\n');
  }

  /**
   * Test dependency pre-bundling validation
   */
  testDependencyValidation() {
    console.log('🧪 Testing dependency pre-bundling validation...');
    
    const cacheManager = new CacheManager({ cacheDir: TEST_CACHE_DIR });

    const results = cacheManager.validatePreBundledDependencies();
    
    this.assert(
      Array.isArray(results.present),
      'Should return array of present dependencies',
      results
    );

    this.assert(
      Array.isArray(results.missing),
      'Should return array of missing dependencies',
      results
    );

    console.log('✅ Dependency validation tests passed\n');
  }

  /**
   * Test invalidation loop detection
   */
  testInvalidationLoopDetection() {
    console.log('🧪 Testing invalidation loop detection...');
    
    const cacheManager = new CacheManager();
    
    // Simulate multiple invalidations
    cacheManager.metadata.invalidationCount = 5;
    cacheManager.metadata.lastInvalidation = Date.now() - 60000; // 1 minute ago
    
    const result1 = cacheManager.checkInvalidationLoops();
    this.assert(
      result1.hasLoop === true,
      'Should detect invalidation loop with high count',
      result1
    );

    // Test normal case
    cacheManager.metadata.invalidationCount = 1;
    cacheManager.metadata.lastInvalidation = Date.now() - 600000; // 10 minutes ago
    
    const result2 = cacheManager.checkInvalidationLoops();
    this.assert(
      result2.hasLoop === false,
      'Should not detect loop with low count and old timestamp',
      result2
    );

    console.log('✅ Invalidation loop detection tests passed\n');
  }

  /**
   * Test selective cache rebuilding
   */
  async testSelectiveCacheRebuilding() {
    console.log('🧪 Testing selective cache rebuilding...');
    
    const cacheManager = new CacheManager({ cacheDir: TEST_CACHE_DIR });

    const corruptedChunks = ['corrupted.js'];
    const missingChunks = ['missing.js'];
    
    const result = await cacheManager.rebuildCorruptedChunks(corruptedChunks, missingChunks);
    
    this.assert(
      result.success === true,
      'Selective rebuilding should succeed',
      result
    );

    this.assert(
      result.rebuiltChunks.length === 2,
      'Should report correct number of rebuilt chunks',
      result
    );

    // Verify corrupted file was removed
    const corruptedPath = path.join(TEST_CACHE_DIR, 'corrupted.js');
    this.assert(
      !fs.existsSync(corruptedPath),
      'Corrupted file should be removed',
      { exists: fs.existsSync(corruptedPath) }
    );

    console.log('✅ Selective cache rebuilding tests passed\n');
  }

  /**
   * Test invalidation loop prevention
   */
  testInvalidationLoopPrevention() {
    console.log('🧪 Testing invalidation loop prevention...');
    
    const cacheManager = new CacheManager();
    
    // Simulate invalidation loop condition
    cacheManager.metadata.invalidationCount = 4;
    cacheManager.metadata.lastInvalidation = Date.now() - 30000; // 30 seconds ago
    
    const result = cacheManager.preventInvalidationLoops();
    
    this.assert(
      result.prevented === true,
      'Should prevent invalidation loops when detected',
      result
    );

    this.assert(
      typeof result.backoffTime === 'number' && result.backoffTime > 0,
      'Should apply backoff time',
      result
    );

    // Verify metadata was reset
    this.assert(
      cacheManager.metadata.invalidationCount === 0,
      'Should reset invalidation count after prevention',
      { count: cacheManager.metadata.invalidationCount }
    );

    console.log('✅ Invalidation loop prevention tests passed\n');
  }

  /**
   * Test comprehensive cache validation workflow
   */
  async testComprehensiveValidation() {
    console.log('🧪 Testing comprehensive cache validation workflow...');
    
    const cacheManager = new CacheManager({ cacheDir: TEST_CACHE_DIR });

    const result = await cacheManager.run({
      validate: true,
      rebuild: true,
      preventLoops: true
    });
    
    this.assert(
      result.success === true,
      'Comprehensive validation should succeed',
      result
    );

    this.assert(
      result.validationResults !== null,
      'Should return validation results',
      result
    );

    console.log('✅ Comprehensive validation tests passed\n');
  }

  /**
   * Assert helper for test validation
   */
  assert(condition, message, data = null) {
    const result = {
      passed: condition,
      message,
      data
    };
    
    this.testResults.push(result);
    
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      if (data) {
        console.error('   Data:', JSON.stringify(data, null, 2));
      }
      throw new Error(`Test assertion failed: ${message}`);
    }
  }

  /**
   * Cleanup test environment
   */
  cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
    
    console.log('✅ Cleanup completed\n');
  }

  /**
   * Generate test report
   */
  generateReport() {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log('📊 Test Report');
    console.log('==============');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Cache management is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }
    
    return {
      passed,
      total,
      successRate: (passed / total) * 100,
      allPassed: passed === total
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Cache Management Test Suite\n');
    
    try {
      this.setup();
      
      // Run individual tests
      this.testCacheDirectoryValidation();
      this.testCacheChunkValidation();
      this.testDependencyValidation();
      this.testInvalidationLoopDetection();
      await this.testSelectiveCacheRebuilding();
      this.testInvalidationLoopPrevention();
      await this.testComprehensiveValidation();
      
      const report = this.generateReport();
      
      this.cleanup();
      
      return report;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.cleanup();
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CacheManagementTester();
  tester.runAllTests()
    .then(report => {
      process.exit(report.allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite error:', error.message);
      process.exit(1);
    });
}

module.exports = CacheManagementTester;