import { getServiceLogger } from '@gitmesh/logging'
import { ActivityData } from '../repo/activity.repo'
import { MemberRepository, MemberData } from '../repo/member.repo'
import { MemberIdentityRepository, MemberIdentityData } from '../repo/memberIdentity.repo'
import config from '../conf'

const logger = getServiceLogger()

export interface IdentityResolutionResult {
  memberId: string
  isNewMember: boolean
  isNewIdentity: boolean
}

export class IdentityService {
  private memberRepo: MemberRepository
  private memberIdentityRepo: MemberIdentityRepository

  constructor() {
    this.memberRepo = new MemberRepository()
    this.memberIdentityRepo = new MemberIdentityRepository()
  }

  /**
   * Resolve identity for an activity
   * This implements Requirements 3.1, 3.2, 3.3, 3.4, 3.7
   */
  async resolveIdentity(activity: ActivityData): Promise<IdentityResolutionResult> {
    try {
      logger.debug('Starting identity resolution', { 
        activityId: activity.id, 
        platform: activity.platform,
        sourceId: activity.sourceId 
      })

      // Extract identity information from activity
      const identityInfo = this.extractIdentityInfo(activity)
      
      if (!identityInfo.username && !identityInfo.sourceId) {
        throw new Error('No identity information found in activity')
      }

      // Step 1: Query memberIdentities table for existing platform identity (Requirement 3.1)
      let existingIdentity: MemberIdentityData | null = null

      // First try to find by platform and sourceId (most reliable)
      if (identityInfo.sourceId) {
        existingIdentity = await this.memberIdentityRepo.findByPlatformAndSourceId(
          activity.platform,
          identityInfo.sourceId,
          activity.tenantId
        )
      }

      // If not found by sourceId, try by platform and username
      if (!existingIdentity && identityInfo.username) {
        existingIdentity = await this.memberIdentityRepo.findByPlatformAndUsername(
          activity.platform,
          identityInfo.username,
          activity.tenantId
        )
      }

      // If existing identity found, return the member ID
      if (existingIdentity) {
        logger.debug('Found existing identity', { 
          activityId: activity.id,
          memberId: existingIdentity.memberId,
          platform: activity.platform 
        })
        
        return {
          memberId: existingIdentity.memberId,
          isNewMember: false,
          isNewIdentity: false,
        }
      }

      // Step 2: No exact match found, try fuzzy matching if enabled (Requirement 3.3, 3.4)
      let resolvedMemberId: string | null = null

      if (config.identityResolution.enableFuzzyMatching) {
        resolvedMemberId = await this.performFuzzyMatching(identityInfo, activity.tenantId)
      }

      let isNewMember = false

      // Step 3: Create new Member if no match found (Requirement 3.2)
      if (!resolvedMemberId) {
        resolvedMemberId = await this.createNewMember(identityInfo, activity.tenantId)
        isNewMember = true
        logger.debug('Created new member', { 
          activityId: activity.id,
          memberId: resolvedMemberId 
        })
      } else {
        logger.debug('Matched existing member via fuzzy matching', { 
          activityId: activity.id,
          memberId: resolvedMemberId 
        })
      }

      // Step 4: Create new MemberIdentity record (Requirement 3.2)
      await this.memberIdentityRepo.createMemberIdentity({
        memberId: resolvedMemberId,
        platform: activity.platform,
        username: identityInfo.username || identityInfo.sourceId || 'unknown',
        sourceId: identityInfo.sourceId || identityInfo.username || '',
        tenantId: activity.tenantId,
        integrationId: activity.integrationId,
      })

      logger.debug('Identity resolution completed', { 
        activityId: activity.id,
        memberId: resolvedMemberId,
        isNewMember,
        isNewIdentity: true 
      })

      return {
        memberId: resolvedMemberId,
        isNewMember,
        isNewIdentity: true,
      }

    } catch (error) {
      logger.error('Failed to resolve identity', { 
        error, 
        activityId: activity.id,
        platform: activity.platform 
      })
      throw error
    }
  }

  /**
   * Extract identity information from activity attributes
   */
  private extractIdentityInfo(activity: ActivityData): {
    username?: string
    email?: string
    displayName?: string
    sourceId?: string
  } {
    const attributes = activity.attributes || {}
    
    return {
      username: attributes.username || attributes.author?.username || attributes.user?.username,
      email: attributes.email || attributes.author?.email || attributes.user?.email,
      displayName: attributes.displayName || attributes.author?.displayName || attributes.user?.displayName || attributes.author?.name,
      sourceId: activity.sourceId,
    }
  }

  /**
   * Perform fuzzy matching to find similar members (Requirement 3.3, 3.4)
   */
  private async performFuzzyMatching(
    identityInfo: any, 
    tenantId: string
  ): Promise<string | null> {
    try {
      const threshold = config.identityResolution.fuzzyMatchingThreshold

      // Try fuzzy matching on different fields
      const searchTerms = [
        identityInfo.email,
        identityInfo.username,
        identityInfo.displayName,
      ].filter(Boolean)

      for (const searchTerm of searchTerms) {
        const matches = await this.memberRepo.findMembersByFuzzyMatch(
          searchTerm,
          tenantId,
          threshold
        )

        if (matches.length > 0) {
          // Return the best match (first one, as they're ordered by similarity)
          logger.debug('Fuzzy match found', { 
            searchTerm,
            memberId: matches[0].id,
            similarity: matches[0].similarity_score 
          })
          return matches[0].id
        }
      }

      return null
    } catch (error) {
      logger.error('Fuzzy matching failed', { error, identityInfo, tenantId })
      // Don't throw error, just return null to create new member
      return null
    }
  }

  /**
   * Create a new member record (Requirement 3.2)
   */
  private async createNewMember(identityInfo: any, tenantId: string): Promise<string> {
    const memberData: Partial<MemberData> = {
      displayName: identityInfo.displayName || identityInfo.username || 'Unknown User',
      emails: identityInfo.email ? [identityInfo.email] : [],
      attributes: {
        source: 'signal_enrichment',
        originalIdentity: identityInfo,
      },
      tenantId,
    }

    return await this.memberRepo.createMember(memberData)
  }
}