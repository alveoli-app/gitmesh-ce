#!/usr/bin/env node

/**
 * Minimal Element Plus Integration Test
 * 
 * Simple test to verify Element Plus configuration without complex dependencies.
 * Tests the core requirements for subtask 8.2.
 */

const fs = require('fs');
const path = require('path');

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '🔍',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }[type];
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function testElementPlusInOptimizeDeps() {
  log('Testing Element Plus in optimizeDeps...');
  
  try {
    const viteConfigPath = path.join(__dirname, '../vite.config.js');
    const configContent = fs.readFileSync(viteConfigPath, 'utf8');
    
    const hasElementPlus = configContent.includes("'element-plus'") || configContent.includes('"element-plus"');
    const hasElementPlusIcons = configContent.includes("'@element-plus/icons-vue'") || configContent.includes('"@element-plus/icons-vue"');
    
    if (hasElementPlus && hasElementPlusIcons) {
      log('✅ Element Plus and icons found in optimizeDeps.include', 'success');
      return true;
    } else {
      log('❌ Element Plus or icons missing from optimizeDeps.include', 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Error checking vite config: ${error.message}`, 'error');
    return false;
  }
}

function testElementPlusResolver() {
  log('Testing ElementPlusResolver configuration...');
  
  try {
    const viteConfigPath = path.join(__dirname, '../vite.config.js');
    const configContent = fs.readFileSync(viteConfigPath, 'utf8');
    
    const hasResolver = configContent.includes('ElementPlusResolver');
    const hasImportStyleCSS = configContent.includes('importStyle: "css"') || configContent.includes("importStyle: 'css'");
    
    if (hasResolver && hasImportStyleCSS) {
      log('✅ ElementPlusResolver configured with importStyle: "css"', 'success');
      return true;
    } else {
      log('❌ ElementPlusResolver not properly configured', 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Error checking ElementPlusResolver: ${error.message}`, 'error');
    return false;
  }
}

function testPackageJsonDependencies() {
  log('Testing package.json dependencies...');
  
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const hasElementPlus = packageContent.dependencies && packageContent.dependencies['element-plus'];
    const hasElementPlusIcons = packageContent.dependencies && packageContent.dependencies['@element-plus/icons-vue'];
    
    if (hasElementPlus && hasElementPlusIcons) {
      log(`✅ Element Plus dependencies found: element-plus@${packageContent.dependencies['element-plus']}, @element-plus/icons-vue@${packageContent.dependencies['@element-plus/icons-vue']}`, 'success');
      return true;
    } else {
      log('❌ Element Plus dependencies missing from package.json', 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Error checking package.json: ${error.message}`, 'error');
    return false;
  }
}

function testCacheDirectory() {
  log('Testing cache directory configuration...');
  
  try {
    const viteConfigPath = path.join(__dirname, '../vite.config.js');
    const configContent = fs.readFileSync(viteConfigPath, 'utf8');
    
    const hasCacheDir = configContent.includes("cacheDir: './node_modules/.vite-cache'") || 
                       configContent.includes('cacheDir: "./node_modules/.vite-cache"');
    
    if (hasCacheDir) {
      log('✅ Cache directory configured correctly', 'success');
      return true;
    } else {
      log('⚠️ Cache directory configuration not found or incorrect', 'warning');
      return false;
    }
  } catch (error) {
    log(`❌ Error checking cache directory: ${error.message}`, 'error');
    return false;
  }
}

async function main() {
  log('Starting minimal Element Plus integration test...');
  
  const tests = [
    testElementPlusInOptimizeDeps,
    testElementPlusResolver,
    testPackageJsonDependencies,
    testCacheDirectory
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    if (test()) {
      passedTests++;
    }
  }
  
  log(`\n📊 Test Results: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    log('🎉 All Element Plus integration tests passed!', 'success');
    process.exit(0);
  } else {
    log('❌ Some Element Plus integration tests failed', 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}