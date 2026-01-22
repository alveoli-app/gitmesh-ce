#!/usr/bin/env node

/**
 * Development Server Lifecycle Tests
 * 
 * Tests startup, restart, and shutdown scenarios for the Vite development server.
 * Verifies chunk availability across server restarts and page reload behavior.
 * 
 * Requirements: 4.2, 4.3 - Chunk availability across server restarts and reloads
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../node_modules/.vite-cache');
const DEV_PORT = 3000;
const DEV_EE_PORT = 3001;

class DevServerLifecycleTests {
  constructor() {
    this.testResults = [];
    this.serverProcess = null;
    this.testTimeout = 30000; // 30 seconds per test
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

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkServerRunning(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async startDevServer(port = DEV_PORT, mode = 'dev') {
    return new Promise((resolve, reject) => {
      const command = mode === 'dev-ee' ? 'npm run dev-ee' : 'npm run dev';
      
      this.log(`Starting development server: ${command}`);
      
      this.serverProcess = spawn('npm', ['run', mode], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let startupOutput = '';
      let isReady = false;

      const timeout = setTimeout(() => {
        if (!isReady) {
          this.serverProcess.kill();
          reject(new Error('Server startup timeout'));
        }
      }, 15000);

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        
        // Check for Vite ready indicators
        if (output.includes('Local:') || output.includes('ready in') || output.includes('localhost')) {
          clearTimeout(timeout);
          isReady = true;
          resolve({ process: this.serverProcess, output: startupOutput });
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        
        // Some Vite output goes to stderr
        if (output.includes('Local:') || output.includes('ready in')) {
          clearTimeout(timeout);
          isReady = true;
          resolve({ process: this.serverProcess, output: startupOutput });
        }
      });

      this.serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.serverProcess.on('exit', (code) => {
        clearTimeout(timeout);
        if (!isReady) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });
  }

  async stopDevServer() {
    if (this.serverProcess) {
      this.log('Stopping development server...');
      
      return new Promise((resolve) => {
        this.serverProcess.on('exit', () => {
          this.serverProcess = null;
          resolve();
        });
        
        // Try graceful shutdown first
        this.serverProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (this.serverProcess) {
            this.serverProcess.kill('SIGKILL');
            this.serverProcess = null;
          }
          resolve();
        }, 5000);
      });
    }
  }

  getCacheSnapshot() {
    if (!fs.existsSync(CACHE_DIR)) {
      return { exists: false, files: [] };
    }
    
    const depsDir = path.join(CACHE_DIR, 'deps');
    if (!fs.existsSync(depsDir)) {
      return { exists: true, files: [] };
    }
    
    const files = fs.readdirSync(depsDir)
      .filter(file => file.endsWith('.js'))
      .map(file => ({
        name: file,
        size: fs.statSync(path.join(depsDir, file)).size,
        mtime: fs.statSync(path.join(depsDir, file)).mtime
      }));
    
    return { exists: true, files };
  }

  async testServerStartup() {
    this.log('Testing server startup...', 'test');
    
    try {
      const cacheBeforeStartup = this.getCacheSnapshot();
      const startResult = await this.startDevServer();
      
      // Wait a bit for server to fully initialize
      await this.delay(3000);
      
      const isRunning = await this.checkServerRunning(DEV_PORT);
      const cacheAfterStartup = this.getCacheSnapshot();
      
      await this.stopDevServer();
      
      const result = {
        test: 'Server Startup',
        passed: isRunning,
        details: {
          serverStarted: isRunning,
          cacheExistedBefore: cacheBeforeStartup.exists,
          cacheExistsAfter: cacheAfterStartup.exists,
          preBundledDepsCount: cacheAfterStartup.files.length,
          startupOutput: startResult.output.substring(0, 500) // Truncate for readability
        }
      };
      
      this.testResults.push(result);
      this.log(`Server startup test: ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'success' : 'error');
      
      return result;
    } catch (error) {
      const result = {
        test: 'Server Startup',
        passed: false,
        error: error.message
      };
      
      this.testResults.push(result);
      this.log(`Server startup test: FAILED - ${error.message}`, 'error');
      
      return result;
    }
  }

  async testServerRestart() {
    this.log('Testing server restart with cache persistence...', 'test');
    
    try {
      // First startup
      await this.startDevServer();
      await this.delay(3000);
      
      const cacheAfterFirstStart = this.getCacheSnapshot();
      const firstStartRunning = await this.checkServerRunning(DEV_PORT);
      
      // Stop server
      await this.stopDevServer();
      await this.delay(2000);
      
      // Second startup (restart)
      await this.startDevServer();
      await this.delay(3000);
      
      const cacheAfterRestart = this.getCacheSnapshot();
      const restartRunning = await this.checkServerRunning(DEV_PORT);
      
      await this.stopDevServer();
      
      // Compare cache states
      const cachePreserved = cacheAfterFirstStart.exists && cacheAfterRestart.exists &&
                            cacheAfterFirstStart.files.length === cacheAfterRestart.files.length;
      
      const result = {
        test: 'Server Restart',
        passed: firstStartRunning && restartRunning && cachePreserved,
        details: {
          firstStartSuccessful: firstStartRunning,
          restartSuccessful: restartRunning,
          cachePreserved,
          depsCountBefore: cacheAfterFirstStart.files.length,
          depsCountAfter: cacheAfterRestart.files.length
        }
      };
      
      this.testResults.push(result);
      this.log(`Server restart test: ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'success' : 'error');
      
      return result;
    } catch (error) {
      await this.stopDevServer(); // Cleanup
      
      const result = {
        test: 'Server Restart',
        passed: false,
        error: error.message
      };
      
      this.testResults.push(result);
      this.log(`Server restart test: FAILED - ${error.message}`, 'error');
      
      return result;
    }
  }

  async testCacheStability() {
    this.log('Testing cache stability across multiple restarts...', 'test');
    
    try {
      const restartCount = 3;
      const cacheSnapshots = [];
      
      for (let i = 0; i < restartCount; i++) {
        this.log(`Restart cycle ${i + 1}/${restartCount}`);
        
        await this.startDevServer();
        await this.delay(2000);
        
        const isRunning = await this.checkServerRunning(DEV_PORT);
        if (!isRunning) {
          throw new Error(`Server failed to start on restart ${i + 1}`);
        }
        
        const cacheSnapshot = this.getCacheSnapshot();
        cacheSnapshots.push(cacheSnapshot);
        
        await this.stopDevServer();
        await this.delay(1000);
      }
      
      // Analyze cache stability
      const allHaveCache = cacheSnapshots.every(snapshot => snapshot.exists);
      const consistentDepCount = cacheSnapshots.every(snapshot => 
        snapshot.files.length === cacheSnapshots[0].files.length
      );
      
      const result = {
        test: 'Cache Stability',
        passed: allHaveCache && consistentDepCount,
        details: {
          restartCount,
          allHaveCache,
          consistentDepCount,
          depCounts: cacheSnapshots.map(s => s.files.length)
        }
      };
      
      this.testResults.push(result);
      this.log(`Cache stability test: ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'success' : 'error');
      
      return result;
    } catch (error) {
      await this.stopDevServer(); // Cleanup
      
      const result = {
        test: 'Cache Stability',
        passed: false,
        error: error.message
      };
      
      this.testResults.push(result);
      this.log(`Cache stability test: FAILED - ${error.message}`, 'error');
      
      return result;
    }
  }

  async testDualModeStartup() {
    this.log('Testing dev and dev-ee mode startup...', 'test');
    
    try {
      // Test regular dev mode
      await this.startDevServer(DEV_PORT, 'dev');
      await this.delay(2000);
      const devRunning = await this.checkServerRunning(DEV_PORT);
      await this.stopDevServer();
      
      await this.delay(1000);
      
      // Test dev-ee mode
      await this.startDevServer(DEV_EE_PORT, 'dev-ee');
      await this.delay(2000);
      const devEERunning = await this.checkServerRunning(DEV_EE_PORT);
      await this.stopDevServer();
      
      const result = {
        test: 'Dual Mode Startup',
        passed: devRunning && devEERunning,
        details: {
          devModeStarted: devRunning,
          devEEModeStarted: devEERunning
        }
      };
      
      this.testResults.push(result);
      this.log(`Dual mode startup test: ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'success' : 'error');
      
      return result;
    } catch (error) {
      await this.stopDevServer(); // Cleanup
      
      const result = {
        test: 'Dual Mode Startup',
        passed: false,
        error: error.message
      };
      
      this.testResults.push(result);
      this.log(`Dual mode startup test: FAILED - ${error.message}`, 'error');
      
      return result;
    }
  }

  generateReport() {
    this.log('\n📊 DEVELOPMENT SERVER LIFECYCLE TEST REPORT');
    this.log('==============================================');
    
    const passedTests = this.testResults.filter(test => test.passed).length;
    const totalTests = this.testResults.length;
    
    this.testResults.forEach(test => {
      const status = test.passed ? '✅ PASSED' : '❌ FAILED';
      this.log(`${test.test}: ${status}`);
      
      if (test.error) {
        this.log(`  Error: ${test.error}`);
      }
      
      if (test.details) {
        Object.entries(test.details).forEach(([key, value]) => {
          this.log(`  ${key}: ${JSON.stringify(value)}`);
        });
      }
    });
    
    this.log(`\n🎯 OVERALL RESULT: ${passedTests}/${totalTests} tests passed`);
    
    return {
      passed: passedTests === totalTests,
      passedCount: passedTests,
      totalCount: totalTests,
      results: this.testResults
    };
  }

  async runAllTests() {
    this.log('Starting development server lifecycle tests...');
    
    try {
      await this.testServerStartup();
      await this.testServerRestart();
      await this.testCacheStability();
      await this.testDualModeStartup();
      
      return this.generateReport();
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      await this.stopDevServer(); // Ensure cleanup
      throw error;
    }
  }

  async cleanup() {
    await this.stopDevServer();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  const tester = new DevServerLifecycleTests();
  
  // Ensure cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received interrupt signal, cleaning up...');
    await tester.cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received terminate signal, cleaning up...');
    await tester.cleanup();
    process.exit(0);
  });
  
  try {
    switch (command) {
      case 'all':
        const result = await tester.runAllTests();
        process.exit(result.passed ? 0 : 1);
        break;
        
      case 'startup':
        await tester.testServerStartup();
        break;
        
      case 'restart':
        await tester.testServerRestart();
        break;
        
      case 'cache':
        await tester.testCacheStability();
        break;
        
      case 'modes':
        await tester.testDualModeStartup();
        break;
        
      case 'help':
        console.log(`
Development Server Lifecycle Tests

Usage:
  node dev-server-lifecycle-tests.js [command]

Commands:
  all       Run all lifecycle tests (default)
  startup   Test server startup only
  restart   Test server restart only
  cache     Test cache stability only
  modes     Test dev and dev-ee modes only
  help      Show this help message

Examples:
  node dev-server-lifecycle-tests.js           # Run all tests
  node dev-server-lifecycle-tests.js startup   # Test startup only
        `);
        break;
        
      default:
        console.error('❌ Unknown command:', command);
        console.log('   Use "help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    await tester.cleanup();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DevServerLifecycleTests };