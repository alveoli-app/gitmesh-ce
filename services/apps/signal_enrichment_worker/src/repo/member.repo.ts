import { getDatabaseConnection } from '@gitmesh/database'
import { getServiceLogger } from '@gitmesh/logging'
import { v4 as uuidv4 } from 'uuid'

const logger = getServiceLogger()

export interface MemberData {
  id: string
  displayName: string
  emails: string[]
  attributes: any
  tenantId: string
}

export interface MemberIdentityData {
  memberId: string
  platform: string
  username: string
  sourceId: string
  tenantId: string
  integrationId?: string
}

export class MemberRepository {
  private db: any

  constructor() {
    this.db = getDatabaseConnection()
  }

  /**
   * Create a new member record
   */
  async createMember(memberData: Partial<MemberData>): Promise<string> {
    try {
      const memberId = uuidv4()
      const now = new Date()

      const query = `
        INSERT INTO members (
          id, 
          "displayName", 
          emails, 
          attributes, 
          "joinedAt", 
          "tenantId",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          :id, 
          :displayName, 
          :emails, 
          :attributes, 
          :joinedAt, 
          :tenantId,
          :createdAt,
          :updatedAt
        )
        RETURNING id
      `

      const result = await this.db.query(query, {
        replacements: {
          id: memberId,
          displayName: memberData.displayName || 'Unknown',
          emails: JSON.stringify(memberData.emails || []),
          attributes: JSON.stringify(memberData.attributes || {}),
          joinedAt: now,
          tenantId: memberData.tenantId,
          createdAt: now,
          updatedAt: now,
        },
        type: this.db.QueryTypes.INSERT,
      })

      logger.debug('Created new member', { memberId, displayName: memberData.displayName })
      return memberId
    } catch (error) {
      logger.error('Failed to create member', { error, memberData })
      throw error
    }
  }

  /**
   * Find members by fuzzy matching on email, username, or display name
   */
  async findMembersByFuzzyMatch(
    searchTerm: string, 
    tenantId: string, 
    threshold: number = 0.85
  ): Promise<MemberData[]> {
    try {
      // Enable pg_trgm extension for similarity search
      const query = `
        SELECT DISTINCT
          m.id,
          m."displayName",
          m.emails,
          m.attributes,
          m."tenantId",
          GREATEST(
            similarity(m."displayName", :searchTerm),
            similarity(mi.username, :searchTerm),
            (
              SELECT MAX(similarity(email_elem, :searchTerm))
              FROM unnest(m.emails) AS email_elem
            )
          ) as similarity_score
        FROM members m
        LEFT JOIN "memberIdentities" mi ON m.id = mi."memberId"
        WHERE m."tenantId" = :tenantId
          AND m."deletedAt" IS NULL
          AND (
            similarity(m."displayName", :searchTerm) >= :threshold
            OR similarity(mi.username, :searchTerm) >= :threshold
            OR EXISTS (
              SELECT 1 FROM unnest(m.emails) AS email_elem
              WHERE similarity(email_elem, :searchTerm) >= :threshold
            )
          )
        ORDER BY similarity_score DESC
        LIMIT 10
      `

      const members = await this.db.query(query, {
        replacements: { searchTerm, tenantId, threshold },
        type: this.db.QueryTypes.SELECT,
      })

      logger.debug('Found members by fuzzy match', { 
        searchTerm, 
        tenantId, 
        threshold, 
        count: members.length 
      })

      return members
    } catch (error) {
      logger.error('Failed to find members by fuzzy match', { 
        error, 
        searchTerm, 
        tenantId, 
        threshold 
      })
      throw error
    }
  }

  /**
   * Get member by ID
   */
  async getMemberById(memberId: string): Promise<MemberData | null> {
    try {
      const query = `
        SELECT 
          id,
          "displayName",
          emails,
          attributes,
          "tenantId"
        FROM members
        WHERE id = :memberId AND "deletedAt" IS NULL
      `

      const result = await this.db.query(query, {
        replacements: { memberId },
        type: this.db.QueryTypes.SELECT,
      })

      return result.length > 0 ? result[0] : null
    } catch (error) {
      logger.error('Failed to get member by ID', { error, memberId })
      throw error
    }
  }
}