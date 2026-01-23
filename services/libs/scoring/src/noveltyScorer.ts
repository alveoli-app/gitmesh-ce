import { IActivityData } from '../../types/src/activities'
import { INoveltyScorer, NoveltyConfig, Cluster } from './types'

/**
 * Novelty scorer implementation
 * Computes novelty score based on cluster characteristics and member/platform novelty
 */
export class NoveltyScorer implements INoveltyScorer {
  private config: NoveltyConfig

  constructor(config: NoveltyConfig) {
    this.config = config
  }

  /**
   * Compute novelty score for an activity based on cluster information
   * @param activity The current activity
   * @param cluster Cluster information (null if activity is an outlier)
   * @returns Novelty score (0-100)
   */
  async computeScore(activity: IActivityData, cluster: Cluster | null): Promise<number> {
    // Cluster size component
    const clusterSizeScore = this.computeClusterSizeScore(cluster)
    
    // Cluster age component
    const clusterAgeScore = this.computeClusterAgeScore(cluster, new Date(activity.timestamp))
    
    // Member novelty component (based on activity characteristics)
    const memberNoveltyScore = this.computeMemberNoveltyScore(activity)
    
    // Platform novelty component
    const platformNoveltyScore = this.computePlatformNoveltyScore(activity.platform || 'unknown')

    // Combine scores with learned weights
    const totalScore = (
      clusterSizeScore * this.config.clusterSizeWeight +
      clusterAgeScore * this.config.clusterAgeWeight +
      memberNoveltyScore * this.config.memberNoveltyWeight +
      platformNoveltyScore * this.config.platformNoveltyWeight
    )

    // Normalize to 0-100 range
    const normalizedScore = Math.min(100, Math.max(0, totalScore))
    
    return Math.round(normalizedScore)
  }

  /**
   * Update novelty scoring configuration
   * @param config New novelty configuration
   */
  async updateConfig(config: NoveltyConfig): Promise<void> {
    this.config = config
  }

  /**
   * Get current configuration
   */
  getConfig(): NoveltyConfig {
    return { ...this.config }
  }

  /**
   * Compute cluster size score - smaller clusters are more novel
   */
  private computeClusterSizeScore(cluster: Cluster | null): number {
    if (!cluster) {
      // Outliers (not in any cluster) are highly novel
      return 90
    }

    // Inverse relationship: smaller clusters are more novel
    // Use logarithmic scaling to handle varying cluster sizes
    const sizeScore = Math.max(10, 100 - Math.log10(cluster.size + 1) * 20)
    
    return sizeScore
  }

  /**
   * Compute cluster age score - newer clusters are more novel
   */
  private computeClusterAgeScore(cluster: Cluster | null, currentTime: Date): number {
    if (!cluster) {
      // Outliers are considered new
      return 80
    }

    // Calculate cluster age in hours
    const clusterAgeHours = (currentTime.getTime() - cluster.firstSeen.getTime()) / (1000 * 60 * 60)
    
    // Exponential decay: newer clusters are more novel
    // Age score decreases as cluster gets older
    const maxAge = 24 * 7 // 1 week in hours
    const ageScore = Math.max(10, 90 * Math.exp(-clusterAgeHours / maxAge))
    
    return ageScore
  }

  /**
   * Compute member novelty score based on activity characteristics
   */
  private computeMemberNoveltyScore(activity: IActivityData): number {
    // Use activity score as a proxy for member novelty
    // Higher activity scores might indicate more novel/important content
    const baseScore = Math.max(0, activity.score || 0)
    
    // Check if this is a contribution (more novel)
    const contributionBonus = activity.isContribution ? 20 : 0
    
    // Normalize base score to 0-60 range using logarithmic scaling
    const normalizedScore = Math.min(60, Math.log10(baseScore + 1) * 15)
    
    return normalizedScore + contributionBonus
  }

  /**
   * Compute platform novelty score based on platform characteristics
   */
  private computePlatformNoveltyScore(platform: string): number {
    // Platform-specific novelty weights
    const platformNoveltyWeights: Record<string, number> = {
      'github': 70,        // Code-related activities often novel
      'git': 75,           // Direct code changes highly novel
      'devspace': 65,      // Project management updates
      'hackernews': 80,    // News and discussions often novel
      'reddit': 60,        // Community discussions
      'devto': 55,         // Blog posts and articles
      'discourse': 50,     // Forum discussions
      'twitter': 45,       // Social media updates
      'discord': 40,       // Chat messages
      'slack': 35,         // Team communication
      'groupsio': 45,      // Mailing list discussions
      'webhooks': 60,      // Automated events
      'default': 50
    }

    return platformNoveltyWeights[platform] || platformNoveltyWeights['default']
  }
}

/**
 * Default novelty configuration with learned weights
 */
export const DEFAULT_NOVELTY_CONFIG: NoveltyConfig = {
  clusterSizeWeight: 0.3,      // 30% weight for cluster size
  clusterAgeWeight: 0.25,      // 25% weight for cluster age
  memberNoveltyWeight: 0.25,   // 25% weight for member novelty
  platformNoveltyWeight: 0.2   // 20% weight for platform novelty
}