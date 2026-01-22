#!/usr/bin/env node

/**
 * Lifecycle Test Runner
 * 
 * Orchestrates both server lifecycle tests and browser-based chunk availability tests.
 * Provides a unified interface for running all development server lifecycle tests.
 */

const { spawn } = require('child_process');
const path = require('path');

class LifecycleTestRunner {
  constructor() {
    this.results = {
      serverTests: null,
      e2eTests: null
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      test: '🧪'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        ...options
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          resolve({ success: false, code });
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runServerLifecycleTests() {
    this.log('Running server lifecycle tests...', 'test');
    
    try {
      const result = await this.runCommand('node', ['scripts/dev-server-lifecycle-tests.js', 'all']);
      this.results.serverTests = result;
      
      if (result.success) {
        this.log('Server lifecycle tests: PASSED', 'success');
      } else {
        this.log('Server lifecycle tests: FAILED', 'error');
      }
      
      return result;
    } catch (error) {
      this.log(`Server lifecycle tests failed: ${error.message}`, 'error');
      this.results.serverTests = { success: false, error: error.message };
      return this.results.serverTests;
    }
  }

  async runE2EChunkTests() {
    this.log('Running E2E chunk availability tests...', 'test');
    
    try {
      // Check if Cypress is available
      const cypressResult = await this.runCommand('npx', ['cypress', 'verify'], { stdio: 'pipe' });
      
      if (!cypressResult.success) {
        this.log('Cypress not available, skipping E2E tests', 'warning');
        this.results.e2eTests = { success: true, skipped: true };
        return this.results.e2eTests;
      }
      
      const result = await this.runCommand('npx', ['cypress', 'run', '--spec', 'tests/e2e/chunk-availability.spec.js', '--headless']);
      this.results.e2eTests = result;
      
      if (result.success) {
        this.log('E2E chunk tests: PASSED', 'success');
      } else {
        this.log('E2E chunk tests: FAILED', 'error');
      }
      
      return result;
    } catch (error) {
      this.log(`E2E chunk tests failed: ${error.message}`, 'error');
      this.results.e2eTests = { success: false, error: error.message };
      return this.results.e2eTests;
    }
  }

  async runQuickVerification() {
    this.log('Running quick chunk verification...', 'test');
    
    try {
      const result = await this.runCommand('node', ['scripts/verify-chunks.js', 'verify']);
      
      if (result.success) {
        this.log('Quick verification: PASSED', 'success');
      } else {
        this.log('Quick verification: FAILED', 'error');
      }
      
      return result;
    } catch (error) {
      this.log(`Quick verification failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  generateReport() {
    this.log('\n📊 LIFECYCLE TEST SUITE REPORT');
    this.log('===============================');
    
    const tests = [
      { name: 'Server Lifecycle Tests', result: this.results.serverTests },
      { name: 'E2E Chunk Tests', result: this.results.e2eTests }
    ];
    
    let passedCount = 0;
    let totalCount = 0;
    
    tests.forEach(test => {
      if (test.result) {
        totalCount++;
        if (test.result.success) {
          passedCount++;
          this.log(`${test.name}: ✅ PASSED`);
        } else if (test.result.skipped) {
          this.log(`${test.name}: ⏭️  SKIPPED`);
        } else {
          this.log(`${test.name}: ❌ FAILED`);
          if (test.result.error) {
            this.log(`  Error: ${test.result.error}`);
          }
        }
      }
    });
    
    const overallPassed = passedCount === totalCount;
    this.log(`\n🎯 OVERALL RESULT: ${passedCount}/${totalCount} test suites passed`);
    
    return {
      passed: overallPassed,
      passedCount,
      totalCount,
      results: this.results
    };
  }

  async runAll() {
    this.log('Starting comprehensive lifecycle test suite...');
    
    // Run quick verification first
    await this.runQuickVerification();
    
    // Run server lifecycle tests
    await this.runServerLifecycleTests();
    
    // Run E2E tests
    await this.runE2EChunkTests();
    
    return this.generateReport();
  }

  async runServerOnly() {
    this.log('Running server lifecycle tests only...');
    await this.runServerLifecycleTests();
    return this.generateReport();
  }

  async runE2EOnly() {
    this.log('Running E2E chunk tests only...');
    await this.runE2EChunkTests();
    return this.generateReport();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  const runner = new LifecycleTestRunner();
  
  try {
    let result;
    
    switch (command) {
      case 'all':
        result = await runner.runAll();
        break;
        
      case 'server':
        result = await runner.runServerOnly();
        break;
        
      case 'e2e':
        result = await runner.runE2EOnly();
        break;
        
      case 'verify':
        result = await runner.runQuickVerification();
        break;
        
      case 'help':
        console.log(`
Lifecycle Test Runner

Usage:
  node run-lifecycle-tests.js [command]

Commands:
  all       Run all lifecycle tests (default)
  server    Run server lifecycle tests only
  e2e       Run E2E chunk availability tests only
  verify    Run quick chunk verification only
  help      Show this help message

Examples:
  node run-lifecycle-tests.js           # Run all tests
  node run-lifecycle-tests.js server    # Server tests only
  node run-lifecycle-tests.js e2e       # E2E tests only
        `);
        process.exit(0);
        break;
        
      default:
        console.error('❌ Unknown command:', command);
        console.log('   Use "help" for usage information');
        process.exit(1);
    }
    
    process.exit(result && result.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { LifecycleTestRunner };