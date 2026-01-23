import { IActivityData } from '../../types/src/activities'

/**
 * Configuration for scoring parameters
 */
export interface ScoringConfig {
  velocity: VelocityConfig
  crossPlatform: CrossPlatformConfig
  actionability: ActionabilityConfig
  novelty: NoveltyConfig
}

/**
 * Velocity scoring configuration
 */
export interface VelocityConfig {
  timeWindowHours: number // Learned optimal window (default 24)
  decayFactor: number // Learned decay rate
  platformWeights: Record<string, number> // Platform-specific weights
  typeWeights: Record<string, number> // Activity type weights
}

/**
 * Cross-platform scoring configuration
 */
export interface CrossPlatformConfig {
  platformDiversityWeight: number // Weight for platform count
  platformSimilarity: Record<string, Record<string, number>> // Learned platform similarities
  recencyWeight: number // Weight for recent activity
}

/**
 * Actionability scoring configuration
 */
export interface ActionabilityConfig {
  intentWeights: Record<string, number> // Learned weights per intent
  urgencyWeights: Record<string, number> // Learned weights per urgency
  platformWeights: Record<string, number> // Platform-specific actionability
  memberEngagementWeight: number // Weight for member's past engagement
}

/**
 * Novelty scoring configuration
 */
export interface NoveltyConfig {
  clusterSizeWeight: number // Weight for cluster size
  clusterAgeWeight: number // Weight for cluster age
  memberNoveltyWeight: number // Weight for member's novelty
  platformNoveltyWeight: number // Platform-specific novelty
}

/**
 * Classification results for scoring
 */
export interface Classification {
  productArea: string[] // engineering, design, marketing, sales, support, product
  sentiment: string // positive, negative, neutral, mixed
  urgency: string // critical, high, medium, low
  intent: string[] // question, feedback, bug_report, feature_request, discussion
  confidence: number
}

/**
 * Cluster information for novelty scoring
 */
export interface Cluster {
  id: string
  size: number
  age: number // Age in hours
  platforms: string[]
  firstSeen: Date
  lastSeen: Date
}

/**
 * Computed scores for an activity
 */
export interface ActivityScores {
  velocity: number // 0-100
  crossPlatform: number // 0-100
  actionability: number // 0-100
  novelty: number // 0-100
}

/**
 * Velocity scorer interface
 */
export interface IVelocityScorer {
  computeScore(activity: IActivityData, memberHistory: IActivityData[]): Promise<number>
  updateConfig(config: VelocityConfig): Promise<void>
}

/**
 * Cross-platform scorer interface
 */
export interface ICrossPlatformScorer {
  computeScore(activity: IActivityData, memberPlatforms: string[]): Promise<number>
  updateConfig(config: CrossPlatformConfig): Promise<void>
}

/**
 * Actionability scorer interface
 */
export interface IActionabilityScorer {
  computeScore(activity: IActivityData, classification: Classification): Promise<number>
  updateConfig(config: ActionabilityConfig): Promise<void>
}

/**
 * Novelty scorer interface
 */
export interface INoveltyScorer {
  computeScore(activity: IActivityData, cluster: Cluster | null): Promise<number>
  updateConfig(config: NoveltyConfig): Promise<void>
}

/**
 * Main scoring service interface
 */
export interface IScoringService {
  computeAllScores(
    activity: IActivityData,
    memberHistory: IActivityData[],
    memberPlatforms: string[],
    classification: Classification,
    cluster: Cluster | null
  ): Promise<ActivityScores>
  
  updateConfiguration(config: ScoringConfig): Promise<void>
  getConfiguration(): ScoringConfig
}