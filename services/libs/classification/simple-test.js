// Very simple test to check if the module loads
process.env.NODE_ENV = 'development';

console.log('Testing classification module loading...');

try {
  console.log('Attempting to require classificationService...');
  const classificationModule = require('./dist/classificationService');
  console.log('Module loaded:', Object.keys(classificationModule));
  
  const { ClassificationService } = classificationModule;
  console.log('✓ ClassificationService loaded successfully');
  
  const service = new ClassificationService();
  console.log('✓ ClassificationService instance created');
  
  console.log('✓ Basic module test passed!');
  process.exit(0);
} catch (error) {
  console.error('✗ Test failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}