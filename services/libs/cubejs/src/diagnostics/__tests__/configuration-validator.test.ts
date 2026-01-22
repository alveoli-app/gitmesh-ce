/**
 * Unit tests for ConfigurationValidator
 * 
 * Tests environment variable validation, JWT functionality, database connection parameters,
 * and Docker volume mount validation.
 */

import { ConfigurationValidator } from '../configuration-validator';

describe('ConfigurationValidator', () => {
  let validator: ConfigurationValidator;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    validator = new ConfigurationValidator();
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnvironmentVariables', () => {
    it('should pass with all required environment variables', async () => {
      // Set required environment variables
      process.env.CUBEJS_DB_HOST = 'localhost';
      process.env.CUBEJS_DB_PORT = '5432';
      process.env.CUBEJS_DB_NAME = 'testdb';
      process.env.CUBEJS_DB_USER = 'testuser';
      process.env.CUBEJS_DB_PASS = 'testpass';
      process.env.CUBEJS_DB_TYPE = 'postgres';
      process.env.CUBEJS_API_SECRET = 'a'.repeat(32); // 32 character secret

      const result = await validator.validateEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
      expect(result.invalidValues).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with missing required environment variables', async () => {
      // Clear required environment variables
      delete process.env.CUBEJS_DB_HOST;
      delete process.env.CUBEJS_DB_PORT;
      delete process.env.CUBEJS_API_SECRET;

      const result = await validator.validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.missingRequired).toContain('CUBEJS_DB_HOST');
      expect(result.missingRequired).toContain('CUBEJS_DB_PORT');
      expect(result.missingRequired).toContain('CUBEJS_API_SECRET');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail with invalid port value', async () => {
      process.env.CUBEJS_DB_HOST = 'localhost';
      process.env.CUBEJS_DB_PORT = 'invalid-port';
      process.env.CUBEJS_DB_NAME = 'testdb';
      process.env.CUBEJS_DB_USER = 'testuser';
      process.env.CUBEJS_DB_PASS = 'testpass';
      process.env.CUBEJS_DB_TYPE = 'postgres';
      process.env.CUBEJS_API_SECRET = 'a'.repeat(32);

      const result = await validator.validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.invalidValues).toContain('CUBEJS_DB_PORT');
      expect(result.errors.some(error => error.includes('invalid value'))).toBe(true);
    });

    it('should fail with invalid database type', async () => {
      process.env.CUBEJS_DB_HOST = 'localhost';
      process.env.CUBEJS_DB_PORT = '5432';
      process.env.CUBEJS_DB_NAME = 'testdb';
      process.env.CUBEJS_DB_USER = 'testuser';
      process.env.CUBEJS_DB_PASS = 'testpass';
      process.env.CUBEJS_DB_TYPE = 'mysql'; // Invalid type
      process.env.CUBEJS_API_SECRET = 'a'.repeat(32);

      const result = await validator.validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.invalidValues).toContain('CUBEJS_DB_TYPE');
    });
  });

  describe('validateJWTFunctionality', () => {
    it('should pass with valid JWT secret', async () => {
      process.env.CUBEJS_API_SECRET = 'a'.repeat(32); // 32 character secret

      const result = await validator.validateJWTFunctionality();

      expect(result.isValid).toBe(true);
      expect(result.canGenerate).toBe(true);
      expect(result.canVerify).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with missing JWT secret', async () => {
      delete process.env.CUBEJS_API_SECRET;

      const result = await validator.validateJWTFunctionality();

      expect(result.isValid).toBe(false);
      expect(result.canGenerate).toBe(false);
      expect(result.canVerify).toBe(false);
      expect(result.errors.some(error => error.includes('CUBEJS_API_SECRET'))).toBe(true);
    });

    it('should warn about short JWT secret', async () => {
      process.env.CUBEJS_API_SECRET = 'short'; // Less than 32 characters

      const result = await validator.validateJWTFunctionality();

      expect(result.errors.some(error => error.includes('at least 32 characters'))).toBe(true);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate all aspects when options are not specified', async () => {
      // Set minimal valid environment
      process.env.CUBEJS_DB_HOST = 'localhost';
      process.env.CUBEJS_DB_PORT = '5432';
      process.env.CUBEJS_DB_NAME = 'testdb';
      process.env.CUBEJS_DB_USER = 'testuser';
      process.env.CUBEJS_DB_PASS = 'testpass';
      process.env.CUBEJS_DB_TYPE = 'postgres';
      process.env.CUBEJS_API_SECRET = 'a'.repeat(32);

      const result = await validator.validateConfiguration();

      expect(result.checkedItems).toContain('Environment Variables');
      expect(result.checkedItems).toContain('JWT Token Functionality');
      expect(result.checkedItems).toContain('Database Connection Parameters');
      expect(result.checkedItems).toContain('Docker Volume Mounts');
    });

    it('should skip validation when options specify false', async () => {
      const result = await validator.validateConfiguration({
        validateJWT: false,
        validateDatabase: false,
        validateVolumeMounts: false,
        validateEnvironment: false
      });

      expect(result.checkedItems).toHaveLength(0);
      expect(result.isValid).toBe(true); // No validations run, so no errors
    });
  });

  describe('generateConfigurationReport', () => {
    it('should generate a comprehensive report', async () => {
      // Set minimal valid environment
      process.env.CUBEJS_DB_HOST = 'localhost';
      process.env.CUBEJS_DB_PORT = '5432';
      process.env.CUBEJS_DB_NAME = 'testdb';
      process.env.CUBEJS_DB_USER = 'testuser';
      process.env.CUBEJS_DB_PASS = 'testpass';
      process.env.CUBEJS_DB_TYPE = 'postgres';
      process.env.CUBEJS_API_SECRET = 'a'.repeat(32);

      const report = await validator.generateConfigurationReport();

      expect(report.timestamp).toBeInstanceOf(Date);
      expect(['healthy', 'degraded', 'critical']).toContain(report.overallStatus);
      expect(report.environment).toBeDefined();
      expect(report.jwt).toBeDefined();
      expect(report.database).toBeDefined();
      expect(report.volumeMounts).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should set critical status when there are critical issues', async () => {
      // Clear all environment variables to create critical issues
      delete process.env.CUBEJS_DB_HOST;
      delete process.env.CUBEJS_API_SECRET;

      const report = await validator.generateConfigurationReport();

      expect(report.overallStatus).toBe('critical');
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });
});