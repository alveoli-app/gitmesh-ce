/**
 * SchemaValidator - Validates cube definitions against database structure
 * 
 * This class implements comprehensive schema validation including:
 * - Cube schema validation against database structure
 * - Materialized view column verification
 * - Join relationship validation
 * 
 * Requirements: 1.4, 2.1, 2.5
 */

import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import {
  SchemaValidator as ISchemaValidator,
  CubeValidationResult,
  MaterializedViewStatus,
  SchemaError,
  SchemaWarning,
  ColumnInfo,
  MaterializedViewInfo
} from './types'

export class SchemaValidator implements ISchemaValidator {
  private pool: Pool
  private schemaPath: string

  constructor(pool: Pool, schemaPath?: string) {
    this.pool = pool
    this.schemaPath = schemaPath || this.findSchemaPath()
  }

  /**
   * Find the schema path by checking multiple possible locations
   */
  private findSchemaPath(): string {
    const possiblePaths = [
      path.join(__dirname, '..', 'schema'),
      path.join(__dirname, 'schema'),
      path.join(process.cwd(), 'src', 'schema'),
      path.join(process.cwd(), 'schema')
    ]

    for (const schemaPath of possiblePaths) {
      if (fs.existsSync(schemaPath)) {
        return schemaPath
      }
    }

    throw new Error('Schema directory not found in any expected location')
  }

  /**
   * Validates a specific cube definition against database structure
   */
  async validateCube(cubeName: string): Promise<CubeValidationResult> {
    try {
      const cubeDefinition = await this.loadCubeDefinition(cubeName)
      const tableName = this.extractTableName(cubeDefinition)
      
      // Check if table/view exists
      const tableExists = await this.checkTableExists(tableName)
      if (!tableExists) {
        return {
          cubeName,
          isValid: false,
          errors: [{
            type: 'missing_table',
            cubeName,
            field: 'sql_table',
            message: `Table or view '${tableName}' does not exist`,
            suggestion: `Ensure the materialized view '${tableName}' is created and accessible`
          }],
          warnings: [],
          tableName,
          missingColumns: [],
          invalidJoins: []
        }
      }

      // Get table columns
      const tableColumns = await this.getTableColumns(tableName)
      
      // Validate cube definition
      const errors: SchemaError[] = []
      const warnings: SchemaWarning[] = []
      const missingColumns: string[] = []
      const invalidJoins: string[] = []

      // Validate dimensions
      const dimensions = this.extractDimensions(cubeDefinition)
      for (const [dimName, dimDef] of Object.entries(dimensions)) {
        const columnName = this.extractColumnName(dimDef.sql)
        if (columnName && !this.columnExists(columnName, tableColumns)) {
          missingColumns.push(columnName)
          errors.push({
            type: 'missing_column',
            cubeName,
            field: `dimensions.${dimName}`,
            message: `Column '${columnName}' referenced in dimension '${dimName}' does not exist in table '${tableName}'`,
            suggestion: `Check if column '${columnName}' exists in the materialized view or update the dimension definition`
          })
        }
      }

      // Validate measures
      const measures = this.extractMeasures(cubeDefinition)
      for (const [measureName, measureDef] of Object.entries(measures)) {
        if (measureDef.sql && measureDef.sql !== `${cubeName}.id`) {
          const columnName = this.extractColumnName(measureDef.sql)
          if (columnName && !this.columnExists(columnName, tableColumns)) {
            missingColumns.push(columnName)
            errors.push({
              type: 'missing_column',
              cubeName,
              field: `measures.${measureName}`,
              message: `Column '${columnName}' referenced in measure '${measureName}' does not exist in table '${tableName}'`,
              suggestion: `Check if column '${columnName}' exists in the materialized view or update the measure definition`
            })
          }
        }
      }

      // Validate joins
      const joins = this.extractJoins(cubeDefinition)
      for (const [joinName, joinDef] of Object.entries(joins)) {
        const joinValidation = await this.validateJoin(cubeName, joinName, joinDef, tableName)
        if (!joinValidation.isValid) {
          invalidJoins.push(joinName)
          errors.push({
            type: 'invalid_join',
            cubeName,
            field: `joins.${joinName}`,
            message: joinValidation.error || `Invalid join definition for '${joinName}'`,
            suggestion: joinValidation.suggestion || `Review the join relationship and ensure referenced tables exist`
          })
        }
      }

      return {
        cubeName,
        isValid: errors.length === 0,
        errors,
        warnings,
        tableName,
        missingColumns: [...new Set(missingColumns)],
        invalidJoins
      }

    } catch (error) {
      return {
        cubeName,
        isValid: false,
        errors: [{
          type: 'syntax_error',
          cubeName,
          field: 'cube_definition',
          message: `Failed to validate cube: ${error.message}`,
          suggestion: 'Check cube definition syntax and ensure the file is valid JavaScript'
        }],
        warnings: [],
        tableName: '',
        missingColumns: [],
        invalidJoins: []
      }
    }
  }

  /**
   * Validates all cube definitions in the system
   */
  async validateAllCubes(): Promise<CubeValidationResult[]> {
    const cubeFiles = this.getCubeFiles()
    const results: CubeValidationResult[] = []

    for (const cubeFile of cubeFiles) {
      const cubeName = path.basename(cubeFile, '.js')
      const result = await this.validateCube(cubeName)
      results.push(result)
    }

    return results
  }

  /**
   * Checks the status of all materialized views
   */
  async checkMaterializedViews(): Promise<MaterializedViewStatus[]> {
    try {
      const query = `
        SELECT 
          schemaname,
          matviewname as viewname,
          hasindexes,
          ispopulated
        FROM pg_matviews 
        WHERE schemaname = 'public'
        ORDER BY matviewname
      `
      
      const result = await this.pool.query(query)
      const materializedViews: MaterializedViewStatus[] = []

      for (const row of result.rows) {
        const viewName = row.viewname
        const columnCount = await this.getColumnCount(viewName)
        
        materializedViews.push({
          viewName,
          exists: true,
          accessible: row.ispopulated,
          columnCount,
          lastChecked: new Date()
        })
      }

      return materializedViews
    } catch (error) {
      throw new Error(`Failed to check materialized views: ${error.message}`)
    }
  }

  /**
   * Load cube definition from file
   */
  private async loadCubeDefinition(cubeName: string): Promise<any> {
    const cubeFilePath = path.join(this.schemaPath, `${cubeName}.js`)
    
    if (!fs.existsSync(cubeFilePath)) {
      throw new Error(`Cube file not found: ${cubeFilePath}`)
    }

    const cubeContent = fs.readFileSync(cubeFilePath, 'utf-8')
    
    // Parse the cube definition (simplified approach)
    // In a real implementation, you might want to use a proper JS parser
    return this.parseCubeDefinition(cubeContent)
  }

  /**
   * Parse cube definition from JavaScript content
   */
  private parseCubeDefinition(content: string): any {
    // This is a simplified parser - in production you might want to use a proper JS parser
    const cubeMatch = content.match(/cube\s*\(\s*['"`](\w+)['"`]\s*,\s*({[\s\S]*})\s*\)/)
    if (!cubeMatch) {
      throw new Error('Invalid cube definition format')
    }

    try {
      // Extract the cube configuration object
      const configStr = cubeMatch[2]
      // This is a simplified approach - you might want to use a proper JS parser
      const config = eval(`(${configStr})`)
      return config
    } catch (error) {
      throw new Error(`Failed to parse cube definition: ${error.message}`)
    }
  }

  /**
   * Extract table name from cube definition
   */
  private extractTableName(cubeDefinition: any): string {
    return cubeDefinition.sql_table || cubeDefinition.sql || ''
  }

  /**
   * Extract dimensions from cube definition
   */
  private extractDimensions(cubeDefinition: any): Record<string, any> {
    return cubeDefinition.dimensions || {}
  }

  /**
   * Extract measures from cube definition
   */
  private extractMeasures(cubeDefinition: any): Record<string, any> {
    return cubeDefinition.measures || {}
  }

  /**
   * Extract joins from cube definition
   */
  private extractJoins(cubeDefinition: any): Record<string, any> {
    return cubeDefinition.joins || {}
  }

  /**
   * Extract column name from SQL expression
   */
  private extractColumnName(sql: string): string | null {
    if (!sql) return null
    
    // Handle ${CUBE}."columnName" format
    const cubeColumnMatch = sql.match(/\$\{CUBE\}\.["'`]?(\w+)["'`]?/)
    if (cubeColumnMatch) {
      return cubeColumnMatch[1]
    }

    // Handle direct column references
    const directColumnMatch = sql.match(/["'`]?(\w+)["'`]?/)
    if (directColumnMatch) {
      return directColumnMatch[1]
    }

    return null
  }

  /**
   * Check if table exists in database
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const query = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_name = $1 AND table_schema = 'public'
        ) OR EXISTS (
          SELECT 1 
          FROM information_schema.views 
          WHERE table_name = $1 AND table_schema = 'public'
        ) as exists
      `
      
      const result = await this.pool.query(query, [tableName])
      return result.rows[0].exists
    } catch (error) {
      return false
    }
  }

  /**
   * Get table columns information
   */
  private async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    try {
      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1
            AND tc.table_schema = 'public'
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_name = $1 AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
      `
      
      const result = await this.pool.query(query, [tableName])
      
      return result.rows.map(row => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        isPrimaryKey: row.is_primary_key
      }))
    } catch (error) {
      return []
    }
  }

  /**
   * Check if column exists in table columns
   */
  private columnExists(columnName: string, columns: ColumnInfo[]): boolean {
    return columns.some(col => col.name === columnName)
  }

  /**
   * Get column count for a table
   */
  private async getColumnCount(tableName: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
      `
      
      const result = await this.pool.query(query, [tableName])
      return parseInt(result.rows[0].count)
    } catch (error) {
      return 0
    }
  }

  /**
   * Validate a join definition
   */
  private async validateJoin(cubeName: string, joinName: string, joinDef: any, currentTable: string): Promise<{isValid: boolean, error?: string, suggestion?: string}> {
    try {
      // Check if the joined cube/table exists
      const joinedCubeName = joinName
      const joinedCubeExists = await this.checkCubeExists(joinedCubeName)
      
      if (!joinedCubeExists) {
        return {
          isValid: false,
          error: `Referenced cube '${joinedCubeName}' in join does not exist`,
          suggestion: `Ensure cube '${joinedCubeName}' is defined or remove the join`
        }
      }

      // Validate join SQL syntax (basic validation)
      if (!joinDef.sql) {
        return {
          isValid: false,
          error: `Join '${joinName}' is missing SQL definition`,
          suggestion: `Add SQL definition for join '${joinName}'`
        }
      }

      // Check relationship type
      const validRelationships = ['hasMany', 'belongsTo', 'hasOne']
      if (joinDef.relationship && !validRelationships.includes(joinDef.relationship)) {
        return {
          isValid: false,
          error: `Invalid relationship type '${joinDef.relationship}' in join '${joinName}'`,
          suggestion: `Use one of: ${validRelationships.join(', ')}`
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to validate join: ${error.message}`,
        suggestion: 'Check join definition syntax and referenced cubes'
      }
    }
  }

  /**
   * Check if a cube exists
   */
  private async checkCubeExists(cubeName: string): Promise<boolean> {
    const cubeFilePath = path.join(this.schemaPath, `${cubeName}.js`)
    return fs.existsSync(cubeFilePath)
  }

  /**
   * Get all cube files in the schema directory
   */
  private getCubeFiles(): string[] {
    try {
      return fs.readdirSync(this.schemaPath)
        .filter(file => file.endsWith('.js'))
        .map(file => path.join(this.schemaPath, file))
    } catch (error) {
      return []
    }
  }
}