import { IActivityData } from '../../types/src/activities'
import { 
  IScoringService, 
  ScoringConfig, 
  ActivityScores, 
  Classification, 
  Cluster 
} from './types'
import { 
  VelocityScorer, 
  DEFAULT_VELOCITY_CONFIG 
} from './velocityScorer'
import { 
  CrossPlatformScorer, 
  DEFAULT_CROSS_PLATFORM_CONFIG 
} from './crossPlatformScorer'
import { 
  ActionabilityScorer, 
  DEFAULT_ACTIONABILITY_CONFIG 
} from './actionabilityScorer'
import { 
  NoveltyScorer, 
  DEFAULT_NOVELTY_CONFIG 
} from './noveltyScorer'

/**
 * Main scoring service that orchestrates all individual scorers
 */
export class ScoringService implements IScoringService {
  private velocityScorer: VelocityScorer
  private crossPlatformScorer: CrossPlatformScorer
  private actionabilityScorer: ActionabilityScorer
  private noveltyScorer: NoveltyScorer
  private config: ScoringConfig

  constructor(config?: Partial<ScoringConfig>) {
    this.config = {
      velocity: config?.velocity || DEFAULT_VELOCITY_CONFIG,
      crossPlatform: config?.crossPlatform || DEFAULT_CROSS_PLATFORM_CONFIG,
      actionability: config?.actionability || DEFAULT_ACTIONABILITY_CONFIG,
      novelty: config?.novelty || DEFAULT_NOVELTY_CONFIG
    }

    this.velocityScorer = new VelocityScorer(this.config.velocity)
    this.crossPlatformScorer = new CrossPlatformScorer(this.config.crossPlatform)
    this.actionabilityScorer = new ActionabilityScorer(this.config.actionability)
    this.noveltyScorer = new NoveltyScorer(this.config.novelty)
  }

  /**
   * Compute all scores for an activity
   * @param activity The activity to score
   * @param memberHistory Array of member's recent activities for velocity scoring
   * @param memberPlatforms Array of platforms where the member is active
   * @param classification Classification results for the activity
   * @param cluster Cluster information (null if outlier)
   * @returns All computed scores
   */
  async computeAllScores(
    activity: IActivityData,
    memberHistory: IActivityData[],
    memberPlatforms: string[],
    classification: Classification,
    cluster: Cluster | null
  ): Promise<ActivityScores> {
    // Compute all scores in parallel for better performance
    const [velocity, crossPlatform, actionability, novelty] = await Promise.all([
      this.velocityScorer.computeScore(activity, memberHistory),
      this.crossPlatformScorer.computeScore(activity, memberPlatforms),
      this.actionabilityScorer.computeScore(activity, classification),
      this.noveltyScorer.computeScore(activity, cluster)
    ])

    return {
      velocity,
      crossPlatform,
      actionability,
      novelty
    }
  }

  /**
   * Update the scoring configuration
   * @param config New scoring configuration
   */
  async updateConfiguration(config: ScoringConfig): Promise<void> {
    this.config = config

    // Update all individual scorers
    await Promise.all([
      this.velocityScorer.updateConfig(config.velocity),
      this.crossPlatformScorer.updateConfig(config.crossPlatform),
      this.actionabilityScorer.updateConfig(config.actionability),
      this.noveltyScorer.updateConfig(config.novelty)
    ])
  }

  /**
   * Get the current scoring configuration
   * @returns Current configuration
   */
  getConfiguration(): ScoringConfig {
    return {
      velocity: { ...this.config.velocity },
      crossPlatform: { ...this.config.crossPlatform },
      actionability: { ...this.config.actionability },
      novelty: { ...this.config.novelty }
    }
  }

  /**
   * Compute individual velocity score
   */
  async computeVelocityScore(activity: IActivityData, memberHistory: IActivityData[]): Promise<number> {
    return this.velocityScorer.computeScore(activity, memberHistory)
  }

  /**
   * Compute individual cross-platform score
   */
  async computeCrossPlatformScore(activity: IActivityData, memberPlatforms: string[]): Promise<number> {
    return this.crossPlatformScorer.computeScore(activity, memberPlatforms)
  }

  /**
   * Compute individual actionability score
   */
  async computeActionabilityScore(activity: IActivityData, classification: Classification): Promise<number> {
    return this.actionabilityScorer.computeScore(activity, classification)
  }

  /**
   * Compute individual novelty score
   */
  async computeNoveltyScore(activity: IActivityData, cluster: Cluster | null): Promise<number> {
    return this.noveltyScorer.computeScore(activity, cluster)
  }
}

/**
 * Default scoring configuration combining all individual defaults
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  velocity: DEFAULT_VELOCITY_CONFIG,
  crossPlatform: DEFAULT_CROSS_PLATFORM_CONFIG,
  actionability: DEFAULT_ACTIONABILITY_CONFIG,
  novelty: DEFAULT_NOVELTY_CONFIG
}