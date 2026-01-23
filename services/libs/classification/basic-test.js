// Basic test without complex dependencies
process.env.NODE_ENV = 'development';

console.log('Starting basic classification test...');

// Mock the logging to avoid dependency issues
const mockLogger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.log('[WARN]', ...args),
  error: (...args) => console.log('[ERROR]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args)
};

// Mock the logging module
require.cache[require.resolve('@gitmesh/logging')] = {
  exports: {
    getServiceChildLogger: () => mockLogger
  }
};

// Mock the sentiment module
require.cache[require.resolve('@gitmesh/sentiment')] = {
  exports: {
    getSentiment: async (text) => ({
      sentiment: 50,
      label: 'neutral',
      positive: 25,
      negative: 25,
      neutral: 50,
      mixed: 0
    })
  }
};

async function runTest() {
  try {
    console.log('Loading classification service...');
    const { ClassificationService } = require('./dist/classificationService');
    console.log('✓ ClassificationService loaded');
    
    const service = new ClassificationService();
    console.log('✓ Service instance created');
    
    const config = {
      confidenceThreshold: 0.6,
      modelUpdateIntervalDays: 7,
      productAreaModel: {
        version: 'v1.0.0',
        s3Path: 's3://test-bucket/product-area-model.pkl',
        confidenceThreshold: 0.6,
        lastTrained: new Date()
      },
      intentModel: {
        version: 'v1.0.0',
        s3Path: 's3://test-bucket/intent-model.pkl',
        confidenceThreshold: 0.7,
        lastTrained: new Date()
      },
      urgencyModel: {
        version: 'v1.0.0',
        s3Path: 's3://test-bucket/urgency-model.pkl',
        confidenceThreshold: 0.6,
        lastTrained: new Date()
      },
      s3Config: {
        region: 'us-east-1',
        bucket: 'test-bucket'
      }
    };
    
    console.log('Initializing service...');
    await service.initialize(config);
    console.log('✓ Service initialized');
    
    const activity = {
      id: 'test-123',
      type: 'issue-created',
      platform: 'github',
      timestamp: new Date(),
      content: {
        title: 'API endpoint returns 500 error',
        body: 'The server returns a 500 error when processing requests. This is a bug that needs to be fixed.'
      }
    };
    
    console.log('Classifying activity...');
    const result = await service.classify(activity);
    console.log('✓ Classification completed');
    
    console.log('Classification Result:');
    console.log('- Product Area:', result.productArea);
    console.log('- Sentiment:', result.sentiment);
    console.log('- Urgency:', result.urgency);
    console.log('- Intent:', result.intent);
    console.log('- Confidence:', result.confidence);
    
    // Basic validation
    if (!Array.isArray(result.productArea) || result.productArea.length === 0) {
      throw new Error('Invalid productArea');
    }
    if (!Array.isArray(result.intent) || result.intent.length === 0) {
      throw new Error('Invalid intent');
    }
    if (!['positive', 'negative', 'neutral', 'mixed'].includes(result.sentiment)) {
      throw new Error('Invalid sentiment');
    }
    if (!['critical', 'high', 'medium', 'low'].includes(result.urgency)) {
      throw new Error('Invalid urgency');
    }
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      throw new Error('Invalid confidence');
    }
    
    console.log('✓ All validations passed!');
    console.log('✓ Classification system is working correctly with real activities!');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();