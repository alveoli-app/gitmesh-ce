/**
 * Schema drift detector implementation for monitoring database schema changes
 * against cube definitions to identify and report discrepancies
 */

import { Pool } from 'pg'
import { createHash } from 'crypto'
import { SchemaDriftDetector } from './interfaces'
import {
  SchemaDriftReport,
  SchemaSnapshot,
  SchemaDrift,
  ColumnInfo,
  IndexInfo,
  ConstraintInfo,
  CubeConfig
} from './types'
import { Logger } from '@gitmesh/logging'

export class SchemaDriftDetectorImpl implements SchemaDriftDetector {
  private readonly logger: Logger
  private readonly pool: Pool
  private readonly cubeConfigs: CubeConfig[]
  private schemaSnapshots: Map<string, SchemaSnapshot> = new Map()

  constructor(pool: Pool, cubeConfigs: CubeConfig[], logger: Logger) {
    this.pool = pool
    this.cubeConfigs = cubeConfigs
    this.logger = logger
  }

  /**
   * Detects schema drift between cube definitions and actual database schema
   */
  async detectSchemaDrift(): Promise<SchemaDriftReport> {
    const startTime = Date.now()
    this.logger.info('Starting schema drift detection')

    const drifts: SchemaDrift[] = []
    const recommendations: string[] = []

    try {
      // Check each cube for schema drift
      for (const cubeConfig of this.cubeConfigs) {
        const cubeDrifts = await this.detectCubeSchemaDrift(cubeConfig)
        drifts.push(...cubeDrifts)
      }

      // Generate recommendations based on detected drifts
      const driftRecommendations = await this.generateDriftRecommendations(drifts)
      recommendations.push(...driftRecommendations)

      // Calculate statistics
      const driftsBySeverity = this.groupDriftsBySeverity(drifts)
      const driftsByType = this.groupDriftsByType(drifts)
      const overallStatus = this.determineOverallStatus(drifts)

      const report: SchemaDriftReport = {
        timestamp: new Date(),
        totalDrifts: drifts.length,
        driftsBySeverity,
        driftsByType,
        drifts,
        recommendations,
        overallStatus
      }

      this.logger.info(`Schema drift detection completed in ${Date.now() - startTime}ms`, {
        totalDrifts: drifts.length,
        overallStatus
      })

      return report
    } catch (error) {
      this.logger.error('Schema drift detection failed', { error: error.message })
      throw error
    }
  }

  /**
   * Creates a snapshot of the current database schema for a cube
   */
  async createSchemaSnapshot(cubeName: string): Promise<SchemaSnapshot> {
    const cubeConfig = this.cubeConfigs.find(c => c.name === cubeName)
    if (!cubeConfig) {
      throw new Error(`Cube configuration not found for: ${cubeName}`)
    }

    const tableName = this.extractTableNameFromSQL(cubeConfig.sql)
    
    try {
      const [columns, indexes, constraints] = await Promise.all([
        this.getTableColumns(tableName),
        this.getTableIndexes(tableName),
        this.getTableConstraints(tableName)
      ])

      const checksum = this.calculateSchemaChecksum(columns, indexes, constraints)

      const snapshot: SchemaSnapshot = {
        timestamp: new Date(),
        cubeName,
        tableName,
        columns,
        indexes,
        constraints,
        checksum
      }

      // Store snapshot for future comparisons
      this.schemaSnapshots.set(cubeName, snapshot)

      return snapshot
    } catch (error) {
      this.logger.error(`Failed to create schema snapshot for cube ${cubeName}`, {
        error: error.message,
        tableName
      })
      throw error
    }
  }

  /**
   * Compares two schema snapshots to identify changes
   */
  async compareSchemaSnapshots(previous: SchemaSnapshot, current: SchemaSnapshot): Promise<SchemaDrift[]> {
    const drifts: SchemaDrift[] = []

    // Compare columns
    const columnDrifts = this.compareColumns(previous, current)
    drifts.push(...columnDrifts)

    // Compare indexes
    const indexDrifts = this.compareIndexes(previous, current)
    drifts.push(...indexDrifts)

    // Compare constraints
    const constraintDrifts = this.compareConstraints(previous, current)
    drifts.push(...constraintDrifts)

    return drifts
  }

  /**
   * Generates recommendations for resolving schema drift
   */
  async generateDriftRecommendations(drifts: SchemaDrift[]): Promise<string[]> {
    const recommendations: string[] = []
    const driftsByType = this.groupDriftsByType(drifts)

    if (driftsByType.table_missing > 0) {
      recommendations.push('Create missing tables or update cube SQL to reference existing tables')
    }

    if (driftsByType.column_missing > 0) {
      recommendations.push('Add missing columns to database tables or update cube definitions to remove references')
    }

    if (driftsByType.column_type_changed > 0) {
      recommendations.push('Update cube measure and dimension types to match database column types')
    }

    if (driftsByType.column_added > 0) {
      recommendations.push('Consider adding new columns to cube definitions if they provide business value')
    }

    if (driftsByType.table_structure_changed > 0) {
      recommendations.push('Review and update cube joins and relationships to match current table structure')
    }

    // Add specific recommendations for critical drifts
    const criticalDrifts = drifts.filter(d => d.severity === 'critical')
    if (criticalDrifts.length > 0) {
      recommendations.push('Address critical schema drifts immediately to prevent query failures')
    }

    return recommendations
  }

  /**
   * Detects schema drift for a specific cube
   */
  private async detectCubeSchemaDrift(cubeConfig: CubeConfig): Promise<SchemaDrift[]> {
    const drifts: SchemaDrift[] = []
    const tableName = this.extractTableNameFromSQL(cubeConfig.sql)

    try {
      // Check if table exists
      const tableExists = await this.checkTableExists(tableName)
      if (!tableExists) {
        drifts.push({
          cubeName: cubeConfig.name,
          driftType: 'table_missing',
          severity: 'critical',
          description: `Table '${tableName}' referenced in cube does not exist`,
          expectedValue: tableName,
          actualValue: 'table not found',
          recommendation: `Create table '${tableName}' or update cube SQL to reference existing table`,
          detectedAt: new Date()
        })
        return drifts
      }

      // Get current schema snapshot
      const currentSnapshot = await this.createSchemaSnapshot(cubeConfig.name)
      
      // Compare with previous snapshot if available
      const previousSnapshot = this.schemaSnapshots.get(cubeConfig.name)
      if (previousSnapshot) {
        const snapshotDrifts = await this.compareSchemaSnapshots(previousSnapshot, currentSnapshot)
        drifts.push(...snapshotDrifts)
      }

      // Check cube-specific schema issues
      const cubeSpecificDrifts = await this.validateCubeAgainstSchema(cubeConfig, currentSnapshot)
      drifts.push(...cubeSpecificDrifts)

    } catch (error) {
      this.logger.error(`Failed to detect schema drift for cube ${cubeConfig.name}`, {
        error: error.message,
        tableName
      })
    }

    return drifts
  }

  /**
   * Validates cube definition against actual database schema
   */
  private async validateCubeAgainstSchema(cubeConfig: CubeConfig, snapshot: SchemaSnapshot): Promise<SchemaDrift[]> {
    const drifts: SchemaDrift[] = []

    // Check measures
    if (cubeConfig.measures) {
      for (const [measureName, measureConfig] of Object.entries(cubeConfig.measures)) {
        const measureDrifts = this.validateMeasureAgainstSchema(
          cubeConfig.name,
          measureName,
          measureConfig,
          snapshot
        )
        drifts.push(...measureDrifts)
      }
    }

    // Check dimensions
    if (cubeConfig.dimensions) {
      for (const [dimensionName, dimensionConfig] of Object.entries(cubeConfig.dimensions)) {
        const dimensionDrifts = this.validateDimensionAgainstSchema(
          cubeConfig.name,
          dimensionName,
          dimensionConfig,
          snapshot
        )
        drifts.push(...dimensionDrifts)
      }
    }

    return drifts
  }

  /**
   * Validates a measure definition against database schema
   */
  private validateMeasureAgainstSchema(
    cubeName: string,
    measureName: string,
    measureConfig: any,
    snapshot: SchemaSnapshot
  ): SchemaDrift[] {
    const drifts: SchemaDrift[] = []

    if (measureConfig.sql && typeof measureConfig.sql === 'string') {
      const referencedColumns = this.extractColumnReferences(measureConfig.sql)
      
      for (const columnName of referencedColumns) {
        const column = snapshot.columns.find(c => c.name === columnName)
        if (!column) {
          drifts.push({
            cubeName,
            driftType: 'column_missing',
            severity: 'high',
            description: `Column '${columnName}' referenced in measure '${measureName}' does not exist`,
            expectedValue: columnName,
            actualValue: 'column not found',
            recommendation: `Add column '${columnName}' to table or update measure SQL`,
            detectedAt: new Date()
          })
        }
      }
    }

    return drifts
  }

  /**
   * Validates a dimension definition against database schema
   */
  private validateDimensionAgainstSchema(
    cubeName: string,
    dimensionName: string,
    dimensionConfig: any,
    snapshot: SchemaSnapshot
  ): SchemaDrift[] {
    const drifts: SchemaDrift[] = []

    if (dimensionConfig.sql && typeof dimensionConfig.sql === 'string') {
      const referencedColumns = this.extractColumnReferences(dimensionConfig.sql)
      
      for (const columnName of referencedColumns) {
        const column = snapshot.columns.find(c => c.name === columnName)
        if (!column) {
          drifts.push({
            cubeName,
            driftType: 'column_missing',
            severity: 'high',
            description: `Column '${columnName}' referenced in dimension '${dimensionName}' does not exist`,
            expectedValue: columnName,
            actualValue: 'column not found',
            recommendation: `Add column '${columnName}' to table or update dimension SQL`,
            detectedAt: new Date()
          })
        }
      }
    }

    return drifts
  }

  /**
   * Compares columns between two schema snapshots
   */
  private compareColumns(previous: SchemaSnapshot, current: SchemaSnapshot): SchemaDrift[] {
    const drifts: SchemaDrift[] = []

    // Check for missing columns
    for (const prevColumn of previous.columns) {
      const currentColumn = current.columns.find(c => c.name === prevColumn.name)
      if (!currentColumn) {
        drifts.push({
          cubeName: current.cubeName,
          driftType: 'column_missing',
          severity: 'high',
          description: `Column '${prevColumn.name}' was removed from table`,
          expectedValue: prevColumn.name,
          actualValue: 'column not found',
          recommendation: `Restore column '${prevColumn.name}' or update cube definition`,
          detectedAt: new Date()
        })
      } else if (prevColumn.type !== currentColumn.type) {
        drifts.push({
          cubeName: current.cubeName,
          driftType: 'column_type_changed',
          severity: 'medium',
          description: `Column '${prevColumn.name}' type changed from ${prevColumn.type} to ${currentColumn.type}`,
          expectedValue: prevColumn.type,
          actualValue: currentColumn.type,
          recommendation: `Update cube measures/dimensions to handle new column type`,
          detectedAt: new Date()
        })
      }
    }

    // Check for new columns
    for (const currentColumn of current.columns) {
      const previousColumn = previous.columns.find(c => c.name === currentColumn.name)
      if (!previousColumn) {
        drifts.push({
          cubeName: current.cubeName,
          driftType: 'column_added',
          severity: 'low',
          description: `New column '${currentColumn.name}' added to table`,
          expectedValue: 'column not present',
          actualValue: currentColumn.name,
          recommendation: `Consider adding column to cube definition if useful for analytics`,
          detectedAt: new Date()
        })
      }
    }

    return drifts
  }

  /**
   * Compares indexes between two schema snapshots
   */
  private compareIndexes(previous: SchemaSnapshot, current: SchemaSnapshot): SchemaDrift[] {
    const drifts: SchemaDrift[] = []

    // Check for missing indexes
    for (const prevIndex of previous.indexes) {
      const currentIndex = current.indexes.find(i => i.name === prevIndex.name)
      if (!currentIndex) {
        drifts.push({
          cubeName: current.cubeName,
          driftType: 'table_structure_changed',
          severity: 'low',
          description: `Index '${prevIndex.name}' was removed`,
          expectedValue: prevIndex.name,
          actualValue: 'index not found',
          recommendation: `Consider recreating index for query performance`,
          detectedAt: new Date()
        })
      }
    }

    return drifts
  }

  /**
   * Compares constraints between two schema snapshots
   */
  private compareConstraints(previous: SchemaSnapshot, current: SchemaSnapshot): SchemaDrift[] {
    const drifts: SchemaDrift[] = []

    // Check for missing constraints
    for (const prevConstraint of previous.constraints) {
      const currentConstraint = current.constraints.find(c => c.name === prevConstraint.name)
      if (!currentConstraint) {
        drifts.push({
          cubeName: current.cubeName,
          driftType: 'table_structure_changed',
          severity: 'medium',
          description: `Constraint '${prevConstraint.name}' was removed`,
          expectedValue: prevConstraint.name,
          actualValue: 'constraint not found',
          recommendation: `Review data integrity implications and update cube joins if needed`,
          detectedAt: new Date()
        })
      }
    }

    return drifts
  }

  /**
   * Gets column information for a table
   */
  private async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `

    const result = await this.pool.query(query, [tableName])
    
    return result.rows.map(row => ({
      name: row.column_name,
      type: this.formatColumnType(row),
      nullable: row.is_nullable === 'YES',
      isPrimaryKey: false // Will be set by constraint check
    }))
  }

  /**
   * Gets index information for a table
   */
  private async getTableIndexes(tableName: string): Promise<IndexInfo[]> {
    const query = `
      SELECT 
        i.indexname as index_name,
        i.indexdef as index_definition,
        array_agg(a.attname ORDER BY a.attnum) as columns
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.tablename
      JOIN pg_index idx ON idx.indexrelid = (
        SELECT oid FROM pg_class WHERE relname = i.indexname
      )
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(idx.indkey)
      WHERE i.tablename = $1
      GROUP BY i.indexname, i.indexdef
    `

    const result = await this.pool.query(query, [tableName])
    
    return result.rows.map(row => ({
      name: row.index_name,
      columns: row.columns,
      unique: row.index_definition.includes('UNIQUE'),
      type: this.extractIndexType(row.index_definition)
    }))
  }

  /**
   * Gets constraint information for a table
   */
  private async getTableConstraints(tableName: string): Promise<ConstraintInfo[]> {
    const query = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        array_agg(kcu.column_name) as columns,
        ccu.table_name as referenced_table,
        array_agg(ccu.column_name) as referenced_columns
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = $1
      GROUP BY tc.constraint_name, tc.constraint_type, ccu.table_name
    `

    const result = await this.pool.query(query, [tableName])
    
    return result.rows.map(row => ({
      name: row.constraint_name,
      type: this.mapConstraintType(row.constraint_type),
      columns: row.columns.filter(Boolean),
      referencedTable: row.referenced_table,
      referencedColumns: row.referenced_columns?.filter(Boolean)
    }))
  }

  /**
   * Checks if a table exists in the database
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = $1
      )
    `
    
    const result = await this.pool.query(query, [tableName])
    return result.rows[0].exists
  }

  /**
   * Extracts table name from cube SQL
   */
  private extractTableNameFromSQL(sql: string): string {
    // Simple extraction - look for FROM clause
    const fromMatch = sql.match(/FROM\s+([`"]?)(\w+)\1/i)
    if (fromMatch) {
      return fromMatch[2]
    }
    
    // Fallback - look for table name patterns
    const tableMatch = sql.match(/(\w+)\.\*/i) || sql.match(/SELECT.*FROM\s+(\w+)/i)
    if (tableMatch) {
      return tableMatch[1]
    }
    
    throw new Error(`Could not extract table name from SQL: ${sql}`)
  }

  /**
   * Extracts column references from SQL
   */
  private extractColumnReferences(sql: string): string[] {
    const columns: string[] = []
    
    // Match column references like ${CUBE}.column_name or just column_name
    const columnMatches = sql.match(/\$\{[^}]+\}\.(\w+)|\b(\w+)\b/g)
    
    if (columnMatches) {
      for (const match of columnMatches) {
        if (match.includes('.')) {
          const column = match.split('.')[1]
          if (column && !columns.includes(column)) {
            columns.push(column)
          }
        } else if (match.match(/^\w+$/)) {
          if (!columns.includes(match)) {
            columns.push(match)
          }
        }
      }
    }
    
    return columns
  }

  /**
   * Formats column type information
   */
  private formatColumnType(row: any): string {
    let type = row.data_type
    
    if (row.character_maximum_length) {
      type += `(${row.character_maximum_length})`
    } else if (row.numeric_precision && row.numeric_scale) {
      type += `(${row.numeric_precision},${row.numeric_scale})`
    } else if (row.numeric_precision) {
      type += `(${row.numeric_precision})`
    }
    
    return type
  }

  /**
   * Extracts index type from index definition
   */
  private extractIndexType(indexDef: string): string {
    if (indexDef.includes('USING btree')) return 'btree'
    if (indexDef.includes('USING hash')) return 'hash'
    if (indexDef.includes('USING gin')) return 'gin'
    if (indexDef.includes('USING gist')) return 'gist'
    return 'btree' // default
  }

  /**
   * Maps database constraint types to our enum
   */
  private mapConstraintType(dbType: string): ConstraintInfo['type'] {
    switch (dbType.toLowerCase()) {
      case 'primary key': return 'primary_key'
      case 'foreign key': return 'foreign_key'
      case 'unique': return 'unique'
      case 'check': return 'check'
      default: return 'check'
    }
  }

  /**
   * Calculates a checksum for schema components
   */
  private calculateSchemaChecksum(columns: ColumnInfo[], indexes: IndexInfo[], constraints: ConstraintInfo[]): string {
    const data = JSON.stringify({ columns, indexes, constraints })
    return createHash('md5').update(data).digest('hex')
  }

  /**
   * Groups drifts by severity
   */
  private groupDriftsBySeverity(drifts: SchemaDrift[]): Record<string, number> {
    const groups: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    
    for (const drift of drifts) {
      groups[drift.severity]++
    }
    
    return groups
  }

  /**
   * Groups drifts by type
   */
  private groupDriftsByType(drifts: SchemaDrift[]): Record<string, number> {
    const groups: Record<string, number> = {
      table_missing: 0,
      column_missing: 0,
      column_type_changed: 0,
      column_added: 0,
      table_structure_changed: 0
    }
    
    for (const drift of drifts) {
      groups[drift.driftType]++
    }
    
    return groups
  }

  /**
   * Determines overall status based on drift severity
   */
  private determineOverallStatus(drifts: SchemaDrift[]): SchemaDriftReport['overallStatus'] {
    if (drifts.length === 0) return 'no_drift'
    
    const hasCritical = drifts.some(d => d.severity === 'critical')
    if (hasCritical) return 'critical_drift'
    
    const hasHigh = drifts.some(d => d.severity === 'high')
    if (hasHigh) return 'major_drift'
    
    return 'minor_drift'
  }
}