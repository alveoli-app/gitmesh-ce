/**
 * Vite Cache Validation Plugin
 * 
 * This plugin integrates cache validation and recovery logic directly into
 * the Vite build process to prevent chunk 404 errors and cache invalidation loops.
 */

const CacheManager = require('./cache-manager');

/**
 * Vite plugin for cache validation and recovery
 */
function viteCacheValidationPlugin(options = {}) {
  const {
    validateOnStart = true,
    rebuildCorrupted = true,
    preventLoops = true,
    logLevel = 'info'
  } = options;

  let cacheManager;
  let isDevServer = false;

  return {
    name: 'vite-cache-validation',
    
    configResolved(config) {
      isDevServer = config.command === 'serve';
      cacheManager = new CacheManager();
      
      if (logLevel === 'debug') {
        console.log('🔧 Vite Cache Validation Plugin initialized');
        console.log(`   Dev server mode: ${isDevServer}`);
        console.log(`   Validate on start: ${validateOnStart}`);
        console.log(`   Rebuild corrupted: ${rebuildCorrupted}`);
        console.log(`   Prevent loops: ${preventLoops}`);
      }
    },

    async buildStart() {
      if (!validateOnStart) return;

      try {
        if (logLevel !== 'silent') {
          console.log('🔍 Running cache validation before build...');
        }

        const result = await cacheManager.run({
          validate: true,
          rebuild: rebuildCorrupted,
          preventLoops: preventLoops
        });

        if (!result.success) {
          console.warn('⚠️  Cache validation completed with issues');
          if (logLevel === 'debug') {
            console.warn('   Error:', result.error);
          }
        } else if (logLevel !== 'silent') {
          console.log('✅ Cache validation completed successfully');
        }

      } catch (error) {
        console.error('❌ Cache validation failed:', error.message);
        
        // Don't fail the build, just warn
        if (logLevel === 'debug') {
          console.error('   Stack trace:', error.stack);
        }
      }
    },

    handleHotUpdate({ file, server }) {
      // Monitor for potential cache invalidation triggers
      if (isDevServer && file.includes('node_modules')) {
        if (logLevel === 'debug') {
          console.log(`🔄 Dependency file changed: ${file}`);
        }
        
        // Record potential invalidation
        cacheManager.recordInvalidation();
        
        // Check for invalidation loops
        const loopCheck = cacheManager.checkInvalidationLoops();
        if (loopCheck.hasLoop) {
          console.warn('⚠️  Potential cache invalidation loop detected');
          console.warn(`   ${loopCheck.message}`);
          
          // Apply prevention measures
          const prevention = cacheManager.preventInvalidationLoops();
          if (prevention.prevented && logLevel !== 'silent') {
            console.log(`✅ ${prevention.message}`);
          }
        }
      }
    },

    generateBundle(options, bundle) {
      // Validate that expected chunks are being generated
      const chunkNames = Object.keys(bundle).filter(name => 
        bundle[name].type === 'chunk'
      );

      if (logLevel === 'debug') {
        console.log(`📦 Generated ${chunkNames.length} chunks:`);
        chunkNames.forEach(name => console.log(`   - ${name}`));
      }

      // Update cache metadata with generated chunks
      chunkNames.forEach(chunkName => {
        const chunk = bundle[chunkName];
        if (chunk.code) {
          // Calculate hash for integrity checking
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(chunk.code).digest('hex');
          cacheManager.metadata.chunks[chunkName] = hash;
        }
      });

      // Save updated metadata
      cacheManager.saveCacheMetadata();
    },

    closeBundle() {
      if (logLevel === 'debug') {
        console.log('🏁 Build completed, cache metadata updated');
      }
    }
  };
}

module.exports = viteCacheValidationPlugin;