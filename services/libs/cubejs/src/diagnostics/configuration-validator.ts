/**
 * Configuration Validator for CubeJS
 * 
 * Validates environment variables, JWT token functionality, database connection parameters,
 * and Docker volume mounts to ensure proper CubeJS configuration.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { ConfigValidationResult } from './types';

export interface ConfigurationValidationOptions {
  validateJWT?: boolean;
  validateDatabase?: boolean;
  validateVolumeMounts?: boolean;
  validateEnvironment?: boolean;
}

export interface EnvironmentVariable {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

export interface VolumeMount {
  hostPath: string;
  containerPath: string;
  required: boolean;
  description: string;
}

export interface JWTValidationResult {
  isValid: boolean;
  canGenerate: boolean;
  canVerify: boolean;
  errors: string[];
}

export interface DatabaseConnectionValidationResult {
  isValid: boolean;
  canConnect: boolean;
  parametersValid: boolean;
  errors: string[];
}

export interface VolumeMountValidationResult {
  isValid: boolean;
  accessible: boolean;
  errors: string[];
  mountPath: string;
}

export interface EnvironmentValidationResult {
  isValid: boolean;
  missingRequired: string[];
  invalidValues: string[];
  errors: string[];
}

/**
 * ConfigurationValidator class for comprehensive CubeJS configuration validation
 */
export class ConfigurationValidator {
  private readonly requiredEnvironmentVariables: EnvironmentVariable[] = [
    {
      name: 'CUBEJS_DB_HOST',
      required: true,
      description: 'Database host for CubeJS connection'
    },
    {
      name: 'CUBEJS_DB_PORT',
      required: true,
      description: 'Database port for CubeJS connection',
      validator: (value: string) => {
        const port = parseInt(value, 10);
        return !isNaN(port) && port > 0 && port <= 65535;
      }
    },
    {
      name: 'CUBEJS_DB_NAME',
      required: true,
      description: 'Database name for CubeJS connection'
    },
    {
      name: 'CUBEJS_DB_USER',
      required: true,
      description: 'Database user for CubeJS connection'
    },
    {
      name: 'CUBEJS_DB_PASS',
      required: true,
      description: 'Database password for CubeJS connection'
    },
    {
      name: 'CUBEJS_DB_TYPE',
      required: true,
      description: 'Database type (should be postgres)',
      validator: (value: string) => value === 'postgres'
    },
    {
      name: 'CUBEJS_API_SECRET',
      required: true,
      description: 'API secret for CubeJS authentication',
      validator: (value: string) => value.length >= 32
    },
    {
      name: 'CUBEJS_DEV_MODE',
      required: false,
      description: 'Development mode flag',
      validator: (value: string) => ['true', 'false'].includes(value.toLowerCase())
    },
    {
      name: 'CUBEJS_EXTERNAL_DEFAULT',
      required: false,
      description: 'External default flag',
      validator: (value: string) => ['true', 'false'].includes(value.toLowerCase())
    },
    {
      name: 'CUBEJS_SCHEDULED_REFRESH_DEFAULT',
      required: false,
      description: 'Scheduled refresh default flag',
      validator: (value: string) => ['true', 'false'].includes(value.toLowerCase())
    }
  ];

  private readonly requiredVolumeMounts: VolumeMount[] = [
    {
      hostPath: './services/libs/cubejs',
      containerPath: '/cube/conf',
      required: true,
      description: 'CubeJS configuration and schema files mount'
    }
  ];

  /**
   * Validates all CubeJS configuration aspects
   * @param options Configuration validation options
   * @returns Promise<ConfigValidationResult> Comprehensive validation result
   */
  async validateConfiguration(options: ConfigurationValidationOptions = {}): Promise<ConfigValidationResult> {
    const {
      validateJWT = true,
      validateDatabase = true,
      validateVolumeMounts = true,
      validateEnvironment = true
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];
    const checkedItems: string[] = [];

    try {
      // Validate environment variables
      if (validateEnvironment) {
        const envResult = await this.validateEnvironmentVariables();
        checkedItems.push('Environment Variables');
        if (!envResult.isValid) {
          errors.push(...envResult.errors);
        }
      }

      // Validate JWT functionality
      if (validateJWT) {
        const jwtResult = await this.validateJWTFunctionality();
        checkedItems.push('JWT Token Functionality');
        if (!jwtResult.isValid) {
          errors.push(...jwtResult.errors);
        }
      }

      // Validate database connection parameters
      if (validateDatabase) {
        const dbResult = await this.validateDatabaseConnectionParameters();
        checkedItems.push('Database Connection Parameters');
        if (!dbResult.isValid) {
          errors.push(...dbResult.errors);
        }
      }

      // Validate Docker volume mounts
      if (validateVolumeMounts) {
        const volumeResult = await this.validateVolumeMounts();
        checkedItems.push('Docker Volume Mounts');
        if (!volumeResult.isValid) {
          errors.push(...volumeResult.errors);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        checkedItems
      };

    } catch (error) {
      errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isValid: false,
        errors,
        warnings,
        checkedItems
      };
    }
  }

  /**
   * Validates all required environment variables are present and valid
   * Requirement 6.1: Verify all required environment variables are present and valid
   */
  async validateEnvironmentVariables(): Promise<EnvironmentValidationResult> {
    const errors: string[] = [];
    const missingRequired: string[] = [];
    const invalidValues: string[] = [];

    for (const envVar of this.requiredEnvironmentVariables) {
      const value = process.env[envVar.name];

      if (envVar.required && (!value || value.trim() === '')) {
        missingRequired.push(envVar.name);
        errors.push(`Required environment variable ${envVar.name} is missing or empty. ${envVar.description}`);
        continue;
      }

      if (value && envVar.validator && !envVar.validator(value)) {
        invalidValues.push(envVar.name);
        errors.push(`Environment variable ${envVar.name} has invalid value: "${value}". ${envVar.description}`);
      }
    }

    return {
      isValid: errors.length === 0,
      missingRequired,
      invalidValues,
      errors
    };
  }

  /**
   * Validates JWT token generation and verification functionality
   * Requirement 6.2: Validate JWT token functionality
   */
  async validateJWTFunctionality(): Promise<JWTValidationResult> {
    const errors: string[] = [];
    let canGenerate = false;
    let canVerify = false;

    try {
      const secret = process.env.CUBEJS_API_SECRET;
      
      if (!secret) {
        errors.push('CUBEJS_API_SECRET environment variable is required for JWT functionality');
        return {
          isValid: false,
          canGenerate: false,
          canVerify: false,
          errors
        };
      }

      if (secret.length < 32) {
        errors.push('CUBEJS_API_SECRET should be at least 32 characters long for security');
      }

      // Test JWT token generation
      try {
        const testPayload = {
          tenantId: 'test-tenant',
          segments: ['test-segment'],
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours
        };

        const token = jwt.sign(testPayload, secret, { algorithm: 'HS256' });
        canGenerate = true;

        // Test JWT token verification
        try {
          const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
          if (decoded && typeof decoded === 'object' && 'tenantId' in decoded) {
            canVerify = true;
          } else {
            errors.push('JWT token verification succeeded but payload structure is invalid');
          }
        } catch (verifyError) {
          errors.push(`JWT token verification failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
        }

      } catch (signError) {
        errors.push(`JWT token generation failed: ${signError instanceof Error ? signError.message : String(signError)}`);
      }

    } catch (error) {
      errors.push(`JWT validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0 && canGenerate && canVerify,
      canGenerate,
      canVerify,
      errors
    };
  }

  /**
   * Validates database connection parameters match the PostgreSQL service
   * Requirement 6.4: Check that database connection parameters match the PostgreSQL service
   */
  async validateDatabaseConnectionParameters(): Promise<DatabaseConnectionValidationResult> {
    const errors: string[] = [];
    let canConnect = false;
    let parametersValid = true;

    try {
      // Validate required database parameters are present
      const requiredDbParams = ['CUBEJS_DB_HOST', 'CUBEJS_DB_PORT', 'CUBEJS_DB_NAME', 'CUBEJS_DB_USER', 'CUBEJS_DB_PASS'];
      const missingParams = requiredDbParams.filter(param => !process.env[param]);
      
      if (missingParams.length > 0) {
        parametersValid = false;
        errors.push(`Missing required database parameters: ${missingParams.join(', ')}`);
        return {
          isValid: false,
          canConnect: false,
          parametersValid: false,
          errors
        };
      }

      // Validate parameter formats
      const port = parseInt(process.env.CUBEJS_DB_PORT || '0', 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        parametersValid = false;
        errors.push(`Invalid database port: ${process.env.CUBEJS_DB_PORT}. Must be a number between 1 and 65535`);
      }

      if (process.env.CUBEJS_DB_TYPE !== 'postgres') {
        parametersValid = false;
        errors.push(`Invalid database type: ${process.env.CUBEJS_DB_TYPE}. Must be 'postgres'`);
      }

      // Test actual database connection
      if (parametersValid) {
        try {
          const pool = new Pool({
            host: process.env.CUBEJS_DB_HOST,
            port: parseInt(process.env.CUBEJS_DB_PORT || '5432', 10),
            database: process.env.CUBEJS_DB_NAME,
            user: process.env.CUBEJS_DB_USER,
            password: process.env.CUBEJS_DB_PASS,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 5000,
            max: 1 // Only one connection for testing
          });

          const client = await pool.connect();
          
          try {
            // Test basic connectivity
            const result = await client.query('SELECT version()');
            if (result.rows && result.rows.length > 0) {
              canConnect = true;
            }
          } finally {
            client.release();
            await pool.end();
          }

        } catch (connectionError) {
          errors.push(`Database connection test failed: ${connectionError instanceof Error ? connectionError.message : String(connectionError)}`);
        }
      }

    } catch (error) {
      errors.push(`Database parameter validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0 && parametersValid && canConnect,
      canConnect,
      parametersValid,
      errors
    };
  }

  /**
   * Validates Docker volume mounts and file accessibility
   * Requirement 6.5: Validate volume mounts and file accessibility
   */
  async validateVolumeMounts(): Promise<VolumeMountValidationResult> {
    const errors: string[] = [];
    let accessible = false;
    const mountPath = '/cube/conf';

    try {
      // Check if the mount path exists and is accessible
      if (fs.existsSync(mountPath)) {
        try {
          const stats = fs.statSync(mountPath);
          if (stats.isDirectory()) {
            accessible = true;

            // Check for required files and directories
            const requiredPaths = [
              'cube.js',
              'src',
              'src/schema'
            ];

            for (const requiredPath of requiredPaths) {
              const fullPath = path.join(mountPath, requiredPath);
              if (!fs.existsSync(fullPath)) {
                errors.push(`Required path not found in volume mount: ${requiredPath}`);
              }
            }

            // Check if schema directory has .js files
            const schemaPath = path.join(mountPath, 'src', 'schema');
            if (fs.existsSync(schemaPath)) {
              try {
                const schemaFiles = fs.readdirSync(schemaPath).filter(f => f.endsWith('.js'));
                if (schemaFiles.length === 0) {
                  errors.push('No schema files (.js) found in src/schema directory');
                }
              } catch (readError) {
                errors.push(`Cannot read schema directory: ${readError instanceof Error ? readError.message : String(readError)}`);
              }
            }

            // Test write permissions (create a temporary file)
            try {
              const testFile = path.join(mountPath, '.write-test');
              fs.writeFileSync(testFile, 'test');
              fs.unlinkSync(testFile);
            } catch (writeError) {
              errors.push(`Volume mount is not writable: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
            }

          } else {
            errors.push(`Volume mount path ${mountPath} exists but is not a directory`);
          }
        } catch (statError) {
          errors.push(`Cannot access volume mount path ${mountPath}: ${statError instanceof Error ? statError.message : String(statError)}`);
        }
      } else {
        errors.push(`Volume mount path ${mountPath} does not exist`);
      }

      // Additional validation for host path (if running in development)
      if (process.env.NODE_ENV === 'development' || process.env.CUBEJS_DEV_MODE === 'true') {
        const hostPath = './services/libs/cubejs';
        if (fs.existsSync(hostPath)) {
          try {
            const hostStats = fs.statSync(hostPath);
            if (!hostStats.isDirectory()) {
              errors.push(`Host path ${hostPath} exists but is not a directory`);
            }
          } catch (hostStatError) {
            errors.push(`Cannot access host path ${hostPath}: ${hostStatError instanceof Error ? hostStatError.message : String(hostStatError)}`);
          }
        } else {
          errors.push(`Host path ${hostPath} does not exist`);
        }
      }

    } catch (error) {
      errors.push(`Volume mount validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0 && accessible,
      accessible,
      errors,
      mountPath
    };
  }

  /**
   * Validates cube.js configuration file structure and content
   * Requirement 6.3: Validate cube.js configuration
   */
  async validateCubeJSConfiguration(): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checkedItems: string[] = ['CubeJS Configuration File'];

    try {
      const configPath = path.join(process.cwd(), 'cube.js');
      
      if (!fs.existsSync(configPath)) {
        errors.push('cube.js configuration file not found');
        return {
          isValid: false,
          errors,
          warnings,
          checkedItems
        };
      }

      // Read and validate configuration file
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        
        // Check for required configuration elements
        const requiredElements = [
          'repositoryFactory',
          'queryRewrite'
        ];

        for (const element of requiredElements) {
          if (!configContent.includes(element)) {
            errors.push(`Required configuration element '${element}' not found in cube.js`);
          }
        }

        // Check for repository factory implementation
        if (configContent.includes('repositoryFactory') && !configContent.includes('dataSchemaFiles')) {
          errors.push('repositoryFactory must implement dataSchemaFiles method');
        }

        // Check for query rewrite implementation
        if (configContent.includes('queryRewrite') && !configContent.includes('securityContext')) {
          warnings.push('queryRewrite should handle securityContext parameter');
        }

        // Try to require the configuration (syntax validation)
        try {
          delete require.cache[require.resolve(configPath)];
          const config = require(configPath);
          
          if (typeof config !== 'object' || config === null) {
            errors.push('cube.js must export a configuration object');
          } else {
            if (typeof config.repositoryFactory !== 'function') {
              errors.push('repositoryFactory must be a function');
            }
            
            if (typeof config.queryRewrite !== 'function') {
              errors.push('queryRewrite must be a function');
            }
          }
        } catch (requireError) {
          errors.push(`cube.js configuration has syntax errors: ${requireError instanceof Error ? requireError.message : String(requireError)}`);
        }

      } catch (readError) {
        errors.push(`Cannot read cube.js configuration file: ${readError instanceof Error ? readError.message : String(readError)}`);
      }

    } catch (error) {
      errors.push(`CubeJS configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      checkedItems
    };
  }

  /**
   * Generates a comprehensive configuration report
   */
  async generateConfigurationReport(): Promise<{
    timestamp: Date;
    overallStatus: 'healthy' | 'degraded' | 'critical';
    environment: EnvironmentValidationResult;
    jwt: JWTValidationResult;
    database: DatabaseConnectionValidationResult;
    volumeMounts: VolumeMountValidationResult;
    recommendations: string[];
  }> {
    const timestamp = new Date();
    const recommendations: string[] = [];

    const environment = await this.validateEnvironmentVariables();
    const jwt = await this.validateJWTFunctionality();
    const database = await this.validateDatabaseConnectionParameters();
    const volumeMounts = await this.validateVolumeMounts();

    // Generate recommendations based on findings
    if (!environment.isValid) {
      recommendations.push('Fix missing or invalid environment variables before starting CubeJS');
    }
    
    if (!jwt.isValid) {
      recommendations.push('Ensure CUBEJS_API_SECRET is properly configured for JWT functionality');
    }
    
    if (!database.isValid) {
      recommendations.push('Verify database connection parameters and PostgreSQL service availability');
    }
    
    if (!volumeMounts.isValid) {
      recommendations.push('Check Docker volume mounts and file permissions for CubeJS configuration');
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    const criticalIssues = [
      !environment.isValid && environment.missingRequired.length > 0,
      !database.isValid && !database.canConnect,
      !volumeMounts.isValid && !volumeMounts.accessible
    ].filter(Boolean).length;

    const degradedIssues = [
      !jwt.isValid,
      !database.parametersValid,
      environment.invalidValues.length > 0
    ].filter(Boolean).length;

    if (criticalIssues > 0) {
      overallStatus = 'critical';
    } else if (degradedIssues > 0) {
      overallStatus = 'degraded';
    }

    return {
      timestamp,
      overallStatus,
      environment,
      jwt,
      database,
      volumeMounts,
      recommendations
    };
  }
}