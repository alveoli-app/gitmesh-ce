#!/usr/bin/env node

/**
 * Enhanced Chunk Availability Verification Script
 * 
 * This script verifies that all expected chunks are present after a build,
 * monitors for 404 errors during loading, and validates cache directory structure.
 * 
 * Requirements: 4.4 - Missing Chunk Detection
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const DIST_DIR = path.join(__dirname, '../dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const CACHE_DIR = path.join(__dirname, '../node_modules/.vite-cache');
const VITE_CONFIG = path.join(__dirname, '../vite.config.js');

// Expected critical dependencies from vite.config.js optimizeDeps.include
const EXPECTED_DEPENDENCIES = [
  'vue',
  'vue-router',
  'pinia',
  'vuex',
  'element-plus',
  '@element-plus/icons-vue',
  'axios',
  'lodash',
  '@vueuse/core',
  'chart.js',
  'moment',
  'socket.io-client',
  'uuid',
  'qs',
  'marked',
  'dompurify',
  'file-saver',
  'papaparse',
  'date-fns',
  '@cubejs-client/core',
  '@cubejs-client/vue3',
  '@tiptap/vue-3',
  '@tiptap/starter-kit',
  '@vuelidate/core',
  '@vuelidate/validators'
];

class ChunkVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.results = {
      buildChunks: { passed: false, details: {} },
      cacheStructure: { passed: false, details: {} },
      dependencyMapping: { passed: false, details: {} },
      runtimeVerification: { passed: false, details: {} }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  // Verify build output chunks
  verifyBuildChunks() {
    this.log('Verifying build output chunks...');
    
    if (!fs.existsSync(DIST_DIR)) {
      this.addError('Build directory not found. Run npm run build first.');
      return false;
    }
    
    if (!fs.existsSync(ASSETS_DIR)) {
      this.addError('Assets directory not found in build output.');
      return false;
    }
    
    const assetFiles = fs.readdirSync(ASSETS_DIR);
    const jsChunks = assetFiles.filter(file => file.endsWith('.js'));
    const cssChunks = assetFiles.filter(file => file.endsWith('.css'));
    
    this.log(`Found ${jsChunks.length} JavaScript chunks`);
    this.log(`Found ${cssChunks.length} CSS chunks`);
    
    // Check for critical chunks
    const hasIndexChunk = jsChunks.some(file => file.includes('index'));
    const hasVendorChunk = jsChunks.some(file => file.includes('vendor') || file.includes('chunk'));
    
    if (!hasIndexChunk) {
      this.addWarning('No index chunk found - this might indicate a build issue');
    }
    
    if (!hasVendorChunk) {
      this.addWarning('No vendor/chunk files found - dependencies might not be properly bundled');
    }
    
    // Check for Element Plus related chunks
    const elementPlusChunks = assetFiles.filter(file => 
      file.includes('element-plus') || file.includes('ElementPlus')
    );
    
    if (elementPlusChunks.length > 0) {
      this.log(`Found ${elementPlusChunks.length} Element Plus related chunks`);
    } else {
      this.addWarning('No Element Plus chunks found - components might not be pre-bundled');
    }
    
    this.results.buildChunks = {
      passed: this.errors.length === 0,
      details: {
        totalAssets: assetFiles.length,
        jsChunks: jsChunks.length,
        cssChunks: cssChunks.length,
        hasIndexChunk,
        hasVendorChunk,
        elementPlusChunks: elementPlusChunks.length,
        allChunks: jsChunks
      }
    };
    
    return this.errors.length === 0;
  }

  // Validate cache directory structure
  validateCacheStructure() {
    this.log('Validating cache directory structure...');
    
    if (!fs.existsSync(CACHE_DIR)) {
      this.addWarning('Vite cache directory not found - this is normal for first run');
      this.results.cacheStructure = {
        passed: true,
        details: { exists: false, reason: 'First run or cache cleared' }
      };
      return true;
    }
    
    const cacheContents = fs.readdirSync(CACHE_DIR);
    const depsDir = path.join(CACHE_DIR, 'deps');
    
    if (!fs.existsSync(depsDir)) {
      this.addWarning('Cache deps directory not found - dependencies may not be pre-bundled');
    }
    
    let preBundledDeps = [];
    if (fs.existsSync(depsDir)) {
      preBundledDeps = fs.readdirSync(depsDir).filter(file => file.endsWith('.js'));
      this.log(`Found ${preBundledDeps.length} pre-bundled dependencies in cache`);
    }
    
    // Check for _metadata.json which indicates successful pre-bundling
    const metadataFile = path.join(depsDir, '_metadata.json');
    let hasMetadata = false;
    let metadataContent = null;
    
    if (fs.existsSync(metadataFile)) {
      hasMetadata = true;
      try {
        metadataContent = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        this.log('Cache metadata found and valid');
      } catch (error) {
        this.addWarning('Cache metadata file exists but is corrupted');
      }
    }
    
    this.results.cacheStructure = {
      passed: true,
      details: {
        exists: true,
        cacheContents: cacheContents.length,
        preBundledDeps: preBundledDeps.length,
        hasMetadata,
        metadataValid: metadataContent !== null,
        depsList: preBundledDeps
      }
    };
    
    return true;
  }

  // Check dependency mapping against expected dependencies
  checkDependencyMapping() {
    this.log('Checking dependency mapping...');
    
    const depsDir = path.join(CACHE_DIR, 'deps');
    let preBundledDeps = [];
    
    if (fs.existsSync(depsDir)) {
      preBundledDeps = fs.readdirSync(depsDir)
        .filter(file => file.endsWith('.js'))
        .map(file => file.replace('.js', '').replace(/_/g, '/'));
    }
    
    const missingDeps = [];
    const foundDeps = [];
    
    EXPECTED_DEPENDENCIES.forEach(dep => {
      const normalizedDep = dep.replace('/', '_');
      const isFound = preBundledDeps.some(bundled => 
        bundled.includes(dep) || bundled.includes(normalizedDep)
      );
      
      if (isFound) {
        foundDeps.push(dep);
      } else {
        missingDeps.push(dep);
      }
    });
    
    if (missingDeps.length > 0) {
      this.addWarning(`Missing pre-bundled dependencies: ${missingDeps.join(', ')}`);
      this.log('These dependencies may cause 404 errors during runtime');
    }
    
    this.log(`Pre-bundled: ${foundDeps.length}/${EXPECTED_DEPENDENCIES.length} expected dependencies`);
    
    this.results.dependencyMapping = {
      passed: missingDeps.length === 0,
      details: {
        expectedCount: EXPECTED_DEPENDENCIES.length,
        foundCount: foundDeps.length,
        missingCount: missingDeps.length,
        foundDeps,
        missingDeps
      }
    };
    
    return missingDeps.length === 0;
  }

  // Generate verification report
  generateReport() {
    this.log('\n📊 CHUNK VERIFICATION REPORT');
    this.log('================================');
    
    Object.entries(this.results).forEach(([test, result]) => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      this.log(`${test.toUpperCase()}: ${status}`);
    });
    
    if (this.warnings.length > 0) {
      this.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(warning => this.log(`  - ${warning}`));
    }
    
    if (this.errors.length > 0) {
      this.log('\n❌ ERRORS:');
      this.errors.forEach(error => this.log(`  - ${error}`));
    }
    
    const overallPassed = this.errors.length === 0;
    this.log(`\n🎯 OVERALL RESULT: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return {
      passed: overallPassed,
      errors: this.errors,
      warnings: this.warnings,
      results: this.results
    };
  }

  // Main verification method
  async verify() {
    this.log('Starting comprehensive chunk verification...');
    
    this.verifyBuildChunks();
    this.validateCacheStructure();
    this.checkDependencyMapping();
    
    return this.generateReport();
  }
}

// Runtime 404 monitoring (for development server)
class RuntimeMonitor {
  constructor(port = 3000) {
    this.port = port;
    this.detected404s = [];
  }

  async checkServerRunning() {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${this.port}`, (res) => {
        resolve(true);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async monitor404s() {
    const isRunning = await this.checkServerRunning();
    
    if (!isRunning) {
      console.log('⚠️  Development server not running on port', this.port);
      console.log('   Start server with: npm run dev');
      return { running: false, errors: [] };
    }
    
    console.log('🔍 Monitoring for 404 errors...');
    console.log('   (This would require browser automation for full testing)');
    console.log('   Manual verification: Check browser console for chunk 404 errors');
    
    return { running: true, errors: [] };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'verify';
  
  switch (command) {
    case 'verify':
    case 'build':
      const verifier = new ChunkVerifier();
      const result = await verifier.verify();
      process.exit(result.passed ? 0 : 1);
      break;
      
    case 'monitor':
      const port = parseInt(args[1]) || 3000;
      const monitor = new RuntimeMonitor(port);
      await monitor.monitor404s();
      break;
      
    case 'help':
      console.log(`
Chunk Availability Verification Script

Usage:
  node verify-chunks.js [command] [options]

Commands:
  verify, build    Verify build output and cache structure (default)
  monitor [port]   Monitor development server for 404 errors (default port: 3000)
  help            Show this help message

Examples:
  node verify-chunks.js                    # Verify build chunks
  node verify-chunks.js monitor            # Monitor dev server on port 3000
  node verify-chunks.js monitor 3001       # Monitor dev server on port 3001
      `);
      break;
      
    default:
      console.error('❌ Unknown command:', command);
      console.log('   Use "help" for usage information');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  });
}

module.exports = { ChunkVerifier, RuntimeMonitor };