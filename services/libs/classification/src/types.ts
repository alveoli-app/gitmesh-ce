/**
 * Activity data interface for classification
 */
export interface IActivityData {
  /** Activity ID */
  id: string;
  /** Activity type */
  type: string;
  /** Platform where activity originated */
  platform: string;
  /** Activity timestamp */
  timestamp: Date;
  /** Activity content */
  content: {
    title?: string;
    body?: string;
    url?: string;
  };
  /** Member information */
  member?: {
    id: string;
    displayName?: string;
  };
  /** Platform-specific attributes */
  attributes?: Record<string, any>;
}

/**
 * Classification result for an activity
 */
export interface Classification {
  /** Product area classifications (multi-label) */
  productArea: string[];
  /** Sentiment classification (single label) */
  sentiment: string;
  /** Urgency classification (single label) */
  urgency: string;
  /** Intent classifications (multi-label) */
  intent: string[];
  /** Overall confidence score */
  confidence: number;
}

/**
 * Product area classification result
 */
export interface ProductAreaClassification {
  /** Predicted product areas */
  labels: string[];
  /** Confidence scores for each label */
  scores: Record<string, number>;
  /** Overall confidence */
  confidence: number;
}

/**
 * Intent classification result
 */
export interface IntentClassification {
  /** Predicted intents */
  labels: string[];
  /** Confidence scores for each label */
  scores: Record<string, number>;
  /** Overall confidence */
  confidence: number;
}

/**
 * Urgency classification result
 */
export interface UrgencyClassification {
  /** Predicted urgency level */
  label: string;
  /** Confidence score */
  confidence: number;
  /** Scores for all urgency levels */
  scores: Record<string, number>;
}

/**
 * Model configuration for classification
 */
export interface ModelConfig {
  /** Model version */
  version: string;
  /** S3 path to model file */
  s3Path: string;
  /** Confidence threshold for predictions */
  confidenceThreshold: number;
  /** Last training timestamp */
  lastTrained: Date;
}

/**
 * Classification configuration
 */
export interface ClassificationConfig {
  /** Confidence threshold for all models */
  confidenceThreshold: number;
  /** Model update interval in days */
  modelUpdateIntervalDays: number;
  /** Product area model configuration */
  productAreaModel: ModelConfig;
  /** Intent model configuration */
  intentModel: ModelConfig;
  /** Urgency model configuration */
  urgencyModel: ModelConfig;
  /** S3 configuration for model storage */
  s3Config: {
    region: string;
    bucket: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

/**
 * Model metrics for evaluation
 */
export interface ModelMetrics {
  /** Product area model metrics */
  productArea: {
    precision: number;
    recall: number;
    f1: number;
  };
  /** Intent model metrics */
  intent: {
    precision: number;
    recall: number;
    f1: number;
  };
  /** Urgency model metrics */
  urgency: {
    precision: number;
    recall: number;
    f1: number;
  };
}

/**
 * Model paths for updating models
 */
export interface ModelPaths {
  /** S3 path to product area model */
  productAreaModel: string;
  /** S3 path to intent model */
  intentModel: string;
  /** S3 path to urgency model */
  urgencyModel: string;
}

/**
 * Classification service interface
 */
export interface IClassificationService {
  /**
   * Classify an activity
   * @param activity - Activity data to classify
   * @returns Promise resolving to classification result
   */
  classify(activity: IActivityData): Promise<Classification>;

  /**
   * Update models with new paths
   * @param modelPaths - New model paths
   * @returns Promise resolving when models are updated
   */
  updateModels(modelPaths: ModelPaths): Promise<void>;

  /**
   * Get current model metrics
   * @returns Promise resolving to model metrics
   */
  getModelMetrics(): Promise<ModelMetrics>;

  /**
   * Initialize the classification service
   * @param config - Classification configuration
   * @returns Promise resolving when service is initialized
   */
  initialize(config: ClassificationConfig): Promise<void>;
}

/**
 * Product area classifier interface
 */
export interface IProductAreaClassifier {
  /**
   * Classify product area for activity
   * @param activity - Activity to classify
   * @returns Promise resolving to product area classification
   */
  classify(activity: IActivityData): Promise<ProductAreaClassification>;

  /**
   * Load model from S3
   * @param modelPath - S3 path to model
   * @returns Promise resolving when model is loaded
   */
  loadModel(modelPath: string): Promise<void>;
}

/**
 * Intent classifier interface
 */
export interface IIntentClassifier {
  /**
   * Classify intent for activity
   * @param activity - Activity to classify
   * @returns Promise resolving to intent classification
   */
  classify(activity: IActivityData): Promise<IntentClassification>;

  /**
   * Load model from S3
   * @param modelPath - S3 path to model
   * @returns Promise resolving when model is loaded
   */
  loadModel(modelPath: string): Promise<void>;
}

/**
 * Urgency classifier interface
 */
export interface IUrgencyClassifier {
  /**
   * Classify urgency for activity
   * @param activity - Activity to classify
   * @returns Promise resolving to urgency classification
   */
  classify(activity: IActivityData): Promise<UrgencyClassification>;

  /**
   * Load model from S3
   * @param modelPath - S3 path to model
   * @returns Promise resolving when model is loaded
   */
  loadModel(modelPath: string): Promise<void>;
}

/**
 * Supported product areas
 */
export const PRODUCT_AREAS = [
  'engineering',
  'design',
  'marketing',
  'sales',
  'support',
  'product',
] as const;

/**
 * Supported sentiment labels
 */
export const SENTIMENT_LABELS = [
  'positive',
  'negative',
  'neutral',
  'mixed',
] as const;

/**
 * Supported urgency levels
 */
export const URGENCY_LEVELS = [
  'critical',
  'high',
  'medium',
  'low',
] as const;

/**
 * Supported intent types
 */
export const INTENT_TYPES = [
  'question',
  'feedback',
  'bug_report',
  'feature_request',
  'discussion',
] as const;

export type ProductArea = typeof PRODUCT_AREAS[number];
export type SentimentLabel = typeof SENTIMENT_LABELS[number];
export type UrgencyLevel = typeof URGENCY_LEVELS[number];
export type IntentType = typeof INTENT_TYPES[number];