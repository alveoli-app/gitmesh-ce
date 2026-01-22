/**
 * SchemaCorrector - Provides automatic schema fixes and correction guidance
 * 
 * This class implements comprehensive schema correction including:
 * - Automatic schema fixes for common issues
 * - Specific correction guidance for syntax errors
 * - Invalid join detection and correction
 * 
 * Requirements: 2.2, 2.3, 2.4
 */

import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import {
  SchemaError,
  CubeValidationResult,
  ColumnInfo
} from './types'

export interface SchemaFix {
  type: 'column_rename' | 'column_add' | 'join_fix' | 'syntax_fix' | 'table_reference_fix'
  cubeName: string
  field: string
  originalValue: string
  suggestedValue: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  autoApplicable: boolean
}

export interface CorrectionGuidance {
  issue: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  steps: string[]
  examples: string[]
  references: string[]
}

export class SchemaCorrector {
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
   * Generate schema fixes for validation errors
   */
  async generateSchemaFixes(validationResult: CubeValidationResult): Promise<SchemaFix[]> {
    const fixes: SchemaFix[] = []

    for (const error of validationResult.errors) {
      const fix = await this.generateFixForError(error, validationResult)
      if (fix) {
        fixes.push(fix)
      }
    }

    return fixes
  }

  /**
   * Generate correction guidance for syntax errors
   */
  generateCorrectionGuidance(error: SchemaError): CorrectionGuidance {
    switch (error.type) {
      case 'missing_table':
        return this.generateMissingTableGuidance(error)
      case 'missing_column':
        return this.generateMissingColumnGuidance(error)
      case 'invalid_join':
        return this.generateInvalidJoinGuidance(error)
      case 'syntax_error':
        return this.generateSyntaxErrorGuidance(error)
      default:
        return this.generateGenericGuidance(error)
    }
  }

  /**
   * Detect and suggest corrections for invalid joins
   */
  async detectInvalidJoins(cubeName: string): Promise<SchemaFix[]> {
    try {
      const cubeDefinition = await this.loadCubeDefinition(cubeName)
      const joins = cubeDefinition.joins || {}
      const fixes: SchemaFix[] = []

      for (const [joinName, joinDef] of Object.entries(joins)) {
        const joinFixes = await this.analyzeJoin(cubeName, joinName, joinDef as any)
        fixes.push(...joinFixes)
      }

      return fixes
    } catch (error) {
      return []
    }
  }

  /**
   * Apply automatic fixes to cube definition
   */
  async applyAutomaticFixes(cubeName: string, fixes: SchemaFix[]): Promise<{applied: SchemaFix[], skipped: SchemaFix[]}> {
    const applied: SchemaFix[] = []
    const skipped: SchemaFix[] = []

    for (const fix of fixes) {
      if (fix.autoApplicable && fix.confidence === 'high') {
        try {
          await this.applyFix(cubeName, fix)
          applied.push(fix)
        } catch (error) {
          skipped.push({...fix, description: `${fix.description} (Failed to apply: ${error.message})`})
        }
      } else {
        skipped.push(fix)
      }
    }

    return { applied, skipped }
  }

  /**
   * Suggest column mappings based on similarity
   */
  async suggestColumnMappings(tableName: string, missingColumns: string[]): Promise<Record<string, string[]>> {
    try {
      const availableColumns = await this.getTableColumns(tableName)
      const suggestions: Record<string, string[]> = {}

      for (const missingColumn of missingColumns) {
        const similarColumns = this.findSimilarColumns(missingColumn, availableColumns)
        if (similarColumns.length > 0) {
          suggestions[missingColumn] = similarColumns
        }
      }

      return suggestions
    } catch (error) {
      return {}
    }
  }

  /**
   * Generate fix for a specific error
   */
  private async generateFixForError(error: SchemaError, validationResult: CubeValidationResult): Promise<SchemaFix | null> {
    switch (error.type) {
      case 'missing_column':
        return await this.generateMissingColumnFix(error, validationResult)
      case 'missing_table':
        return await this.generateMissingTableFix(error, validationResult)
      case 'invalid_join':
        return await this.generateInvalidJoinFix(error, validationResult)
      case 'syntax_error':
        return this.generateSyntaxErrorFix(error, validationResult)
      default:
        return null
    }
  }

  /**
   * Generate fix for missing column error
   */
  private async generateMissingColumnFix(error: SchemaError, validationResult: CubeValidationResult): Promise<SchemaFix | null> {
    try {
      const availableColumns = await this.getTableColumns(validationResult.tableName)
      const missingColumn = this.extractColumnNameFromError(error)
      
      if (!missingColumn) return null

      const similarColumns = this.findSimilarColumns(missingColumn, availableColumns)
      
      if (similarColumns.length > 0) {
        const bestMatch = similarColumns[0]
        return {
          type: 'column_rename',
          cubeName: error.cubeName,
          field: error.field,
          originalValue: missingColumn,
          suggestedValue: bestMatch,
          description: `Replace missing column '${missingColumn}' with similar column '${bestMatch}'`,
          confidence: this.calculateColumnSimilarityConfidence(missingColumn, bestMatch),
          autoApplicable: this.calculateColumnSimilarityConfidence(missingColumn, bestMatch) === 'high'
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Generate fix for missing table error
   */
  private async generateMissingTableFix(error: SchemaError, validationResult: CubeValidationResult): Promise<SchemaFix | null> {
    try {
      const availableTables = await this.getAvailableTables()
      const missingTable = validationResult.tableName
      
      const similarTables = this.findSimilarTableNames(missingTable, availableTables)
      
      if (similarTables.length > 0) {
        const bestMatch = similarTables[0]
        return {
          type: 'table_reference_fix',
          cubeName: error.cubeName,
          field: 'sql_table',
          originalValue: missingTable,
          suggestedValue: bestMatch,
          description: `Replace missing table '${missingTable}' with similar table '${bestMatch}'`,
          confidence: this.calculateTableSimilarityConfidence(missingTable, bestMatch),
          autoApplicable: false // Table changes should be manual
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Generate fix for invalid join error
   */
  private async generateInvalidJoinFix(error: SchemaError, validationResult: CubeValidationResult): Promise<SchemaFix | null> {
    const joinName = this.extractJoinNameFromField(error.field)
    if (!joinName) return null

    // Check if the referenced cube exists
    const cubeExists = await this.checkCubeExists(joinName)
    
    if (!cubeExists) {
      return {
        type: 'join_fix',
        cubeName: error.cubeName,
        field: error.field,
        originalValue: joinName,
        suggestedValue: '',
        description: `Remove invalid join '${joinName}' as the referenced cube does not exist`,
        confidence: 'high',
        autoApplicable: false // Join removal should be manual
      }
    }

    return null
  }

  /**
   * Generate fix for syntax error
   */
  private generateSyntaxErrorFix(error: SchemaError, validationResult: CubeValidationResult): SchemaFix | null {
    return {
      type: 'syntax_fix',
      cubeName: error.cubeName,
      field: error.field,
      originalValue: '',
      suggestedValue: '',
      description: `Manual syntax correction required: ${error.message}`,
      confidence: 'low',
      autoApplicable: false
    }
  }

  /**
   * Generate guidance for missing table errors
   */
  private generateMissingTableGuidance(error: SchemaError): CorrectionGuidance {
    return {
      issue: `Missing table or materialized view: ${error.message}`,
      severity: 'critical',
      steps: [
        'Check if the materialized view exists in the database',
        'Verify the table name spelling in the cube definition',
        'Ensure the materialized view is properly created and populated',
        'Check database connection and permissions'
      ],
      examples: [
        'sql_table: \'mv_organizations_cube\'',
        'sql_table: \'mv_members_cube\'',
        'sql_table: \'mv_activities_cube\''
      ],
      references: [
        'CubeJS sql_table documentation',
        'PostgreSQL materialized views guide'
      ]
    }
  }

  /**
   * Generate guidance for missing column errors
   */
  private generateMissingColumnGuidance(error: SchemaError): CorrectionGuidance {
    return {
      issue: `Missing column in table: ${error.message}`,
      severity: 'high',
      steps: [
        'Check if the column exists in the materialized view',
        'Verify column name spelling and case sensitivity',
        'Check if the column was renamed in a recent schema change',
        'Consider using a different available column',
        'Update the materialized view if the column should exist'
      ],
      examples: [
        'sql: `${CUBE}."tenantId"`',
        'sql: `${CUBE}."createdAt"`',
        'sql: `${CUBE}.id`'
      ],
      references: [
        'CubeJS dimensions documentation',
        'CubeJS measures documentation'
      ]
    }
  }

  /**
   * Generate guidance for invalid join errors
   */
  private generateInvalidJoinGuidance(error: SchemaError): CorrectionGuidance {
    return {
      issue: `Invalid join definition: ${error.message}`,
      severity: 'medium',
      steps: [
        'Check if the referenced cube exists',
        'Verify the join SQL syntax',
        'Ensure the relationship type is correct (hasMany, belongsTo, hasOne)',
        'Validate that the joined columns exist in both tables',
        'Consider removing the join if it\'s not needed'
      ],
      examples: [
        'sql: `${CUBE}.id = ${Members}."organizationId"`',
        'relationship: \'hasMany\'',
        'relationship: \'belongsTo\''
      ],
      references: [
        'CubeJS joins documentation',
        'CubeJS relationships guide'
      ]
    }
  }

  /**
   * Generate guidance for syntax errors
   */
  private generateSyntaxErrorGuidance(error: SchemaError): CorrectionGuidance {
    return {
      issue: `Syntax error in cube definition: ${error.message}`,
      severity: 'critical',
      steps: [
        'Check JavaScript syntax in the cube file',
        'Ensure all brackets and parentheses are properly closed',
        'Verify comma placement in object definitions',
        'Check for typos in property names',
        'Validate string quotes are properly escaped'
      ],
      examples: [
        'cube(\'CubeName\', { ... })',
        'measures: { count: { sql: `${CUBE}.id`, type: \'count\' } }',
        'dimensions: { id: { sql: `${CUBE}.id`, type: \'string\' } }'
      ],
      references: [
        'CubeJS cube definition guide',
        'JavaScript object syntax reference'
      ]
    }
  }

  /**
   * Generate generic guidance
   */
  private generateGenericGuidance(error: SchemaError): CorrectionGuidance {
    return {
      issue: error.message,
      severity: 'medium',
      steps: [
        'Review the error message for specific details',
        'Check the cube definition syntax',
        'Verify database schema alignment',
        'Consult CubeJS documentation for the specific feature'
      ],
      examples: [],
      references: [
        'CubeJS documentation',
        'CubeJS community forum'
      ]
    }
  }

  /**
   * Analyze a join definition for potential issues
   */
  private async analyzeJoin(cubeName: string, joinName: string, joinDef: any): Promise<SchemaFix[]> {
    const fixes: SchemaFix[] = []

    // Check if referenced cube exists
    const cubeExists = await this.checkCubeExists(joinName)
    if (!cubeExists) {
      fixes.push({
        type: 'join_fix',
        cubeName,
        field: `joins.${joinName}`,
        originalValue: joinName,
        suggestedValue: '',
        description: `Referenced cube '${joinName}' does not exist`,
        confidence: 'high',
        autoApplicable: false
      })
    }

    // Check relationship type
    if (joinDef.relationship) {
      const validRelationships = ['hasMany', 'belongsTo', 'hasOne']
      if (!validRelationships.includes(joinDef.relationship)) {
        fixes.push({
          type: 'join_fix',
          cubeName,
          field: `joins.${joinName}.relationship`,
          originalValue: joinDef.relationship,
          suggestedValue: 'belongsTo',
          description: `Invalid relationship type '${joinDef.relationship}', should be one of: ${validRelationships.join(', ')}`,
          confidence: 'high',
          autoApplicable: true
        })
      }
    }

    return fixes
  }

  /**
   * Apply a specific fix to a cube definition
   */
  private async applyFix(cubeName: string, fix: SchemaFix): Promise<void> {
    const cubeFilePath = path.join(this.schemaPath, `${cubeName}.js`)
    let content = fs.readFileSync(cubeFilePath, 'utf-8')

    switch (fix.type) {
      case 'column_rename':
        content = this.applyColumnRenameFix(content, fix)
        break
      case 'join_fix':
        content = this.applyJoinFix(content, fix)
        break
      // Add more fix types as needed
    }

    fs.writeFileSync(cubeFilePath, content, 'utf-8')
  }

  /**
   * Apply column rename fix to cube content
   */
  private applyColumnRenameFix(content: string, fix: SchemaFix): string {
    const regex = new RegExp(`\\$\\{CUBE\\}\\.["'\`]?${fix.originalValue}["'\`]?`, 'g')
    return content.replace(regex, `\${CUBE}."${fix.suggestedValue}"`)
  }

  /**
   * Apply join fix to cube content
   */
  private applyJoinFix(content: string, fix: SchemaFix): string {
    if (fix.field.includes('relationship')) {
      const regex = new RegExp(`relationship:\\s*['"\`]${fix.originalValue}['"\`]`, 'g')
      return content.replace(regex, `relationship: '${fix.suggestedValue}'`)
    }
    return content
  }

  /**
   * Find similar columns based on name similarity
   */
  private findSimilarColumns(targetColumn: string, availableColumns: ColumnInfo[]): string[] {
    const similarities = availableColumns.map(col => ({
      name: col.name,
      similarity: this.calculateStringSimilarity(targetColumn.toLowerCase(), col.name.toLowerCase())
    }))

    return similarities
      .filter(s => s.similarity > 0.6)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(s => s.name)
  }

  /**
   * Find similar table names
   */
  private findSimilarTableNames(targetTable: string, availableTables: string[]): string[] {
    const similarities = availableTables.map(table => ({
      name: table,
      similarity: this.calculateStringSimilarity(targetTable.toLowerCase(), table.toLowerCase())
    }))

    return similarities
      .filter(s => s.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(s => s.name)
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix = []
    const len1 = str1.length
    const len2 = str2.length

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    const maxLen = Math.max(len1, len2)
    return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen
  }

  /**
   * Calculate confidence level for column similarity
   */
  private calculateColumnSimilarityConfidence(original: string, suggested: string): 'high' | 'medium' | 'low' {
    const similarity = this.calculateStringSimilarity(original.toLowerCase(), suggested.toLowerCase())
    if (similarity > 0.9) return 'high'
    if (similarity > 0.7) return 'medium'
    return 'low'
  }

  /**
   * Calculate confidence level for table similarity
   */
  private calculateTableSimilarityConfidence(original: string, suggested: string): 'high' | 'medium' | 'low' {
    const similarity = this.calculateStringSimilarity(original.toLowerCase(), suggested.toLowerCase())
    if (similarity > 0.95) return 'high'
    if (similarity > 0.8) return 'medium'
    return 'low'
  }

  /**
   * Extract column name from error message or field
   */
  private extractColumnNameFromError(error: SchemaError): string | null {
    // Try to extract from message
    const messageMatch = error.message.match(/Column '(\w+)'/)
    if (messageMatch) return messageMatch[1]

    // Try to extract from field
    const fieldMatch = error.field.match(/\w+\.(\w+)$/)
    if (fieldMatch) return fieldMatch[1]

    return null
  }

  /**
   * Extract join name from field path
   */
  private extractJoinNameFromField(field: string): string | null {
    const match = field.match(/joins\.(\w+)/)
    return match ? match[1] : null
  }

  /**
   * Load cube definition from file (reused from SchemaValidator)
   */
  private async loadCubeDefinition(cubeName: string): Promise<any> {
    const cubeFilePath = path.join(this.schemaPath, `${cubeName}.js`)
    
    if (!fs.existsSync(cubeFilePath)) {
      throw new Error(`Cube file not found: ${cubeFilePath}`)
    }

    const cubeContent = fs.readFileSync(cubeFilePath, 'utf-8')
    return this.parseCubeDefinition(cubeContent)
  }

  /**
   * Parse cube definition from JavaScript content (reused from SchemaValidator)
   */
  private parseCubeDefinition(content: string): any {
    const cubeMatch = content.match(/cube\s*\(\s*['"`](\w+)['"`]\s*,\s*({[\s\S]*})\s*\)/)
    if (!cubeMatch) {
      throw new Error('Invalid cube definition format')
    }

    try {
      const configStr = cubeMatch[2]
      const config = eval(`(${configStr})`)
      return config
    } catch (error) {
      throw new Error(`Failed to parse cube definition: ${error.message}`)
    }
  }

  /**
   * Get table columns information (reused from SchemaValidator)
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
   * Get available tables and views
   */
  private async getAvailableTables(): Promise<string[]> {
    try {
      const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        UNION
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name
      `
      
      const result = await this.pool.query(query)
      return result.rows.map(row => row.table_name)
    } catch (error) {
      return []
    }
  }

  /**
   * Check if a cube exists (reused from SchemaValidator)
   */
  private async checkCubeExists(cubeName: string): Promise<boolean> {
    const cubeFilePath = path.join(this.schemaPath, `${cubeName}.js`)
    return fs.existsSync(cubeFilePath)
  }
}