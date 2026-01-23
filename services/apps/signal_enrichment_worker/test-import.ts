try {
  console.log('Testing imports...')
  
  // Test config import
  console.log('Importing config...')
  const config = require('./src/conf')
  console.log('Config imported successfully')
  
  console.log('All imports successful!')
} catch (error) {
  console.error('Import failed:', error.message)
  console.error('Stack:', error.stack)
}