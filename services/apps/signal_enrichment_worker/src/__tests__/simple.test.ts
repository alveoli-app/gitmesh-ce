describe('Simple Test', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2)
  })
  
  test('should import configuration', () => {
    const config = require('../conf')
    expect(config).toBeDefined()
    expect(config.default).toBeDefined()
    expect(config.default.batchProcessing).toBeDefined()
  })
})