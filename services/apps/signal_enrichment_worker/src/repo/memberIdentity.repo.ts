import { getDatabaseConnection } from '@gitmesh/database'
import { getServiceLogger } from '@gitmesh/logging'

const logger = getServiceLogger()

export interface MemberIdentityData {
  memberId: string
  platform: string
  username: string
  sourceId: string
  tenantId: string
  integrationId?: string
}

export class MemberIdentityRepository {
  private db: any

  constructor() {
    this.db = getDatabaseConnection()
  }

  /**
   * Find existing member identity by platform and username
   */
  async findByPlatformAndUsername(
    platform: string, 
    username: string, 
    tenantId: string
  ): Promise<MemberIdentityData | null> {
    try {
      const query = `
        SELECT 
          "memberId",
          platform,
          username,
          "sourceId",
          "tenantId",
          "integrationId"
        FROM "memberIdentities"
        WHERE platform = :platform 
          AND username = :username 
          AND "tenantId" = :tenantId
        LIMIT 1
      `

      const result = await this.db.query(query, {
        replacements: { platform, username, tenantId },
        type: this.db.QueryTypes.SELECT,
      })

      if (result.length > 0) {
        logger.debug('Found existing member identity', { 
          platform, 
          username, 
          memberId: result[0].memberId 
        })
        return result[0]
      }

      return null
    } catch (error) {
      logger.error('Failed to find member identity', { error, platform, username, tenantId })
      throw error
    }
  }

  /**
   * Find existing member identity by platform and sourceId
   */
  async findByPlatformAndSourceId(
    platform: string, 
    sourceId: string, 
    tenantId: string
  ): Promise<MemberIdentityData | null> {
    try {
      const query = `
        SELECT 
          "memberId",
          platform,
          username,
          "sourceId",
          "tenantId",
          "integrationId"
        FROM "memberIdentities"
        WHERE platform = :platform 
          AND "sourceId" = :sourceId 
          AND "tenantId" = :tenantId
        LIMIT 1
      `

      const result = await this.db.query(query, {
        replacements: { platform, sourceId, tenantId },
        type: this.db.QueryTypes.SELECT,
      })

      if (result.length > 0) {
        logger.debug('Found existing member identity by sourceId', { 
          platform, 
          sourceId, 
          memberId: result[0].memberId 
        })
        return result[0]
      }

      return null
    } catch (error) {
      logger.error('Failed to find member identity by sourceId', { error, platform, sourceId, tenantId })
      throw error
    }
  }

  /**
   * Create a new member identity
   */
  async createMemberIdentity(identityData: MemberIdentityData): Promise<void> {
    try {
      const query = `
        INSERT INTO "memberIdentities" (
          "memberId",
          platform,
          username,
          "sourceId",
          "tenantId",
          "integrationId"
        )
        VALUES (
          :memberId,
          :platform,
          :username,
          :sourceId,
          :tenantId,
          :integrationId
        )
      `

      await this.db.query(query, {
        replacements: identityData,
        type: this.db.QueryTypes.INSERT,
      })

      logger.debug('Created new member identity', { 
        memberId: identityData.memberId,
        platform: identityData.platform,
        username: identityData.username 
      })
    } catch (error) {
      logger.error('Failed to create member identity', { error, identityData })
      throw error
    }
  }

  /**
   * Get all identities for a member
   */
  async getIdentitiesByMemberId(memberId: string): Promise<MemberIdentityData[]> {
    try {
      const query = `
        SELECT 
          "memberId",
          platform,
          username,
          "sourceId",
          "tenantId",
          "integrationId"
        FROM "memberIdentities"
        WHERE "memberId" = :memberId
        ORDER BY platform, username
      `

      const identities = await this.db.query(query, {
        replacements: { memberId },
        type: this.db.QueryTypes.SELECT,
      })

      logger.debug('Retrieved member identities', { memberId, count: identities.length })
      return identities
    } catch (error) {
      logger.error('Failed to get member identities', { error, memberId })
      throw error
    }
  }
}