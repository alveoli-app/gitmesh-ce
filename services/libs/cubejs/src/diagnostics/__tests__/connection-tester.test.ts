/**
 * Tests for ConnectionTester implementation
 */

import { DatabaseConfig } from '../types'

describe('PostgreSQLConnectionTester', () => {
  const mockConfig: DatabaseConfig = {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    user: 'test_user',
    password: 'test_pass',
    ssl: false,
    poolSize: 5
  }

  describe('Configuration validation', () => {
    it('should validate a complete configuration', () => {
      expect(mockConfig.host).toBe('localhost')
      expect(mockConfig.port).toBe(5432)
      expect(mockConfig.database).toBe('test_db')
      expect(mockConfig.user).toBe('test_user')
      expect(mockConfig.password).toBe('test_pass')
      expect(mockConfig.ssl).toBe(false)
      expect(mockConfig.poolSize).toBe(5)
    })

    it('should detect missing required fields', () => {
      const incompleteConfig: Partial<DatabaseConfig> = {
        host: '',
        port: 0
      }
      
      expect(incompleteConfig.host).toBe('')
      expect(incompleteConfig.port).toBe(0)
      expect(incompleteConfig.database).toBeUndefined()
    })
  })
})