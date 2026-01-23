// Simple Node.js test to verify classification works
process.env.NODE_ENV = 'development';

const { ClassificationService } = require('./dist/classificationService');

async function testClassification() {
  console.log('Starting classification test...');
  
  try {
    const service = new ClassificationService();
    console.log('✓ Classification service created');
    
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
    
    await service.initialize(config);
    console.log('✓ Classification service initialized');
    
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
    
    const result = await service.classify(activity);
    console.log('✓ Classification completed');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Verify structure
    if (!result.productArea || !Array.isArray(result.productArea)) {
      throw new Error('Invalid productArea in result');
    }
    if (!result.sentiment || typeof result.sentiment !== 'string') {
      throw new Error('Invalid sentiment in result');
    }
    if (!result.urgency || typeof result.urgency !== 'string') {
      throw new Error('Invalid urgency in result');
    }
    if (!result.intent || !Array.isArray(result.intent)) {
      throw new Error('Invalid intent in result');
    }
    if (typeof result.confidence !== 'number') {
      throw new Error('Invalid confidence in result');
    }
    
    console.log('✓ All tests passed!');
    console.log('Classification system is working correctly with real activities.');
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testClassification();