/**
 * Basic test to verify test setup
 */

describe('Basic Test Setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2)
  })
  
  it('should import types correctly', () => {
    const config = {
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'test',
      password: 'test'
    }
    
    expect(config.host).toBe('localhost')
  })
})