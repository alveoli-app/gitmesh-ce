import { IActivityData } from '../../types/src/activities'
import { IVelocityScorer, VelocityConfig } from './types'

/**
 * Velocity scorer implementation
 * Computes velocity score based on member's activity frequency in a time window
 */
export class VelocityScorer implements IVelocityScorer {
  private config: VelocityConfig

  constructor(config: VelocityConfig) {
    this.config = config
  }

  /**
   * Compute velocity score for an activity based on member's recent activity history
   * @param activity The current activity
   * @param memberHistory Array of member's activities in the time window
   * @returns Velocity score (0-100)
   */
  async computeScore(activity: IActivityData, memberHistory: IActivityData[]): Promise<number> {
    if (!memberHistory || memberHistory.length === 0) {
      return 0
    }

    const currentTime = new Date(activity.timestamp)
    const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000

    // Filter activities within the time window
    const recentActivities = memberHistory.filter(act => {
      const activityTime = new Date(act.timestamp)
      const timeDiff = currentTime.getTime() - activityTime.getTime()
      return timeDiff >= 0 && timeDiff <= timeWindowMs
    })

    if (recentActivities.length === 0) {
      return 0
    }

    // Compute weighted score for each activity
    let totalScore = 0
    for (const act of recentActivities) {
      const activityWeight = this.getActivityWeight(act)
      const platformWeight = this.getPlatformWeight(act.platform || 'unknown')
      const typeWeight = this.getTypeWeight(act.type)
      const timeDecay = this.getTimeDecay(currentTime, new Date(act.timestamp))

      totalScore += activityWeight * platformWeight * typeWeight * timeDecay
    }

    // Normalize to 0-100 range
    // Use logarithmic scaling to handle varying activity levels
    const normalizedScore = Math.min(100, Math.log10(totalScore + 1) * 25)
    
    return Math.round(normalizedScore)
  }

  /**
   * Update velocity scoring configuration
   * @param config New velocity configuration
   */
  async updateConfig(config: VelocityConfig): Promise<void> {
    this.config = config
  }

  /**
   * Get current configuration
   */
  getConfig(): VelocityConfig {
    return { ...this.config }
  }

  /**
   * Get base activity weight (can be extended with ML-based scoring)
   */
  private getActivityWeight(activity: IActivityData): number {
    // Use existing score as base weight, with minimum of 1
    return Math.max(1, activity.score || 1)
  }

  /**
   * Get platform-specific weight from configuration
   */
  private getPlatformWeight(platform: string): number {
    return this.config.platformWeights[platform] || this.config.platformWeights['default'] || 1.0
  }

  /**
   * Get activity type weight from configuration
   */
  private getTypeWeight(type: string): number {
    return this.config.typeWeights[type] || this.config.typeWeights['default'] || 1.0
  }

  /**
   * Calculate time decay factor based on activity age
   */
  private getTimeDecay(currentTime: Date, activityTime: Date): number {
    const timeDiffHours = (currentTime.getTime() - activityTime.getTime()) / (1000 * 60 * 60)
    
    // Exponential decay: newer activities have higher weight
    return Math.exp(-this.config.decayFactor * timeDiffHours)
  }
}

/**
 * Default velocity configuration
 */
export const DEFAULT_VELOCITY_CONFIG: VelocityConfig = {
  timeWindowHours: 24,
  decayFactor: 0.1, // Decay rate per hour
  platformWeights: {
    'github': 1.2,
    'reddit': 1.0,
    'discord': 0.8,
    'twitter': 0.9,
    'slack': 0.7,
    'devspace': 1.1,
    'discourse': 1.0,
    'hackernews': 1.1,
    'devto': 1.0,
    'groupsio': 0.8,
    'git': 1.3,
    'webhooks': 1.0,
    'default': 1.0
  },
  typeWeights: {
    'issue-created': 1.5,
    'issue-updated': 1.2,
    'pull-request-opened': 1.8,
    'pull-request-merged': 2.0,
    'commit': 1.4,
    'comment': 1.0,
    'post': 1.1,
    'message': 0.8,
    'reaction': 0.5,
    'default': 1.0
  }
}