/**
 * ConnectionTester implementation for PostgreSQL connectivity validation
 * 
 * This class provides comprehensive database connectivity testing including:
 * - PostgreSQL connection validation
 * - Materialized view accessibility testing
 * - Connection pool health monitoring
 * - Configuration validation
 */

import { Pool, PoolClient, PoolConfig } from 'pg'
import { getServiceChildLogger } from '@gitmesh/logging'
import {
  ConnectionTester,
  ConnectionResult,
  ConfigValidationResult,
  ViewAccessResult,
  DatabaseConfig,
  MaterializedViewInfo,
  ColumnInfo
} from './interfaces'
import { retryDatabaseConnection, retryQuery, CircuitBreaker } from './retry-logic'

const logger = getServiceChildLogger('cubejs-connection-tester')

export class PostgreSQLConnectionTester implements ConnectionTester {
  private pool: Pool | null = null
  private config: DatabaseConfig
  private circuitBreaker: CircuitBreaker

  constructor(config: DatabaseConfig) {
    this.config = config
    this.circuitBreaker = new CircuitBreaker(5, 60000) // 5 failures, 1 minute recovery
  }

  /**
   * Tests the database connection with configured credentials
   */
  async testDatabaseConnection(): Promise<ConnectionResult> {
    const startTime = Date.now()
    
    const result = await retryDatabaseConnection(async () => {
      return await this.circuitBreaker.execute(async () => {
        // Create a temporary pool for testing
        const testPool = new Pool({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          ssl: this.config.ssl,
          max: 1, // Single connection for testing
          idleTimeoutMillis: 5000,
          connectionTimeoutMillis: 10000
        })

        let client: PoolClient | null = null
        
        try {
          // Test connection
          client = await testPool.connect()
          
          // Get PostgreSQL version
          const versionResult = await client.query('SELECT version()')
          const postgresVersion = versionResult.rows[0]?.version || 'Unknown'
          
          // Get available tables (including materialized views)
          const tablesResult = await client.query(`
            SELECT schemaname, tablename, 'table' as type
            FROM pg_tables 
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
            UNION ALL
            SELECT schemaname, matviewname as tablename, 'materialized_view' as type
            FROM pg_matviews
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
            ORDER BY schemaname, tablename
          `)
          
          const availableTables = tablesResult.rows.map(row => 
            `${row.schemaname}.${row.tablename} (${row.type})`
          )
          
          return {
            postgresVersion: postgresVersion.split(' ')[0],
            availableTables
          }
          
        } finally {
          if (client) {
            client.release()
          }
          await testPool.end()
        }
      })
    })
    
    const connectionTime = Date.now() - startTime
    
    if (result.success && result.result) {
      logger.info('Database connection test successful', {
        connectionTime,
        attempts: result.attempts,
        postgresVersion: result.result.postgresVersion,
        tableCount: result.result.availableTables.length
      })
      
      return {
        isConnected: true,
        connectionTime,
        postgresVersion: result.result.postgresVersion,
        availableTables: result.result.availableTables
      }
    } else {
      const errorMessage = result.error?.message || 'Unknown error'
      
      logger.error('Database connection test failed after retries', {
        error: errorMessage,
        attempts: result.attempts,
        totalTime: result.totalTime,
        config: {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.user
        }
      })
      
      return {
        isConnected: false,
        connectionTime,
        error: errorMessage,
        postgresVersion: 'Unknown',
        availableTables: []
      }
    }
  }

  /**
   * Validates CubeJS configuration parameters
   */
  async validateConfiguration(): Promise<ConfigValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const checkedItems: string[] = []

    // Check required configuration fields
    if (!this.config.host) {
      errors.push('Database host is required')
    } else {
      checkedItems.push('Database host')
    }

    if (!this.config.port || this.config.port <= 0 || this.config.port > 65535) {
      errors.push('Valid database port is required (1-65535)')
    } else {
      checkedItems.push('Database port')
    }

    if (!this.config.database) {
      errors.push('Database name is required')
    } else {
      checkedItems.push('Database name')
    }

    if (!this.config.user) {
      errors.push('Database user is required')
    } else {
      checkedItems.push('Database user')
    }

    if (!this.config.password) {
      errors.push('Database password is required')
    } else {
      checkedItems.push('Database password')
    }

    // Check optional configuration
    if (this.config.poolSize && (this.config.poolSize < 1 || this.config.poolSize > 100)) {
      warnings.push('Pool size should be between 1 and 100')
    } else if (this.config.poolSize) {
      checkedItems.push('Connection pool size')
    }

    // Check environment variables
    const envVars = [
      'CUBEJS_DB_HOST',
      'CUBEJS_DB_PORT', 
      'CUBEJS_DB_NAME',
      'CUBEJS_DB_USER',
      'CUBEJS_DB_PASS'
    ]

    for (const envVar of envVars) {
      if (!process.env[envVar]) {
        warnings.push(`Environment variable ${envVar} is not set`)
      } else {
        checkedItems.push(`Environment variable ${envVar}`)
      }
    }

    const isValid = errors.length === 0

    logger.info('Configuration validation completed', {
      isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
      checkedItemCount: checkedItems.length
    })

    return {
      isValid,
      errors,
      warnings,
      checkedItems
    }
  }

  /**
   * Checks access to all materialized views used by CubeJS
   */
  async checkMaterializedViewAccess(): Promise<ViewAccessResult[]> {
    const results: ViewAccessResult[] = []
    
    // Known materialized views used by CubeJS cubes
    const materializedViews = [
      'mv_organizations',
      'mv_members', 
      'mv_activities',
      'mv_segments'
    ]

    try {
      const pool = await this.getPool()
      
      for (const viewName of materializedViews) {
        const result = await retryQuery(async () => {
          return await this.circuitBreaker.execute(async () => {
            const client = await pool.connect()
            
            try {
              // Check if view exists and is accessible
              const existsResult = await client.query(`
                SELECT COUNT(*) as count
                FROM pg_matviews 
                WHERE matviewname = $1
              `, [viewName])
              
              const exists = parseInt(existsResult.rows[0]?.count || '0') > 0
              
              if (exists) {
                // Try to get column count
                const columnsResult = await client.query(`
                  SELECT COUNT(*) as count
                  FROM information_schema.columns 
                  WHERE table_name = $1
                `, [viewName])
                
                const columnCount = parseInt(columnsResult.rows[0]?.count || '0')
                
                return {
                  accessible: true,
                  columnCount
                }
              } else {
                return {
                  accessible: false,
                  error: 'Materialized view does not exist',
                  columnCount: 0
                }
              }
              
            } finally {
              client.release()
            }
          })
        })
        
        if (result.success && result.result) {
          results.push({
            viewName,
            ...result.result
          })
          
          if (result.result.accessible) {
            logger.debug(`Materialized view ${viewName} is accessible`, {
              columnCount: result.result.columnCount,
              attempts: result.attempts
            })
          } else {
            logger.warn(`Materialized view ${viewName} is not accessible`, {
              error: result.result.error
            })
          }
        } else {
          const errorMessage = result.error?.message || 'Unknown error'
          
          results.push({
            viewName,
            accessible: false,
            error: errorMessage,
            columnCount: 0
          })
          
          logger.error(`Failed to access materialized view ${viewName} after retries`, {
            error: errorMessage,
            attempts: result.attempts
          })
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // If we can't even get a pool, mark all views as inaccessible
      for (const viewName of materializedViews) {
        results.push({
          viewName,
          accessible: false,
          error: `Pool connection failed: ${errorMessage}`,
          columnCount: 0
        })
      }
      
      logger.error('Failed to check materialized view access', {
        error: errorMessage
      })
    }

    return results
  }

  /**
   * Gets detailed information about materialized views
   */
  async getMaterializedViewInfo(viewName: string): Promise<MaterializedViewInfo> {
    try {
      const pool = await this.getPool()
      const client = await pool.connect()
      
      try {
        // Check if view exists
        const existsResult = await client.query(`
          SELECT 
            schemaname,
            matviewname,
            definition,
            ispopulated
          FROM pg_matviews 
          WHERE matviewname = $1
        `, [viewName])
        
        if (existsResult.rows.length === 0) {
          return {
            viewName,
            exists: false,
            columns: []
          }
        }
        
        // Get column information
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [viewName])
        
        const columns: ColumnInfo[] = columnsResult.rows.map(row => ({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          isPrimaryKey: false // Materialized views don't have primary keys
        }))
        
        // Get row count if populated
        let rowCount: number | undefined
        if (existsResult.rows[0].ispopulated) {
          try {
            const countResult = await client.query(`SELECT COUNT(*) as count FROM ${viewName}`)
            rowCount = parseInt(countResult.rows[0]?.count || '0')
          } catch (error) {
            logger.warn(`Could not get row count for ${viewName}`, {
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
        
        return {
          viewName,
          exists: true,
          columns,
          rowCount
        }
        
      } finally {
        client.release()
      }
      
    } catch (error) {
      logger.error(`Failed to get materialized view info for ${viewName}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        viewName,
        exists: false,
        columns: []
      }
    }
  }

  /**
   * Gets or creates the connection pool
   */
  private async getPool(): Pool {
    if (!this.pool) {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl,
        max: this.config.poolSize || 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      }
      
      this.pool = new Pool(poolConfig)
      
      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.error('PostgreSQL pool error', {
          error: err.message
        })
      })
      
      logger.info('PostgreSQL connection pool created', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        maxConnections: poolConfig.max
      })
    }
    
    return this.pool
  }

  /**
   * Monitors connection pool health
   */
  async getPoolHealth(): Promise<{
    totalCount: number
    idleCount: number
    waitingCount: number
  }> {
    if (!this.pool) {
      return {
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0
      }
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    }
  }

  /**
   * Closes the connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      logger.info('PostgreSQL connection pool closed')
    }
  }
}

/**
 * Factory function to create ConnectionTester from environment variables
 */
export function createConnectionTesterFromEnv(): PostgreSQLConnectionTester {
  const config: DatabaseConfig = {
    host: process.env.CUBEJS_DB_HOST || 'localhost',
    port: parseInt(process.env.CUBEJS_DB_PORT || '5432'),
    database: process.env.CUBEJS_DB_NAME || 'devspace',
    user: process.env.CUBEJS_DB_USER || 'devspace',
    password: process.env.CUBEJS_DB_PASS || 'devspace',
    ssl: process.env.CUBEJS_DB_SSL === 'true',
    poolSize: process.env.CUBEJS_DB_POOL_SIZE ? parseInt(process.env.CUBEJS_DB_POOL_SIZE) : 10
  }

  return new PostgreSQLConnectionTester(config)
}