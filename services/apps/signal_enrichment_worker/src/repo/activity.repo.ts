import { getDatabaseConnection } from '@gitmesh/database'
import { getServiceLogger } from '@gitmesh/logging'

const logger = getServiceLogger()

export interface ActivityData {
  id: string
  type: string
  platform: string
  timestamp: Date
  sourceId: string
  memberId?: string
  attributes: any
  body?: string
  title?: string
  url?: string
  tenantId: string
  integrationId?: string
  signalMetadata?: any
}

export class ActivityRepository {
  private db: any

  constructor() {
    this.db = getDatabaseConnection()
  }

  /**
   * Fetch activities that haven't been enriched with signal metadata
   */
  async fetchUnenrichedActivities(batchSize: number, tenantId?: string): Promise<ActivityData[]> {
    try {
      const whereClause = tenantId ? 'WHERE a."tenantId" = :tenantId AND' : 'WHERE'
      
      const query = `
        SELECT 
          a.id,
          a.type,
          a.platform,
          a.timestamp,
          a."sourceId",
          a."memberId",
          a.attributes,
          a.body,
          a.title,
          a.url,
          a."tenantId",
          a."integrationId",
          a.signal_metadata as "signalMetadata"
        FROM activities a
        ${whereClause} (a.signal_metadata IS NULL OR a.signal_metadata = '{}')
        ORDER BY a.timestamp DESC
        LIMIT :batchSize
      `

      const activities = await this.db.query(query, {
        replacements: { batchSize, tenantId },
        type: this.db.QueryTypes.SELECT,
      })

      logger.debug('Fetched unenriched activities', { 
        count: activities.length, 
        tenantId,
        batchSize 
      })

      return activities
    } catch (error) {
      logger.error('Failed to fetch unenriched activities', { error, batchSize, tenantId })
      throw error
    }
  }

  /**
   * Update activity with resolved member ID
   */
  async updateActivityMember(activityId: string, memberId: string): Promise<void> {
    try {
      const query = `
        UPDATE activities 
        SET "memberId" = :memberId
        WHERE id = :activityId
      `

      await this.db.query(query, {
        replacements: { activityId, memberId },
        type: this.db.QueryTypes.UPDATE,
      })

      logger.debug('Updated activity member', { activityId, memberId })
    } catch (error) {
      logger.error('Failed to update activity member', { error, activityId, memberId })
      throw error
    }
  }

  /**
   * Update activity with signal metadata
   */
  async updateSignalMetadata(activityId: string, metadata: any): Promise<void> {
    try {
      const query = `
        UPDATE activities 
        SET signal_metadata = :metadata
        WHERE id = :activityId
      `

      await this.db.query(query, {
        replacements: { 
          activityId, 
          metadata: JSON.stringify(metadata) 
        },
        type: this.db.QueryTypes.UPDATE,
      })

      logger.debug('Updated signal metadata', { activityId, metadata })
    } catch (error) {
      logger.error('Failed to update signal metadata', { error, activityId, metadata })
      throw error
    }
  }
}