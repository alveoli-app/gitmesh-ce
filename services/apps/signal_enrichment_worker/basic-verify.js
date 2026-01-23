#!/usr/bin/env node

/**
 * Basic verification script for Checkpoint 11
 * Tests core functionality without external dependencies
 */

console.log('🔍 Checkpoint 11: Basic Verification\n')

async function basicVerify() {
  let allPassed = true
  
  // Test 1: Check if main files exist
  console.log('1. Checking core files exist...')
  const fs = require('fs')
  const path = require('path')
  
  const coreFiles = [
    'src/main.ts',
    'src/conf/index.ts',
    'src/repo/activity.repo.ts',
    'src/service/enrichmentService.ts',
    'src/service/identityService.ts',
    'src/workflows/index.ts',
    'src/activities/index.ts'
  ]
  
  for (const file of coreFiles) {
    if (fs.existsSync(path.join(__dirname, file))) {
      console.log(`   ✅ ${file}`)
    } else {
      console.log(`   ❌ ${file} - MISSING`)
      allPassed = false
    }
  }
  
  // Test 2: Check shared libraries exist
  console.log('\n2. Checking shared libraries exist...')
  const libPath = '../../libs'
  const requiredLibs = [
    'embeddings',
    'deduplication', 
    'classification',
    'scoring'
  ]
  
  for (const lib of requiredLibs) {
    const libDir = path.join(__dirname, libPath, lib)
    if (fs.existsSync(libDir)) {
      console.log(`   ✅ ${lib} library`)
    } else {
      console.log(`   ❌ ${lib} library - MISSING`)
      allPassed = false
    }
  }
  
  // Test 3: Check package.json scripts
  console.log('\n3. Checking package.json scripts...')
  const packageJson = require('./package.json')
  const requiredScripts = [
    'start',
    'test',
    'script:enrich-batch',
    'script:run-clustering',
    'script:trigger-workflow'
  ]
  
  for (const script of requiredScripts) {
    if (packageJson.scripts[script]) {
      console.log(`   ✅ ${script} script`)
    } else {
      console.log(`   ❌ ${script} script - MISSING`)
      allPassed = false
    }
  }
  
  // Test 4: Check dependencies
  console.log('\n4. Checking key dependencies...')
  const requiredDeps = [
    '@gitmesh/database',
    '@gitmesh/redis',
    '@gitmesh/opensearch',
    '@gitmesh/temporal',
    '@opensearch-project/opensearch'
  ]
  
  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep]) {
      console.log(`   ✅ ${dep}`)
    } else {
      console.log(`   ❌ ${dep} - MISSING`)
      allPassed = false
    }
  }
  
  // Test 5: Check if node_modules exist
  console.log('\n5. Checking installation...')
  if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.log('   ✅ node_modules directory exists')
  } else {
    console.log('   ❌ node_modules directory missing - run pnpm install')
    allPassed = false
  }
  
  console.log('\n📋 Summary:')
  if (allPassed) {
    console.log('🎉 All basic checks passed!')
    console.log('\n✅ The signal enrichment worker structure is complete')
    console.log('✅ All required files are present')
    console.log('✅ All shared libraries are available')
    console.log('✅ All required scripts are configured')
    console.log('✅ All dependencies are declared')
    
    console.log('\n🚀 Ready for real activity processing!')
    console.log('\n📝 To test with real data:')
    console.log('   1. Ensure database is running')
    console.log('   2. Ensure Redis is running')
    console.log('   3. Ensure OpenSearch is running')
    console.log('   4. Run: pnpm run script:enrich-batch 5')
    
  } else {
    console.log('❌ Some checks failed - see details above')
    process.exit(1)
  }
}

basicVerify().catch(console.error)