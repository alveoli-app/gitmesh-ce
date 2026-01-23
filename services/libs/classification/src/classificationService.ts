import { getServiceChildLogger } from '@gitmesh/logging';
import { getSentiment } from '@gitmesh/sentiment';
import {
  IClassificationService,
  IActivityData,
  Classification,
  ClassificationConfig,
  ModelPaths,
  ModelMetrics,
  SENTIMENT_LABELS,
} from './types';
import { ProductAreaClassifier } from './productAreaClassifier';
import { IntentClassifier } from './intentClassifier';
import { UrgencyClassifier } from './urgencyClassifier';
import { ModernSentimentAnalyzer } from './modernSentimentAnalyzer';

const log = getServiceChildLogger('classification');

/**
 * Main classification service that orchestrates all classification tasks
 */
export class ClassificationService implements IClassificationService {
  private config: ClassificationConfig | null = null;
  private productAreaClassifier: ProductAreaClassifier;
  private intentClassifier: IntentClassifier;
  private urgencyClassifier: UrgencyClassifier;
  private modernSentimentAnalyzer: ModernSentimentAnalyzer;
  private initialized = false;

  constructor() {
    this.productAreaClassifier = new ProductAreaClassifier();
    this.intentClassifier = new IntentClassifier();
    this.urgencyClassifier = new UrgencyClassifier();
    this.modernSentimentAnalyzer = new ModernSentimentAnalyzer();
  }

  /**
   * Initialize the classification service
   */
  async initialize(config: ClassificationConfig): Promise<void> {
    try {
      log.info('Initializing classification service', { config });
      
      this.config = config;

      // Initialize all classifiers
      await Promise.all([
        this.productAreaClassifier.initialize(config),
        this.intentClassifier.initialize(config),
        this.urgencyClassifier.initialize(config),
        this.modernSentimentAnalyzer.initialize(),
      ]);

      this.initialized = true;
      log.info('Classification service initialized successfully');
    } catch (error) {
      log.error('Failed to initialize classification service', { error });
      throw error;
    }
  }

  /**
   * Classify an activity across all dimensions
   */
  async classify(activity: IActivityData): Promise<Classification> {
    if (!this.initialized || !this.config) {
      throw new Error('Classification service not initialized');
    }

    try {
      log.debug('Classifying activity', { activityId: activity.id });

      // Run all classifications in parallel
      const [productAreaResult, intentResult, urgencyResult, sentimentResult] = await Promise.all([
        this.productAreaClassifier.classify(activity),
        this.intentClassifier.classify(activity),
        this.urgencyClassifier.classify(activity),
        this.classifySentiment(activity),
      ]);

      // Calculate overall confidence as average of individual confidences
      const overallConfidence = (
        productAreaResult.confidence +
        intentResult.confidence +
        urgencyResult.confidence +
        (sentimentResult.confidence || 0.5) // Default confidence for sentiment
      ) / 4;

      const classification: Classification = {
        productArea: productAreaResult.labels,
        sentiment: sentimentResult.label,
        urgency: urgencyResult.label,
        intent: intentResult.labels,
        confidence: overallConfidence,
      };

      log.debug('Classification completed', {
        activityId: activity.id,
        classification,
        overallConfidence,
      });

      return classification;
    } catch (error) {
      log.error('Failed to classify activity', {
        activityId: activity.id,
        error,
      });
      
      // Return default classification on error
      return this.getDefaultClassification();
    }
  }

  /**
   * Update models with new paths
   */
  async updateModels(modelPaths: ModelPaths): Promise<void> {
    if (!this.initialized) {
      throw new Error('Classification service not initialized');
    }

    try {
      log.info('Updating classification models', { modelPaths });

      await Promise.all([
        this.productAreaClassifier.loadModel(modelPaths.productAreaModel),
        this.intentClassifier.loadModel(modelPaths.intentModel),
        this.urgencyClassifier.loadModel(modelPaths.urgencyModel),
      ]);

      log.info('Classification models updated successfully');
    } catch (error) {
      log.error('Failed to update classification models', { error });
      throw error;
    }
  }

  /**
   * Get current model metrics
   */
  async getModelMetrics(): Promise<ModelMetrics> {
    if (!this.initialized) {
      throw new Error('Classification service not initialized');
    }

    // In a real implementation, these would be loaded from model metadata
    // For now, return placeholder metrics
    return {
      productArea: {
        precision: 0.85,
        recall: 0.82,
        f1: 0.83,
      },
      intent: {
        precision: 0.78,
        recall: 0.75,
        f1: 0.76,
      },
      urgency: {
        precision: 0.72,
        recall: 0.70,
        f1: 0.71,
      },
    };
  }

  /**
   * Classify sentiment using the modern sentiment analyzer with fallback to existing service
   */
  private async classifySentiment(activity: IActivityData): Promise<{
    label: string;
    confidence?: number;
  }> {
    try {
      // Combine title and body for sentiment analysis
      const text = [activity.content.title, activity.content.body]
        .filter(Boolean)
        .join(' ')
        .trim();

      if (!text) {
        return { label: 'neutral' };
      }

      // Use modern sentiment analyzer first
      try {
        const modernResult = await this.modernSentimentAnalyzer.analyzeSentiment(text);
        
        return {
          label: modernResult.label,
          confidence: modernResult.confidence,
        };
      } catch (modernError) {
        log.warn('Modern sentiment analyzer failed, falling back to existing service', {
          activityId: activity.id,
          error: modernError,
        });

        // Fallback to existing sentiment service
        const sentimentResult = await getSentiment(text);
        
        if (!sentimentResult) {
          return { label: 'neutral' };
        }

        // Map sentiment service result to our format
        let label = sentimentResult.label;
        
        // Ensure label is one of our supported sentiment labels
        if (!SENTIMENT_LABELS.includes(label as any)) {
          label = 'neutral';
        }

        return {
          label,
          confidence: sentimentResult.sentiment / 100, // Convert to 0-1 range
        };
      }
    } catch (error) {
      log.warn('Failed to classify sentiment, using default', {
        activityId: activity.id,
        error,
      });
      return { label: 'neutral' };
    }
  }

  /**
   * Get default classification for error cases
   */
  private getDefaultClassification(): Classification {
    return {
      productArea: ['unknown'],
      sentiment: 'neutral',
      urgency: 'medium',
      intent: ['unknown'],
      confidence: 0.0,
    };
  }
}