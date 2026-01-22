#!/usr/bin/env node

/**
 * Element Plus Configuration Verification
 * 
 * Verifies that Element Plus is properly configured in vite.config.js
 * and package.json for optimal chunk loading without reload loops.
 */

const fs = require('fs');
const path = require('path');

class ElementPlusConfigVerifier {
  constructor() {
    this.results = [];
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

  /**
   * Verify Element Plus in optimizeDeps.include
   */
  verifyOptimizeDepsConfig() {
    this.log('Verifying optimizeDeps configuration...');
    
    try {
      const viteConfigPath = path.join(__dirname, '../vite.config.js');
      const configContent = fs.readFileSync(viteConfigPath, 'utf8');
      
      // Check for optimizeDeps.include array
      const includeMatch = configContent.match(/include:\s*\[([\s\S]*?)\]/);
      
      if (!includeMatch) {
        this.results.push({
          test: 'OptimizeDeps Include Array',
          passed: false,
          message: 'optimizeDeps.include array not found'
        });
        return false;
      }
      
      const includeContent = includeMatch[1];
      const dependencies = includeContent
        .split(',')
        .map(dep => dep.trim().replace(/['"`]/g, ''))
        .filter(dep => dep.length > 0);
      
      // Check for Element Plus dependencies
      const requiredDeps = [
        'element-plus',
        '@element-plus/icons-vue'
      ];
      
      const missingDeps = requiredDeps.filter(dep => 
        !dependencies.some(included => included.includes(dep))
      );
      
      const result = {
        test: 'Element Plus in OptimizeDeps',
        passed: missingDeps.length === 0,
        details: {
          foundDependencies: dependencies.filter(dep => 
            dep.includes('element-plus') || dep.includes('element')
          ),
          missingDependencies: missingDeps,
          allIncludedDeps: dependencies
        }
      };
      
      this.results.push(result);
      
      if (result.passed) {
        this.log('✅ Element Plus dependencies found in optimizeDeps.include', 'success');
      } else {
        this.log(`❌ Missing Element Plus dependencies: ${missingDeps.join(', ')}`, 'error');
      }
      
      return result.passed;
      
    } catch (error) {
      this.results.push({
        test: 'OptimizeDeps Configuration',
        passed: false,
        error: error.message
      });
      
      this.log(`❌ Failed to verify optimizeDeps: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Verify ElementPlusResolver configuration
   */
  verifyElementPlusResolver() {
    this.log('Verifying ElementPlusResolver configuration...');
    
    try {
      const viteConfigPath = path.join(__dirname, '../vite.config.js');
      const configContent = fs.readFileSync(viteConfigPath, 'utf8');
      
      // Check for ElementPlusResolver
      const resolverMatch = configContent.includes('ElementPlusResolver');
      
      if (!resolverMatch) {
        this.results.push({
          test: 'ElementPlusResolver Present',
          passed: false,
          message: 'ElementPlusResolver not found in configuration'
        });
        return false;
      }
      
      // Check importStyle setting
      const importStyleMatch = configContent.match(/importStyle:\s*['"`]([^'"`]+)['"`]/);
      const importStyleValue = importStyleMatch ? importStyleMatch[1] : 'not-set';
      
      const result = {
        test: 'ElementPlusResolver Configuration',
        passed: importStyleValue === 'css',
        details: {
          resolverPresent: true,
          importStyle: importStyleValue,
          expectedImportStyle: 'css'
        }
      };
      
      this.results.push(result);
      
      if (result.passed) {
        this.log('✅ ElementPlusResolver configured with importStyle: "css"', 'success');
      } else {
        this.log(`⚠️ ElementPlusResolver importStyle is "${importStyleValue}", should be "css"`, 'warning');
      }
      
      return result.passed;
      
    } catch (error) {
      this.results.push({
        test: 'ElementPlusResolver Configuration',
        passed: false,
        error: error.message
      });
      
      this.log(`❌ Failed to verify ElementPlusResolver: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Verify Element Plus package versions
   */
  verifyPackageVersions() {
    this.log('Verifying Element Plus package versions...');
    
    try {
      const packageJsonPath = path.join(__dirname, '../package.json');
      const packageContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const dependencies = {
        ...packageContent.dependencies,
        ...packageContent.devDependencies
      };
      
      const elementPlusVersion = dependencies['element-plus'];
      const iconsVersion = dependencies['@element-plus/icons-vue'];
      
      const result = {
        test: 'Element Plus Package Versions',
        passed: elementPlusVersion && iconsVersion,
        details: {
          elementPlusVersion: elementPlusVersion || 'not-installed',
          iconsVersion: iconsVersion || 'not-installed',
          elementPlusVersionPinned: elementPlusVersion && !elementPlusVersion.startsWith('^'),
          iconsVersionPinned: iconsVersion && !iconsVersion.startsWith('^')
        }
      };
      
      this.results.push(result);
      
      if (result.passed) {
        this.log(`✅ Element Plus versions: element-plus@${elementPlusVersion}, @element-plus/icons-vue@${iconsVersion}`, 'success');
      } else {
        this.log('❌ Missing Element Plus packages in dependencies', 'error');
      }
      
      // Check version pinning
      if (elementPlusVersion && elementPlusVersion.startsWith('^')) {
        this.log('⚠️ element-plus version uses caret prefix, consider pinning exact version', 'warning');
      }
      
      if (iconsVersion && iconsVersion.startsWith('^')) {
        this.log('⚠️ @element-plus/icons-vue version uses caret prefix, consider pinning exact version', 'warning');
      }
      
      return result.passed;
      
    } catch (error) {
      this.results.push({
        test: 'Package Versions',
        passed: false,
        error: error.message
      });
      
      this.log(`❌ Failed to verify package versions: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Verify cache directory configuration
   */
  verifyCacheConfiguration() {
    this.log('Verifying cache directory configuration...');
    
    try {
      const viteConfigPath = path.join(__dirname, '../vite.config.js');
      const configContent = fs.readFileSync(viteConfigPath, 'utf8');
      
      // Check for cacheDir setting
      const cacheDirMatch = configContent.match(/cacheDir:\s*['"`]([^'"`]+)['"`]/);
      const cacheDir = cacheDirMatch ? cacheDirMatch[1] : 'default';
      
      const result = {
        test: 'Cache Directory Configuration',
        passed: cacheDir === './node_modules/.vite-cache',
        details: {
          configuredCacheDir: cacheDir,
          expectedCacheDir: './node_modules/.vite-cache'
        }
      };
      
      this.results.push(result);
      
      if (result.passed) {
        this.log('✅ Cache directory configured correctly', 'success');
      } else {
        this.log(`⚠️ Cache directory is "${cacheDir}", should be "./node_modules/.vite-cache"`, 'warning');
      }
      
      return result.passed;
      
    } catch (error) {
      this.results.push({
        test: 'Cache Configuration',
        passed: false,
        error: error.message
      });
      
      this.log(`❌ Failed to verify cache configuration: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Generate verification report
   */
  generateReport() {
    this.log('\n📊 ELEMENT PLUS CONFIGURATION REPORT');
    this.log('====================================');
    
    const passedTests = this.results.filter(test => test.passed).length;
    const totalTests = this.results.length;
    
    this.results.forEach(test => {
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
    
    this.log(`\n🎯 OVERALL RESULT: ${passedTests}/${totalTests} checks passed`);
    
    return {
      passed: passedTests === totalTests,
      passedCount: passedTests,
      totalCount: totalTests,
      results: this.results
    };
  }

  /**
   * Run all verification checks
   */
  async runAllChecks() {
    this.log('Starting Element Plus configuration verification...');
    
    this.verifyOptimizeDepsConfig();
    this.verifyElementPlusResolver();
    this.verifyPackageVersions();
    this.verifyCacheConfiguration();
    
    return this.generateReport();
  }
}

// CLI interface
async function main() {
  const verifier = new ElementPlusConfigVerifier();
  
  try {
    const result = await verifier.runAllChecks();
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ElementPlusConfigVerifier };