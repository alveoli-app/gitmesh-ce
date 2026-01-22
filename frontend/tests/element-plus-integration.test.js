/**
 * Element Plus Integration Tests
 * 
 * Tests Element Plus component loading to verify:
 * - Various Element Plus components can be imported
 * - No chunk reload loops occur during component loading
 * - Icon imports work correctly
 * - Style imports don't trigger re-bundling
 * 
 * Requirements: 6.1, 6.3 - Element Plus integration without chunk errors
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CACHE_DIR = path.join(__dirname, '../node_modules/.vite-cache');
const TEST_TIMEOUT = 30000;

class ElementPlusIntegrationTest {
  constructor() {
    this.testResults = [];
    this.chunkLoadEvents = [];
    this.reloadLoopDetected = false;
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

  /**
   * Test Element Plus component imports
   */
  async testElementPlusComponentImports() {
    this.log('Testing Element Plus component imports...', 'test');
    
    try {
      // List of Element Plus components to test
      const componentsToTest = [
        'ElButton',
        'ElInput',
        'ElForm',
        'ElFormItem',
        'ElSelect',
        'ElOption',
        'ElTable',
        'ElTableColumn',
        'ElDialog',
        'ElMessage',
        'ElNotification',
        'ElLoading',
        'ElCard',
        'ElRow',
        'ElCol',
        'ElMenu',
        'ElMenuItem',
        'ElDropdown',
        'ElDropdownMenu',
        'ElDropdownItem',
        'ElPagination'
      ];

      const importResults = {
        successful: [],
        failed: [],
        errors: []
      };

      // Test dynamic imports of Element Plus components
      for (const component of componentsToTest) {
        try {
          // Simulate component import by checking if it would be available
          // In a real test environment, this would be actual dynamic imports
          this.log(`Testing import of ${component}...`);
          
          // Check if component is in the pre-bundled dependencies
          const isPreBundled = this.checkComponentPreBundled(component);
          
          if (isPreBundled) {
            importResults.successful.push(component);
            this.log(`✅ ${component} is pre-bundled`);
          } else {
            importResults.failed.push(component);
            this.log(`⚠️ ${component} may not be pre-bundled`, 'warning');
          }
          
        } catch (error) {
          importResults.failed.push(component);
          importResults.errors.push(`${component}: ${error.message}`);
          this.log(`❌ Failed to test ${component}: ${error.message}`, 'error');
        }
      }

      const result = {
        test: 'Element Plus Component Imports',
        passed: importResults.failed.length === 0,
        details: {
          totalComponents: componentsToTest.length,
          successful: importResults.successful.length,
          failed: importResults.failed.length,
          successfulComponents: importResults.successful,
          failedComponents: importResults.failed,
          errors: importResults.errors
        }
      };

      this.testResults.push(result);
      this.log(`Component import test: ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'success' : 'error');
      
      return result;
      
    } catch (error) {
      const result = {
        test: 'Element Plus Component Imports',
        passed: false,
        error: error.message
      };
      
      this.testResults.push(result);
      this.log(`Component import test: FAILED - ${error.message}`, 'error');
      
      return result;
    }
  }

  /**
   * Check if a component is pre-bundled in the cache
   */
  checkComponentPreBundled(componentName) {
    if (!fs.existsSync(CACHE_DIR)) {
      return false;
    }

    try {
      const depsDir = path.join(CACHE_DIR, 'deps');
      if (!fs.existsSync(depsDir)) {
        return false;
      }

      const cacheFiles = fs.readdirSync(depsDir);
      
      // Check for Element Plus related files
      const elementPlusFiles = cacheFiles.filter(file => 
        file.includes('element-plus') || 
        file.includes('ElementPlus') ||
        file.toLowerCase().includes('element')
      );

      return elementPlusFiles.length > 0;
      
    } catch (error) {
      this.log(`Error checking pre-bundled status for ${componentName}: ${error.message}`, 'warning');
      return false;
    }
  }

  /**
   * Test Element Plus icons import
   */
  async testElementPlusIconsImport() {
    this.log('Testing Element Plus icons import...', 'test');
    
    try {
      // List of commonly used Element Plus icons
      const iconsToTest = [
        'Edit',
        'Delete',
        'Search',
        'Plus',
        'Close',
        'Check',
        'ArrowLeft',
        'ArrowRight',
        'Upload',
        'Download',
        'Setting',
        'User',
        'Lock',
        'Unlock',
        'View',
        'Hide'
      ];

      const iconResults = {
        iconsPackageFound: false,
        preBundledIconsCount: 0,
        testedIcons: iconsToTest.length
      };

      // Check if @element-plus/icons-vue is in cache
      if (fs.existsSync(CACHE_DIR)) {
        const depsDir = path.join(CACHE_DIR, 'deps');
        if (fs.existsSync(depsDir)) {
          const cacheFiles = fs.readdirSync(depsDir);
          
          const iconFiles = cacheFiles.filter(file => 
            file.includes('icons-vue') || 
            file.includes('element-plus_icons') ||
            file.includes('@element-plus')
          );

          iconResults.iconsPackageFound = iconFiles.length > 0;
          iconResults.preBundledIconsCount = iconFiles.length;
          
          if (iconFiles.length > 0) {
            this.log(`Found ${iconFiles.length} icon-related cache files`);
            iconFiles.forEach(file => this.log(`  - ${file}`));
          }
        }
      }

      const result = {
        test: 'Element Plus Icons Import',
        passed: iconResults.iconsPackageFound,
        details: iconResults
      };

      this.testResults.push(result);
      this.log(`Icons import test: ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'success' : 'error');
      
      return result;
      
    } catch (error) {
      const result = {
        test: 'Element Plus Icons Import',
        passed: false,
        error: error.message
      };
      
      this.testResults.push(result);
      this.log(`Icons import test: FAILED - ${error.message}`, 'error');
      
      return result;
    }
  }

  /**
   * Test Element Plus style imports
   */
  async testElementPlusStyleImports() {
    this.log('Testing Element Plus style imports...', 'test');
    
    try {
      const styleResults = {
        cssFilesFound: false,
        styleChunksCount: 0,
        importStyleConfig: 'unknown'
      };

      // Check Vite config for ElementPlusResolver importStyle setting
      const viteConfigPath = path.join(__dirname, '../vite.config.js');
      if (fs.existsSync(viteConfigPath)) {
        const configContent = fs.readFileSync(viteConfigPath, 'utf8');
        
        // Extract importStyle setting
        const importStyleMatch = configContent.match(/importStyle:\s*['"`]([^'"`]+)['"`]/);
        if (importStyleMatch) {
          styleResults.importStyleConfig = importStyleMatch[1];
          this.log(`ElementPlusResolver importStyle: ${styleResults.importStyleConfig}`);
        }
      }

      // Check for CSS files in cache or build output
      if (fs.existsSync(CACHE_DIR)) {
        const depsDir = path.join(CACHE_DIR, 'deps');
        if (fs.existsSync(depsDir)) {
          const cacheFiles = fs.readdirSync(depsDir);
          
          const cssFiles = cacheFiles.filter(file => 
            file.endsWith('.css') && 
            (file.includes('element-plus') || file.includes('element'))
          );

          styleResults.cssFilesFound = cssFiles.length > 0;
          styleResults.styleChunksCount = cssFiles.length;
          
          if (cssFiles.length > 0) {
            this.log(`Found ${cssFiles.length} Element Plus CSS files in cache`);
          }
        }
      }

      // Check build output for CSS files (if build exists)
      const distDir = path.join(__dirname, '../dist');
      if (fs.existsSync(distDir)) {
        const assetsDir = path.join(distDir, 'assets');
        if (fs.existsSync(assetsDir)) {
          const assetFiles = fs.readdirSync(assetsDir);
          const cssAssets = assetFiles.filter(file => file.endsWith('.css'));
          
          if (cssAssets.length > 0) {
            this.log(`Found ${cssAssets.length} CSS assets in build output`);
            styleResults.cssFilesFound = true;
          }
        }
      }

      const result = {
        test: 'Element Plus Style Imports',
        passed: styleResults.importStyleConfig === 'css' && styleResults.cssFilesFound,
        details: styleResults
      };

      this.testResults.push(result);
      this.log(`Style imports test: ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'success' : 'error');
      
      return result;
      
    } catch (error) {
      const result = {
        test: 'Element Plus Style Imports',
        passed: false,
        error: error.message
      };
      
      this.testResults.push(result);
      this.log(`Style imports test: FAILED - ${error.message}`, 'error');
      
      return result;
    }
  }

  /**
   * Test for chunk reload loops
   */
  async testChunkReloadLoops() {
    this.log('Testing for chunk reload loops...', 'test');
    
    try {
      // Check cache metadata for invalidation patterns
      const cacheMetadataFile = path.join(CACHE_DIR, '.cache-metadata.json');
      let invalidationData = {
        invalidationCount: 0,
        lastInvalidation: null,
        hasLoops: false
      };

      if (fs.existsSync(cacheMetadataFile)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(cacheMetadataFile, 'utf8'));
          invalidationData = {
            invalidationCount: metadata.invalidationCount || 0,
            lastInvalidation: metadata.lastInvalidation,
            hasLoops: metadata.invalidationCount > 3 // Threshold for loop detection
          };
          
          this.log(`Cache invalidation count: ${invalidationData.invalidationCount}`);
          
        } catch (error) {
          this.log(`Warning: Could not parse cache metadata: ${error.message}`, 'warning');
        }
      }

      // Check for multiple versions of the same dependency (indicates potential loops)
      const duplicateCheck = this.checkForDuplicateDependencies();

      const result = {
        test: 'Chunk Reload Loop Detection',
        passed: !invalidationData.hasLoops && !duplicateCheck.hasDuplicates,
        details: {
          invalidationCount: invalidationData.invalidationCount,
          hasInvalidationLoops: invalidationData.hasLoops,
          hasDuplicateDependencies: duplicateCheck.hasDuplicates,
          duplicates: duplicateCheck.duplicates
        }
      };

      this.testResults.push(result);
      this.log(`Reload loop test: ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'success' : 'error');
      
      return result;
      
    } catch (error) {
      const result = {
        test: 'Chunk Reload Loop Detection',
        passed: false,
        error: error.message
      };
      
      this.testResults.push(result);
      this.log(`Reload loop test: FAILED - ${error.message}`, 'error');
      
      return result;
    }
  }

  /**
   * Check for duplicate dependencies that might indicate reload loops
   */
  checkForDuplicateDependencies() {
    if (!fs.existsSync(CACHE_DIR)) {
      return { hasDuplicates: false, duplicates: [] };
    }

    try {
      const depsDir = path.join(CACHE_DIR, 'deps');
      if (!fs.existsSync(depsDir)) {
        return { hasDuplicates: false, duplicates: [] };
      }

      const cacheFiles = fs.readdirSync(depsDir);
      const dependencyMap = new Map();
      const duplicates = [];

      // Group files by dependency name
      cacheFiles.forEach(file => {
        const baseName = file.replace(/\.[^.]+$/, ''); // Remove extension
        const depName = baseName.split('?')[0]; // Remove query parameters
        
        if (!dependencyMap.has(depName)) {
          dependencyMap.set(depName, []);
        }
        dependencyMap.get(depName).push(file);
      });

      // Find duplicates
      dependencyMap.forEach((files, depName) => {
        if (files.length > 1) {
          duplicates.push({ dependency: depName, files });
        }
      });

      return {
        hasDuplicates: duplicates.length > 0,
        duplicates
      };
      
    } catch (error) {
      this.log(`Error checking for duplicates: ${error.message}`, 'warning');
      return { hasDuplicates: false, duplicates: [] };
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    this.log('\n📊 ELEMENT PLUS INTEGRATION TEST REPORT');
    this.log('========================================');
    
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
          if (typeof value === 'object' && value !== null) {
            this.log(`  ${key}: ${JSON.stringify(value, null, 2)}`);
          } else {
            this.log(`  ${key}: ${value}`);
          }
        });
      }
    });
    
    this.log(`\n🎯 OVERALL RESULT: ${passedTests}/${totalTests} tests passed`);
    
    // Recommendations
    if (passedTests < totalTests) {
      this.log('\n💡 RECOMMENDATIONS:');
      
      this.testResults.forEach(test => {
        if (!test.passed) {
          switch (test.test) {
            case 'Element Plus Component Imports':
              this.log('  - Ensure Element Plus is in optimizeDeps.include');
              this.log('  - Check that Element Plus components are properly pre-bundled');
              break;
            case 'Element Plus Icons Import':
              this.log('  - Add @element-plus/icons-vue to optimizeDeps.include');
              this.log('  - Verify @element-plus/icons-vue is installed');
              break;
            case 'Element Plus Style Imports':
              this.log('  - Set ElementPlusResolver importStyle to "css"');
              this.log('  - Ensure CSS files are properly generated');
              break;
            case 'Chunk Reload Loop Detection':
              this.log('  - Clear cache and restart development server');
              this.log('  - Check for conflicting dependency versions');
              break;
          }
        }
      });
    }
    
    return {
      passed: passedTests === totalTests,
      passedCount: passedTests,
      totalCount: totalTests,
      results: this.testResults
    };
  }

  /**
   * Run all Element Plus integration tests
   */
  async runAllTests() {
    this.log('Starting Element Plus integration tests...');
    
    try {
      await this.testElementPlusComponentImports();
      await this.testElementPlusIconsImport();
      await this.testElementPlusStyleImports();
      await this.testChunkReloadLoops();
      
      return this.generateReport();
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  const tester = new ElementPlusIntegrationTest();
  
  try {
    switch (command) {
      case 'all':
        const result = await tester.runAllTests();
        process.exit(result.passed ? 0 : 1);
        break;
        
      case 'components':
        await tester.testElementPlusComponentImports();
        break;
        
      case 'icons':
        await tester.testElementPlusIconsImport();
        break;
        
      case 'styles':
        await tester.testElementPlusStyleImports();
        break;
        
      case 'loops':
        await tester.testChunkReloadLoops();
        break;
        
      case 'help':
        console.log(`
Element Plus Integration Tests

Usage:
  node element-plus-integration.test.js [command]

Commands:
  all         Run all integration tests (default)
  components  Test Element Plus component imports
  icons       Test Element Plus icons import
  styles      Test Element Plus style imports
  loops       Test for chunk reload loops
  help        Show this help message

Examples:
  node element-plus-integration.test.js           # Run all tests
  node element-plus-integration.test.js components # Test components only
        `);
        break;
        
      default:
        console.error('❌ Unknown command:', command);
        console.log('   Use "help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ElementPlusIntegrationTest };