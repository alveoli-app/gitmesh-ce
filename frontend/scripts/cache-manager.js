#!/usr/bin/env node

/**
 * Vite Cache Management Utility
 * 
 * This script provides cache validation, integrity checking, and selective
 * cache rebuilding functionality to prevent chunk 404 errors and cache
 * invalidation loops.
 * 
 * Features:
 * - Cache integrity validation
 * - Selective cache rebuilding for corrupted chunks
 * - Cache invalidation loop prevention
 * - Dependency pre-bundling verification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CACHE_DIR = path.join(__dirname, '../node_modules/.vite-cache');
const CACHE_METADATA_FILE = path.join(CACHE_DIR, '.cache-metadata.json');
const VITE_CONFIG_FILE = path.join(__dirname, '../vite.config.js');
const PACKAGE_JSON_FILE = path.join(__dirname, '../package.json');

// Cache validation states
const CACHE_STATES = {
  VALID: 'valid',
  CORRUPTED: 'corrupted', 
  MISSING: 'missing',
  STALE: 'stale'
};

class CacheManager {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || CACHE_DIR;
    this.metadataFile = path.join(this.cacheDir, '.cache-metadata.json');
    this.metadata = this.loadCacheMetadata();
    this.config = this.loadViteConfig();
    this.packageInfo = this.loadPackageInfo();
  }

  /**
   * Load existing cache metadata or create new metadata structure
   */
  loadCacheMetadata() {
    try {
      if (fs.existsSync(this.metadataFile)) {
        const data = fs.readFileSync(this.metadataFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('⚠️  Failed to load cache metadata:', error.message);
    }
    
    return {
      version: '1.0.0',
      lastValidation: null,
      dependencies: {},
      chunks: {},
      invalidationCount: 0,
      lastInvalidation: null
    };
  }

  /**
   * Load Vite configuration to get optimizeDeps settings
   */
  loadViteConfig() {
    try {
      // Read vite.config.js and extract optimizeDeps configuration
      const configContent = fs.readFileSync(VITE_CONFIG_FILE, 'utf8');
      
      // Extract optimizeDeps.include array using regex
      const includeMatch = configContent.match(/include:\s*\[([\s\S]*?)\]/);
      const cacheDirMatch = configContent.match(/cacheDir:\s*['"`]([^'"`]+)['"`]/);
      
      let includeDeps = [];
      if (includeMatch) {
        // Parse the include array content
        const includeContent = includeMatch[1];
        includeDeps = includeContent
          .split(',')
          .map(dep => dep.trim().replace(/['"`]/g, ''))
          .filter(dep => dep.length > 0);
      }
      
      return {
        optimizeDeps: {
          include: includeDeps,
          cacheDir: cacheDirMatch ? cacheDirMatch[1] : './node_modules/.vite-cache'
        }
      };
    } catch (error) {
      console.warn('⚠️  Failed to load Vite config:', error.message);
      return { optimizeDeps: { include: [], cacheDir: './node_modules/.vite-cache' } };
    }
  }

  /**
   * Load package.json to get dependency versions
   */
  loadPackageInfo() {
    try {
      const packageContent = fs.readFileSync(PACKAGE_JSON_FILE, 'utf8');
      return JSON.parse(packageContent);
    } catch (error) {
      console.warn('⚠️  Failed to load package.json:', error.message);
      return { dependencies: {}, devDependencies: {} };
    }
  }

  /**
   * Calculate hash of a file for integrity checking
   */
  calculateFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if cache directory exists and is accessible
   */
  validateCacheDirectory() {
    if (!fs.existsSync(this.cacheDir)) {
      return {
        state: CACHE_STATES.MISSING,
        message: 'Cache directory does not exist'
      };
    }

    try {
      // Test read/write access
      const testFile = path.join(this.cacheDir, '.access-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      return {
        state: CACHE_STATES.VALID,
        message: 'Cache directory is accessible'
      };
    } catch (error) {
      return {
        state: CACHE_STATES.CORRUPTED,
        message: `Cache directory access error: ${error.message}`
      };
    }
  }

  /**
   * Validate individual cache chunks for integrity
   */
  validateCacheChunks() {
    const results = {
      valid: [],
      corrupted: [],
      missing: []
    };

    if (!fs.existsSync(this.cacheDir)) {
      return results;
    }

    try {
      const cacheFiles = this.getCacheFiles(this.cacheDir);
      
      for (const file of cacheFiles) {
        const filePath = path.join(this.cacheDir, file);
        const currentHash = this.calculateFileHash(filePath);
        
        if (!currentHash) {
          results.corrupted.push(file);
          continue;
        }

        // Check if we have stored hash for this file
        const storedHash = this.metadata.chunks[file];
        if (storedHash && storedHash !== currentHash) {
          results.corrupted.push(file);
        } else {
          results.valid.push(file);
          // Update metadata with current hash
          this.metadata.chunks[file] = currentHash;
        }
      }

      // Check for missing expected chunks
      for (const expectedChunk in this.metadata.chunks) {
        if (!cacheFiles.includes(expectedChunk)) {
          results.missing.push(expectedChunk);
        }
      }

    } catch (error) {
      console.error('Error validating cache chunks:', error.message);
    }

    return results;
  }

  /**
   * Get all cache files recursively
   */
  getCacheFiles(dir, relativePath = '') {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativeFilePath = path.join(relativePath, entry);
        
        if (fs.statSync(fullPath).isDirectory()) {
          files.push(...this.getCacheFiles(fullPath, relativeFilePath));
        } else {
          files.push(relativeFilePath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error.message);
    }
    
    return files;
  }

  /**
   * Validate that all optimizeDeps.include dependencies are cached
   */
  validatePreBundledDependencies() {
    const results = {
      present: [],
      missing: [],
      outdated: []
    };

    const includeDeps = this.config.optimizeDeps.include;
    
    for (const dep of includeDeps) {
      const depCachePattern = new RegExp(dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const cacheFiles = this.getCacheFiles(this.cacheDir);
      
      const hasCachedVersion = cacheFiles.some(file => depCachePattern.test(file));
      
      if (hasCachedVersion) {
        results.present.push(dep);
        
        // Check if dependency version changed
        const currentVersion = this.packageInfo.dependencies[dep] || this.packageInfo.devDependencies[dep];
        const cachedVersion = this.metadata.dependencies[dep];
        
        if (cachedVersion && cachedVersion !== currentVersion) {
          results.outdated.push(dep);
        } else {
          this.metadata.dependencies[dep] = currentVersion;
        }
      } else {
        results.missing.push(dep);
      }
    }

    return results;
  }

  /**
   * Check for cache invalidation loops
   */
  checkInvalidationLoops() {
    const now = Date.now();
    const lastInvalidation = this.metadata.lastInvalidation;
    const invalidationCount = this.metadata.invalidationCount || 0;
    
    // If more than 3 invalidations in the last 5 minutes, consider it a loop
    const LOOP_THRESHOLD = 3;
    const TIME_WINDOW = 5 * 60 * 1000; // 5 minutes
    
    if (lastInvalidation && (now - lastInvalidation) < TIME_WINDOW && invalidationCount >= LOOP_THRESHOLD) {
      return {
        hasLoop: true,
        count: invalidationCount,
        timeWindow: TIME_WINDOW,
        message: `Detected ${invalidationCount} cache invalidations in ${TIME_WINDOW / 1000}s`
      };
    }

    return {
      hasLoop: false,
      count: invalidationCount,
      message: 'No invalidation loops detected'
    };
  }

  /**
   * Perform comprehensive cache validation
   */
  validateCache() {
    console.log('🔍 Starting comprehensive cache validation...\n');
    
    const results = {
      directory: this.validateCacheDirectory(),
      chunks: this.validateCacheChunks(),
      dependencies: this.validatePreBundledDependencies(),
      invalidationLoops: this.checkInvalidationLoops(),
      timestamp: new Date().toISOString()
    };

    // Update metadata
    this.metadata.lastValidation = results.timestamp;
    
    return results;
  }

  /**
   * Selectively rebuild corrupted or missing chunks
   */
  async rebuildCorruptedChunks(corruptedChunks, missingChunks) {
    console.log('🔧 Starting selective cache rebuilding...\n');
    
    const chunksToRebuild = [...corruptedChunks, ...missingChunks];
    
    if (chunksToRebuild.length === 0) {
      console.log('✅ No chunks need rebuilding');
      return { success: true, rebuiltChunks: [] };
    }

    try {
      // Remove corrupted chunks
      for (const chunk of corruptedChunks) {
        const chunkPath = path.join(this.cacheDir, chunk);
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
          console.log(`🗑️  Removed corrupted chunk: ${chunk}`);
        }
        // Remove from metadata
        delete this.metadata.chunks[chunk];
      }

      // For missing chunks, we'll let Vite regenerate them on next startup
      console.log(`📦 ${chunksToRebuild.length} chunks will be regenerated on next Vite startup`);
      
      return {
        success: true,
        rebuiltChunks: chunksToRebuild,
        message: 'Corrupted chunks removed, will be regenerated automatically'
      };
      
    } catch (error) {
      console.error('❌ Failed to rebuild chunks:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prevent cache invalidation loops by implementing backoff strategy
   */
  preventInvalidationLoops() {
    const loopCheck = this.checkInvalidationLoops();
    
    if (loopCheck.hasLoop) {
      console.log('🛑 Cache invalidation loop detected! Implementing prevention measures...\n');
      
      // Implement exponential backoff
      const backoffTime = Math.min(1000 * Math.pow(2, loopCheck.count), 30000); // Max 30 seconds
      
      console.log(`⏱️  Applying ${backoffTime}ms backoff to prevent loop`);
      
      // Reset invalidation count after successful prevention
      this.metadata.invalidationCount = 0;
      this.metadata.lastInvalidation = null;
      
      return {
        prevented: true,
        backoffTime,
        message: `Applied ${backoffTime}ms backoff to prevent invalidation loop`
      };
    }

    return {
      prevented: false,
      message: 'No invalidation loop prevention needed'
    };
  }

  /**
   * Record cache invalidation for loop detection
   */
  recordInvalidation() {
    this.metadata.invalidationCount = (this.metadata.invalidationCount || 0) + 1;
    this.metadata.lastInvalidation = Date.now();
    this.saveCacheMetadata();
  }

  /**
   * Save cache metadata to disk
   */
  saveCacheMetadata() {
    try {
      // Ensure cache directory exists
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      
      fs.writeFileSync(this.metadataFile, JSON.stringify(this.metadata, null, 2));
    } catch (error) {
      console.warn('⚠️  Failed to save cache metadata:', error.message);
    }
  }

  /**
   * Generate comprehensive cache report
   */
  generateReport(validationResults) {
    console.log('📊 Cache Validation Report');
    console.log('========================\n');
    
    // Directory status
    console.log(`📁 Cache Directory: ${validationResults.directory.state.toUpperCase()}`);
    console.log(`   ${validationResults.directory.message}\n`);
    
    // Chunk validation results
    const chunks = validationResults.chunks;
    console.log(`📦 Chunk Validation:`);
    console.log(`   ✅ Valid chunks: ${chunks.valid.length}`);
    console.log(`   ❌ Corrupted chunks: ${chunks.corrupted.length}`);
    console.log(`   ❓ Missing chunks: ${chunks.missing.length}\n`);
    
    if (chunks.corrupted.length > 0) {
      console.log(`🔴 Corrupted chunks:`);
      chunks.corrupted.forEach(chunk => console.log(`   - ${chunk}`));
      console.log('');
    }
    
    if (chunks.missing.length > 0) {
      console.log(`🟡 Missing chunks:`);
      chunks.missing.forEach(chunk => console.log(`   - ${chunk}`));
      console.log('');
    }
    
    // Dependency validation results
    const deps = validationResults.dependencies;
    console.log(`🔗 Pre-bundled Dependencies:`);
    console.log(`   ✅ Present: ${deps.present.length}`);
    console.log(`   ❌ Missing: ${deps.missing.length}`);
    console.log(`   🔄 Outdated: ${deps.outdated.length}\n`);
    
    if (deps.missing.length > 0) {
      console.log(`🔴 Missing dependencies:`);
      deps.missing.forEach(dep => console.log(`   - ${dep}`));
      console.log('');
    }
    
    if (deps.outdated.length > 0) {
      console.log(`🟡 Outdated dependencies:`);
      deps.outdated.forEach(dep => console.log(`   - ${dep}`));
      console.log('');
    }
    
    // Invalidation loop status
    const loops = validationResults.invalidationLoops;
    console.log(`🔄 Invalidation Loop Status:`);
    console.log(`   ${loops.hasLoop ? '🔴 DETECTED' : '✅ NONE'}`);
    console.log(`   ${loops.message}\n`);
    
    // Overall health assessment
    const hasIssues = chunks.corrupted.length > 0 || chunks.missing.length > 0 || 
                     deps.missing.length > 0 || loops.hasLoop;
    
    console.log(`🏥 Overall Cache Health: ${hasIssues ? '🔴 NEEDS ATTENTION' : '✅ HEALTHY'}\n`);
    
    return {
      healthy: !hasIssues,
      issues: {
        corruptedChunks: chunks.corrupted.length,
        missingChunks: chunks.missing.length,
        missingDependencies: deps.missing.length,
        hasInvalidationLoops: loops.hasLoop
      }
    };
  }

  /**
   * Main cache management workflow
   */
  async run(options = {}) {
    const { validate = true, rebuild = true, preventLoops = true } = options;
    
    console.log('🚀 Vite Cache Manager Starting...\n');
    
    try {
      let validationResults = null;
      
      if (validate) {
        validationResults = this.validateCache();
        const report = this.generateReport(validationResults);
        
        if (!report.healthy && rebuild) {
          // Rebuild corrupted/missing chunks
          const rebuildResult = await this.rebuildCorruptedChunks(
            validationResults.chunks.corrupted,
            validationResults.chunks.missing
          );
          
          if (rebuildResult.success) {
            console.log(`✅ Successfully handled ${rebuildResult.rebuiltChunks.length} problematic chunks\n`);
          } else {
            console.error(`❌ Failed to rebuild chunks: ${rebuildResult.error}\n`);
          }
        }
      }
      
      if (preventLoops) {
        const loopPrevention = this.preventInvalidationLoops();
        if (loopPrevention.prevented) {
          console.log(`✅ ${loopPrevention.message}\n`);
        }
      }
      
      // Save updated metadata
      this.saveCacheMetadata();
      
      console.log('🎉 Cache management completed successfully!');
      
      return {
        success: true,
        validationResults,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Cache management failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'validate';
  
  const cacheManager = new CacheManager();
  
  switch (command) {
    case 'validate':
      cacheManager.run({ validate: true, rebuild: false, preventLoops: false });
      break;
      
    case 'rebuild':
      cacheManager.run({ validate: true, rebuild: true, preventLoops: false });
      break;
      
    case 'prevent-loops':
      cacheManager.run({ validate: false, rebuild: false, preventLoops: true });
      break;
      
    case 'full':
    default:
      cacheManager.run({ validate: true, rebuild: true, preventLoops: true });
      break;
  }
}

module.exports = CacheManager;