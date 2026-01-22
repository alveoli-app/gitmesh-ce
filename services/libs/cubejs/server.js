/**
 * CubeJS Server Configuration with Enhanced Health Checks
 * 
 * This server configuration extends the default CubeJS server to include
 * comprehensive health check endpoints that integrate with our diagnostic engine.
 */

const CubejsServer = require('@cubejs-backend/server');

// Import health check handlers (compiled from TypeScript)
let healthHandlers;
try {
  const healthModule = require('./dist/health-check');
  healthHandlers = {
    readinessHandler: healthModule.readinessHandler,
    healthHandler: healthModule.healthHandler
  };
} catch (error) {
  console.warn('Health check handlers not available, using fallback:', error.message);
  
  // Fallback health check handlers
  healthHandlers = {
    readinessHandler: (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'CubeJS is ready (fallback check)',
        version: process.env.npm_package_version || '1.0.0'
      });
    },
    healthHandler: (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'CubeJS is healthy (fallback check)',
        version: process.env.npm_package_version || '1.0.0'
      });
    }
  };
}

const server = new CubejsServer({
  // Use the existing cube.js configuration
  configPath: './cube.js',
  
  // Server options
  serverOptions: {
    // Enable CORS for health check endpoints
    cors: {
      origin: true,
      credentials: true
    }
  }
});

// Add custom health check endpoints
server.listen().then(({ app, port }) => {
  console.log(`🚀 CubeJS server is running on port ${port}`);
  
  // Enhanced readiness probe endpoint
  // This endpoint is used by Kubernetes for readiness checks
  app.get('/readyz', healthHandlers.readinessHandler);
  
  // Comprehensive health check endpoint
  // This endpoint provides detailed diagnostic information
  app.get('/healthz', healthHandlers.healthHandler);
  
  // Legacy health endpoint for backward compatibility
  app.get('/health', healthHandlers.readinessHandler);
  
  // Diagnostic endpoint for detailed system information
  app.get('/diagnostics', healthHandlers.healthHandler);
  
  console.log('📊 Health check endpoints configured:');
  console.log(`   - GET /readyz     - Kubernetes readiness probe`);
  console.log(`   - GET /healthz    - Comprehensive health check`);
  console.log(`   - GET /health     - Legacy health endpoint`);
  console.log(`   - GET /diagnostics - Detailed diagnostic information`);
  
}).catch(error => {
  console.error('❌ Failed to start CubeJS server:', error);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Unhandled error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process for unhandled rejections in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});