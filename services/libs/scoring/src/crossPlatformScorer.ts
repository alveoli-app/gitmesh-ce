import { IActivityData } from '../../types/src/activities'
import { ICrossPlatformScorer, CrossPlatformConfig } from './types'

/**
 * Cross-platform scorer implementation
 * Computes cross-platform score based on member's activity across different platforms
 */
export class CrossPlatformScorer implements ICrossPlatformScorer {
  private config: CrossPlatformConfig

  constructor(config: CrossPlatformConfig) {
    this.config = config
  }

  /**
   * Compute cross-platform score for an activity based on member's platform diversity
   * @param activity The current activity
   * @param memberPlatforms Array of platforms where the member is active
   * @returns Cross-platform score (0-100)
   */
  async computeScore(activity: IActivityData, memberPlatforms: string[]): Promise<number> {
    if (!memberPlatforms || memberPlatforms.length === 0) {
      return 0
    }

    const currentPlatform = activity.platform || 'unknown'
    
    // Platform diversity component
    const diversityScore = this.computePlatformDiversityScore(memberPlatforms)
    
    // Platform similarity component
    const similarityScore = this.computePlatformSimilarityScore(currentPlatform, memberPlatforms)
    
    // Recency component (higher score for platforms with recent activity)
    const recencyScore = this.computeRecencyScore(currentPlatform, memberPlatforms)
    
    // Combine scores with learned weights
    const totalScore = (
      diversityScore * this.config.platformDiversityWeight +
      similarityScore +
      recencyScore * this.config.recencyWeight
    )

    // Normalize to 0-100 range
    const normalizedScore = Math.min(100, Math.max(0, totalScore))
    
    return Math.round(normalizedScore)
  }

  /**
   * Update cross-platform scoring configuration
   * @param config New cross-platform configuration
   */
  async updateConfig(config: CrossPlatformConfig): Promise<void> {
    this.config = config
  }

  /**
   * Get current configuration
   */
  getConfig(): CrossPlatformConfig {
    return { ...this.config }
  }

  /**
   * Compute platform diversity score based on number of platforms
   */
  private computePlatformDiversityScore(memberPlatforms: string[]): number {
    const uniquePlatforms = new Set(memberPlatforms).size
    
    // Logarithmic scaling for platform count
    // More platforms = higher diversity score
    return Math.log10(uniquePlatforms + 1) * 30
  }

  /**
   * Compute platform similarity score based on learned platform relationships
   */
  private computePlatformSimilarityScore(currentPlatform: string, memberPlatforms: string[]): number {
    let totalSimilarity = 0
    let count = 0

    for (const platform of memberPlatforms) {
      if (platform !== currentPlatform) {
        const similarity = this.getPlatformSimilarity(currentPlatform, platform)
        totalSimilarity += similarity
        count++
      }
    }

    if (count === 0) {
      return 0
    }

    // Average similarity score, scaled to 0-40 range
    return (totalSimilarity / count) * 40
  }

  /**
   * Compute recency score (placeholder - would need activity timestamps)
   */
  private computeRecencyScore(currentPlatform: string, memberPlatforms: string[]): number {
    // For now, give higher score if the current platform is in member's platforms
    return memberPlatforms.includes(currentPlatform) ? 30 : 10
  }

  /**
   * Get similarity score between two platforms from configuration
   */
  private getPlatformSimilarity(platform1: string, platform2: string): number {
    const similarities = this.config.platformSimilarity[platform1]
    if (similarities && similarities[platform2] !== undefined) {
      return similarities[platform2]
    }

    // Default similarity for unknown platform pairs
    return 0.5
  }
}

/**
 * Default cross-platform configuration with learned platform similarities
 */
export const DEFAULT_CROSS_PLATFORM_CONFIG: CrossPlatformConfig = {
  platformDiversityWeight: 0.4,
  recencyWeight: 0.3,
  platformSimilarity: {
    'github': {
      'git': 0.9,
      'devspace': 0.8,
      'discourse': 0.6,
      'hackernews': 0.5,
      'devto': 0.5,
      'reddit': 0.4,
      'slack': 0.3,
      'discord': 0.3,
      'twitter': 0.2,
      'groupsio': 0.2,
      'webhooks': 0.4
    },
    'reddit': {
      'hackernews': 0.7,
      'discourse': 0.6,
      'devto': 0.5,
      'twitter': 0.4,
      'github': 0.4,
      'discord': 0.3,
      'slack': 0.2,
      'git': 0.1,
      'devspace': 0.2,
      'groupsio': 0.3,
      'webhooks': 0.2
    },
    'discord': {
      'slack': 0.8,
      'groupsio': 0.6,
      'reddit': 0.3,
      'twitter': 0.3,
      'discourse': 0.4,
      'github': 0.3,
      'hackernews': 0.2,
      'devto': 0.2,
      'git': 0.1,
      'devspace': 0.2,
      'webhooks': 0.3
    },
    'twitter': {
      'reddit': 0.4,
      'hackernews': 0.3,
      'devto': 0.4,
      'discord': 0.3,
      'slack': 0.2,
      'discourse': 0.3,
      'github': 0.2,
      'git': 0.1,
      'devspace': 0.2,
      'groupsio': 0.2,
      'webhooks': 0.3
    },
    'slack': {
      'discord': 0.8,
      'groupsio': 0.5,
      'github': 0.3,
      'devspace': 0.4,
      'discourse': 0.3,
      'reddit': 0.2,
      'twitter': 0.2,
      'hackernews': 0.2,
      'devto': 0.2,
      'git': 0.2,
      'webhooks': 0.4
    },
    'devspace': {
      'github': 0.8,
      'git': 0.7,
      'slack': 0.4,
      'discourse': 0.3,
      'webhooks': 0.5,
      'reddit': 0.2,
      'twitter': 0.2,
      'discord': 0.2,
      'hackernews': 0.2,
      'devto': 0.3,
      'groupsio': 0.2
    },
    'discourse': {
      'reddit': 0.6,
      'hackernews': 0.5,
      'github': 0.6,
      'devto': 0.4,
      'groupsio': 0.5,
      'discord': 0.4,
      'slack': 0.3,
      'twitter': 0.3,
      'git': 0.3,
      'devspace': 0.3,
      'webhooks': 0.3
    },
    'hackernews': {
      'reddit': 0.7,
      'discourse': 0.5,
      'devto': 0.6,
      'github': 0.5,
      'twitter': 0.3,
      'discord': 0.2,
      'slack': 0.2,
      'git': 0.3,
      'devspace': 0.2,
      'groupsio': 0.3,
      'webhooks': 0.2
    },
    'devto': {
      'hackernews': 0.6,
      'reddit': 0.5,
      'github': 0.5,
      'discourse': 0.4,
      'twitter': 0.4,
      'discord': 0.2,
      'slack': 0.2,
      'git': 0.3,
      'devspace': 0.3,
      'groupsio': 0.2,
      'webhooks': 0.2
    },
    'groupsio': {
      'discord': 0.6,
      'slack': 0.5,
      'discourse': 0.5,
      'reddit': 0.3,
      'hackernews': 0.3,
      'github': 0.2,
      'twitter': 0.2,
      'devto': 0.2,
      'git': 0.1,
      'devspace': 0.2,
      'webhooks': 0.3
    },
    'git': {
      'github': 0.9,
      'devspace': 0.7,
      'discourse': 0.3,
      'hackernews': 0.3,
      'devto': 0.3,
      'slack': 0.2,
      'reddit': 0.1,
      'twitter': 0.1,
      'discord': 0.1,
      'groupsio': 0.1,
      'webhooks': 0.4
    },
    'webhooks': {
      'devspace': 0.5,
      'github': 0.4,
      'slack': 0.4,
      'git': 0.4,
      'discord': 0.3,
      'discourse': 0.3,
      'twitter': 0.3,
      'groupsio': 0.3,
      'reddit': 0.2,
      'hackernews': 0.2,
      'devto': 0.2
    }
  }
}