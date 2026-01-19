#!/usr/bin/env node
/**
 * Premium Directory Detection Script
 * Checks for the existence of premium directories and determines if EE build is possible
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPremiumDirectories() {
  const projectRoot = path.resolve(__dirname, '../..');
  
  // Define required premium directories
  const premiumDirs = [
    'premium-frontend',
    'premium-backend',
    'premium-libs'
  ];
  
  // Define critical premium files/directories that must exist
  const criticalPaths = [
    'premium-frontend/src/premium',
    'premium-backend/src',
    'premium-libs/src'
  ];
  
  log('blue', '🔍 Checking for premium directories...');
  
  const missingDirs = [];
  const missingCriticalPaths = [];
  
  // Check main premium directories
  for (const dir of premiumDirs) {
    const dirPath = path.join(projectRoot, dir);
    if (!fs.existsSync(dirPath)) {
      missingDirs.push(dir);
    } else {
      log('green', `✓ Found ${dir}`);
    }
  }
  
  // Check critical paths within premium directories
  for (const criticalPath of criticalPaths) {
    const fullPath = path.join(projectRoot, criticalPath);
    if (!fs.existsSync(fullPath)) {
      missingCriticalPaths.push(criticalPath);
    } else {
      log('green', `✓ Found ${criticalPath}`);
    }
  }
  
  // Determine if EE build is possible
  const canBuildEE = missingDirs.length === 0 && missingCriticalPaths.length === 0;
  
  if (canBuildEE) {
    log('green', '✅ All premium directories found - Enterprise Edition build available');
    return { canBuildEE: true, missingDirs: [], missingCriticalPaths: [] };
  } else {
    log('yellow', '⚠️  Some premium directories are missing:');
    
    if (missingDirs.length > 0) {
      log('red', '  Missing directories:');
      missingDirs.forEach(dir => log('red', `    - ${dir}`));
    }
    
    if (missingCriticalPaths.length > 0) {
      log('red', '  Missing critical paths:');
      missingCriticalPaths.forEach(path => log('red', `    - ${path}`));
    }
    
    log('yellow', '📦 Falling back to Community Edition build');
    return { canBuildEE: false, missingDirs, missingCriticalPaths };
  }
}

// Export for use in other scripts
module.exports = { checkPremiumDirectories };

// If run directly, execute the check and exit with appropriate code
if (require.main === module) {
  const result = checkPremiumDirectories();
  process.exit(result.canBuildEE ? 0 : 1);
}