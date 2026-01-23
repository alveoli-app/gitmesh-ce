import { IActivityData } from '../../types/src/activities'
import { IActionabilityScorer, ActionabilityConfig, Classification } from './types'

/**
 * Actionability scorer implementation
 * Computes actionability score based on intent classification, urgency, and platform factors
 */
export class ActionabilityScorer implements IActionabilityScorer {
  private config: ActionabilityConfig

  constructor(config: ActionabilityConfig) {
    this.config = config
  }

  /**
   * Compute actionability score for an activity based on classification results
   * @param activity The current activity
   * @param classification Classification results (intent, urgency, sentiment, etc.)
   * @returns Actionability score (0-100)
   */
  async computeScore(activity: IActivityData, classification: Classification): Promise<number> {
    if (!classification) {
      return 0
    }

    // Intent component - multiple intents can contribute
    const intentScore = this.computeIntentScore(classification.intent)
    
    // Urgency component
    const urgencyScore = this.computeUrgencyScore(classification.urgency)
    
    // Platform component
    const platformScore = this.computePlatformScore(activity.platform || 'unknown')
    
    // Member engagement component (based on activity score as proxy)
    const engagementScore = this.computeEngagementScore(activity)
    
    // Confidence adjustment - lower confidence reduces actionability
    const confidenceMultiplier = Math.max(0.1, classification.confidence)

    // Combine scores with learned weights
    const totalScore = (
      intentScore * 
      urgencyScore * 
      platformScore * 
      (1 + engagementScore * this.config.memberEngagementWeight)
    ) * confidenceMultiplier

    // Normalize to 0-100 range
    const normalizedScore = Math.min(100, Math.max(0, totalScore))
    
    return Math.round(normalizedScore)
  }

  /**
   * Update actionability scoring configuration
   * @param config New actionability configuration
   */
  async updateConfig(config: ActionabilityConfig): Promise<void> {
    this.config = config
  }

  /**
   * Get current configuration
   */
  getConfig(): ActionabilityConfig {
    return { ...this.config }
  }

  /**
   * Compute intent score based on classification intents
   */
  private computeIntentScore(intents: string[]): number {
    if (!intents || intents.length === 0) {
      return this.config.intentWeights['unknown'] || 0.2
    }

    // Take the maximum intent weight (most actionable intent)
    let maxScore = 0
    for (const intent of intents) {
      const weight = this.config.intentWeights[intent] || this.config.intentWeights['default'] || 0.5
      maxScore = Math.max(maxScore, weight)
    }

    return maxScore
  }

  /**
   * Compute urgency score based on classification urgency
   */
  private computeUrgencyScore(urgency: string): number {
    if (!urgency) {
      return this.config.urgencyWeights['unknown'] || 0.3
    }

    return this.config.urgencyWeights[urgency] || this.config.urgencyWeights['default'] || 0.5
  }

  /**
   * Compute platform score based on platform actionability
   */
  private computePlatformScore(platform: string): number {
    return this.config.platformWeights[platform] || this.config.platformWeights['default'] || 1.0
  }

  /**
   * Compute engagement score based on activity characteristics
   */
  private computeEngagementScore(activity: IActivityData): number {
    // Use activity score as a proxy for engagement potential
    const baseScore = Math.max(0, activity.score || 0)
    
    // Normalize to 0-1 range using logarithmic scaling
    return Math.min(1, Math.log10(baseScore + 1) / 2)
  }
}

/**
 * Default actionability configuration with learned weights
 */
export const DEFAULT_ACTIONABILITY_CONFIG: ActionabilityConfig = {
  intentWeights: {
    'bug_report': 0.9,        // High actionability - needs fixing
    'feature_request': 0.8,   // High actionability - can be implemented
    'question': 0.7,          // Medium-high - needs response
    'feedback': 0.6,          // Medium - valuable input
    'discussion': 0.4,        // Lower - informational
    'unknown': 0.2,           // Low - unclear intent
    'default': 0.5
  },
  urgencyWeights: {
    'critical': 1.0,          // Maximum urgency
    'high': 0.8,              // High urgency
    'medium': 0.6,            // Medium urgency
    'low': 0.4,               // Low urgency
    'unknown': 0.3,           // Default for unknown urgency
    'default': 0.5
  },
  platformWeights: {
    'github': 1.2,            // High actionability - development platform
    'devspace': 1.1,          // High - project management
    'slack': 1.0,             // Medium-high - team communication
    'discord': 0.9,           // Medium - community discussion
    'discourse': 0.8,         // Medium - forum discussion
    'reddit': 0.7,            // Medium-low - public discussion
    'twitter': 0.6,           // Lower - social media
    'hackernews': 0.7,        // Medium-low - news discussion
    'devto': 0.6,             // Lower - blog platform
    'groupsio': 0.8,          // Medium - mailing list
    'git': 1.1,               // High - code changes
    'webhooks': 1.0,          // Medium-high - automated events
    'default': 0.8
  },
  memberEngagementWeight: 0.2  // 20% boost for high-engagement activities
}