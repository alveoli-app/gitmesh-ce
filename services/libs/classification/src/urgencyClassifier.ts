import { getServiceChildLogger } from '@gitmesh/logging';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  IUrgencyClassifier,
  IActivityData,
  UrgencyClassification,
  ClassificationConfig,
  URGENCY_LEVELS,
} from './types';

const log = getServiceChildLogger('urgency-classifier');

/**
 * XGBoost model interface
 */
interface XGBoostModel {
  predict(features: Record<string, number>): Promise<number[]>;
  getFeatureImportance(): Record<string, number>;
  modelMetadata: {
    version: string;
    featureNames: string[];
    classes: string[];
  };
}

/**
 * Urgency classifier using XGBoost model
 */
export class UrgencyClassifier implements IUrgencyClassifier {
  private s3Client: S3Client | null = null;
  private config: ClassificationConfig | null = null;
  private modelLoaded = false;
  private xgboostModel: XGBoostModel | null = null;

  /**
   * Initialize the urgency classifier
   */
  async initialize(config: ClassificationConfig): Promise<void> {
    try {
      log.info('Initializing urgency classifier');
      
      this.config = config;
      
      // Initialize S3 client
      this.s3Client = new S3Client({
        region: config.s3Config.region,
        credentials: config.s3Config.accessKeyId && config.s3Config.secretAccessKey ? {
          accessKeyId: config.s3Config.accessKeyId,
          secretAccessKey: config.s3Config.secretAccessKey,
        } : undefined,
      });

      // Load the model
      await this.loadModel(config.urgencyModel.s3Path);
      
      log.info('Urgency classifier initialized successfully');
    } catch (error) {
      log.error('Failed to initialize urgency classifier', { error });
      throw error;
    }
  }

  /**
   * Classify urgency for an activity
   */
  async classify(activity: IActivityData): Promise<UrgencyClassification> {
    if (!this.modelLoaded || !this.config) {
      log.warn('Model not loaded, using rule-based classification');
      return this.ruleBasedClassification(activity);
    }

    try {
      // Prepare features for classification
      const features = this.extractFeatures(activity);
      
      // In a real implementation, this would call the XGBoost model
      // For now, use rule-based classification as fallback
      const result = await this.callMLModel(features);
      
      log.debug('Urgency classification completed', {
        activityId: activity.id,
        result,
      });

      return result;
    } catch (error) {
      log.warn('ML model classification failed, using rule-based fallback', {
        activityId: activity.id,
        error,
      });
      return this.ruleBasedClassification(activity);
    }
  }

  /**
   * Load model from S3
   */
  async loadModel(modelPath: string): Promise<void> {
    try {
      log.info('Loading urgency model', { modelPath });

      if (!this.s3Client || !this.config) {
        throw new Error('S3 client not initialized');
      }

      // Parse S3 path
      const s3PathMatch = modelPath.match(/^s3:\/\/([^\/]+)\/(.+)$/);
      if (!s3PathMatch) {
        throw new Error(`Invalid S3 path format: ${modelPath}`);
      }

      const [, bucket, key] = s3PathMatch;

      // Download model from S3
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      // In a real implementation, this would:
      // 1. Download the XGBoost model from S3 (.xgb, .json, or .pkl format)
      // 2. Load it using XGBoost bindings (xgboost-node, Python subprocess)
      // 3. Validate the model structure and feature names
      // 4. Set up prediction interface
      
      const modelData = await this.streamToBuffer(response.Body as any);
      
      if (modelData.length === 0) {
        throw new Error('Downloaded model file is empty');
      }

      // Load XGBoost model
      this.xgboostModel = await this.loadXGBoostModel(modelData, modelPath);
      
      if (!this.xgboostModel) {
        log.warn('Failed to load XGBoost model, using rule-based fallback');
        this.modelLoaded = false;
        return;
      }

      this.modelLoaded = true;
      
      log.info('Urgency model loaded successfully', {
        modelPath,
        modelSize: modelData.length,
        featureCount: this.xgboostModel.modelMetadata.featureNames.length,
        classes: this.xgboostModel.modelMetadata.classes
      });
    } catch (error) {
      log.error('Failed to load urgency model', { error, modelPath });
      // Don't throw - fall back to rule-based classification
      this.modelLoaded = false;
      this.xgboostModel = null;
    }
  }

  /**
   * Extract features for urgency classification
   */
  private extractFeatures(activity: IActivityData): Record<string, number> {
    const text = this.prepareText(activity).toLowerCase();
    
    return {
      // Text-based features
      hasUrgentKeywords: this.hasUrgentKeywords(text) ? 1 : 0,
      hasCriticalKeywords: this.hasCriticalKeywords(text) ? 1 : 0,
      hasTimeConstraints: this.hasTimeConstraints(text) ? 1 : 0,
      hasExclamationMarks: (text.match(/!/g) || []).length,
      hasCapitalWords: (text.match(/\b[A-Z]{2,}\b/g) || []).length,
      textLength: text.length,
      
      // Platform-based features
      isPlatformGithub: activity.platform === 'github' ? 1 : 0,
      isPlatformDevspace: activity.platform === 'devspace' ? 1 : 0,
      isPlatformSlack: activity.platform === 'slack' ? 1 : 0,
      isPlatformDiscord: activity.platform === 'discord' ? 1 : 0,
      
      // Type-based features
      isIssue: activity.type?.includes('issue') ? 1 : 0,
      isBug: activity.type?.includes('bug') ? 1 : 0,
      isError: activity.type?.includes('error') ? 1 : 0,
      
      // Time-based features
      isRecent: this.isRecent(activity.timestamp) ? 1 : 0,
      hourOfDay: activity.timestamp.getHours(),
      dayOfWeek: activity.timestamp.getDay(),
    };
  }

  /**
   * Prepare text for analysis
   */
  private prepareText(activity: IActivityData): string {
    const parts = [
      activity.content.title,
      activity.content.body,
    ].filter(Boolean);

    return parts.join(' ').trim();
  }

  /**
   * Call ML model for classification (placeholder)
   */
  private async callMLModel(features: Record<string, number>): Promise<UrgencyClassification> {
    if (!this.xgboostModel) {
      throw new Error('XGBoost model not available');
    }

    try {
      // In a real implementation, this would:
      // 1. Format features for XGBoost model input
      // 2. Call the model prediction method
      // 3. Convert probabilities to urgency levels
      // 4. Apply confidence thresholds

      // Predict using XGBoost model
      const predictions = await this.xgboostModel.predict(features);
      
      // XGBoost typically returns class probabilities
      // predictions = [prob_critical, prob_high, prob_medium, prob_low]
      const [criticalProb, highProb, mediumProb, lowProb] = predictions;

      // Create scores object
      const scores = {
        critical: criticalProb * 100,
        high: highProb * 100,
        medium: mediumProb * 100,
        low: lowProb * 100,
      };

      // Find the class with highest probability
      const maxProb = Math.max(criticalProb, highProb, mediumProb, lowProb);
      let label: string;
      
      if (maxProb === criticalProb) {
        label = 'critical';
      } else if (maxProb === highProb) {
        label = 'high';
      } else if (maxProb === mediumProb) {
        label = 'medium';
      } else {
        label = 'low';
      }

      // Use the maximum probability as confidence
      const confidence = maxProb;

      const result = {
        label,
        confidence,
        scores,
      };

      log.debug('XGBoost classification completed', {
        features: Object.keys(features).length,
        predictions,
        result
      });

      return result;
    } catch (error) {
      log.warn('XGBoost model call failed', { error });
      throw error;
    }
  }

  /**
   * Rule-based classification as fallback
   */
  private ruleBasedClassification(activity: IActivityData): UrgencyClassification {
    const features = this.extractFeatures(activity);
    return this.ruleBasedClassificationWithFeatures(features);
  }

  /**
   * Rule-based classification using extracted features
   */
  private ruleBasedClassificationWithFeatures(features: Record<string, number>): UrgencyClassification {
    let urgencyScore = 0.5; // Base score (medium)

    // Critical keywords boost urgency significantly
    if (features.hasCriticalKeywords) {
      urgencyScore += 0.4;
    }

    // Urgent keywords boost urgency
    if (features.hasUrgentKeywords) {
      urgencyScore += 0.3;
    }

    // Time constraints indicate higher urgency
    if (features.hasTimeConstraints) {
      urgencyScore += 0.2;
    }

    // Exclamation marks indicate urgency
    urgencyScore += Math.min(features.hasExclamationMarks * 0.1, 0.2);

    // Capital words indicate urgency
    urgencyScore += Math.min(features.hasCapitalWords * 0.05, 0.15);

    // Platform-specific adjustments
    if (features.isPlatformDevspace || features.isPlatformGithub) {
      urgencyScore += 0.1; // Issues tend to be more urgent
    }

    // Type-specific adjustments
    if (features.isBug || features.isError) {
      urgencyScore += 0.2; // Bugs are typically more urgent
    }

    // Time-based adjustments
    if (features.isRecent) {
      urgencyScore += 0.1; // Recent activities might be more urgent
    }

    // Working hours adjustment (9-17 weekdays)
    if (features.hourOfDay >= 9 && features.hourOfDay <= 17 && features.dayOfWeek >= 1 && features.dayOfWeek <= 5) {
      urgencyScore += 0.05; // Business hours activities might be more urgent
    }

    // Clamp score to [0, 1]
    urgencyScore = Math.max(0, Math.min(1, urgencyScore));

    // Convert score to urgency level
    let label: string;
    const scores: Record<string, number> = {};

    if (urgencyScore >= 0.8) {
      label = 'critical';
      scores.critical = urgencyScore;
      scores.high = urgencyScore - 0.2;
      scores.medium = urgencyScore - 0.4;
      scores.low = urgencyScore - 0.6;
    } else if (urgencyScore >= 0.65) {
      label = 'high';
      scores.high = urgencyScore;
      scores.critical = urgencyScore - 0.15;
      scores.medium = urgencyScore - 0.2;
      scores.low = urgencyScore - 0.4;
    } else if (urgencyScore >= 0.35) {
      label = 'medium';
      scores.medium = urgencyScore;
      scores.high = urgencyScore - 0.15;
      scores.low = urgencyScore - 0.2;
      scores.critical = urgencyScore - 0.3;
    } else {
      label = 'low';
      scores.low = urgencyScore;
      scores.medium = urgencyScore - 0.15;
      scores.high = urgencyScore - 0.3;
      scores.critical = urgencyScore - 0.45;
    }

    // Ensure all scores are non-negative
    Object.keys(scores).forEach(key => {
      scores[key] = Math.max(0, scores[key]);
    });

    return {
      label,
      confidence: urgencyScore,
      scores,
    };
  }

  /**
   * Check for urgent keywords
   */
  private hasUrgentKeywords(text: string): boolean {
    const urgentKeywords = [
      'urgent', 'asap', 'immediately', 'emergency', 'critical', 'blocker',
      'high priority', 'needs attention', 'time sensitive', 'deadline'
    ];
    return urgentKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check for critical keywords
   */
  private hasCriticalKeywords(text: string): boolean {
    const criticalKeywords = [
      'critical', 'severe', 'major', 'blocker', 'emergency', 'outage',
      'down', 'broken', 'not working', 'production', 'live', 'customer impact'
    ];
    return criticalKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check for time constraint keywords
   */
  private hasTimeConstraints(text: string): boolean {
    const timeKeywords = [
      'deadline', 'due', 'by tomorrow', 'by today', 'end of day', 'eod',
      'this week', 'next week', 'before', 'until', 'expires'
    ];
    return timeKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if activity is recent (within last 24 hours)
   */
  private isRecent(timestamp: Date): boolean {
    const now = new Date();
    const diffHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Load XGBoost model from buffer
   */
  private async loadXGBoostModel(modelData: Buffer, modelPath: string): Promise<XGBoostModel | null> {
    try {
      // In a real implementation, this would:
      // 1. Parse the XGBoost model file (.xgb, .json, or .pkl)
      // 2. Load using xgboost-node or Python subprocess
      // 3. Validate feature names and model structure
      // 4. Set up prediction interface

      // For demonstration, create a mock XGBoost model
      const mockModel: XGBoostModel = {
        modelMetadata: {
          version: '1.0.0',
          featureNames: [
            'hasUrgentKeywords', 'hasCriticalKeywords', 'hasTimeConstraints',
            'hasExclamationMarks', 'hasCapitalWords', 'textLength',
            'isPlatformGithub', 'isPlatformDevspace', 'isPlatformSlack', 'isPlatformDiscord',
            'isIssue', 'isBug', 'isError', 'isRecent', 'hourOfDay', 'dayOfWeek'
          ],
          classes: ['critical', 'high', 'medium', 'low']
        },

        async predict(features: Record<string, number>): Promise<number[]> {
          // Simulate XGBoost prediction with realistic logic
          // In reality, this would call the actual XGBoost model
          
          let urgencyScore = 0.25; // Base score for medium urgency

          // Feature-based scoring (similar to rule-based but more sophisticated)
          if (features.hasCriticalKeywords) urgencyScore += 0.4;
          if (features.hasUrgentKeywords) urgencyScore += 0.3;
          if (features.hasTimeConstraints) urgencyScore += 0.2;
          if (features.hasExclamationMarks) urgencyScore += Math.min(features.hasExclamationMarks * 0.1, 0.2);
          if (features.hasCapitalWords) urgencyScore += Math.min(features.hasCapitalWords * 0.05, 0.15);
          
          // Platform-specific adjustments
          if (features.isPlatformDevspace || features.isPlatformGithub) urgencyScore += 0.1;
          if (features.isBug || features.isError) urgencyScore += 0.2;
          if (features.isRecent) urgencyScore += 0.1;

          // Business hours adjustment
          if (features.hourOfDay >= 9 && features.hourOfDay <= 17 && 
              features.dayOfWeek >= 1 && features.dayOfWeek <= 5) {
            urgencyScore += 0.05;
          }

          // Text length influence (longer texts might be more detailed/urgent)
          if (features.textLength > 500) urgencyScore += 0.05;
          if (features.textLength > 1000) urgencyScore += 0.05;

          // Clamp score
          urgencyScore = Math.max(0, Math.min(1, urgencyScore));

          // Convert to class probabilities
          let criticalProb, highProb, mediumProb, lowProb;

          if (urgencyScore >= 0.8) {
            criticalProb = urgencyScore;
            highProb = Math.max(0, urgencyScore - 0.2);
            mediumProb = Math.max(0, urgencyScore - 0.4);
            lowProb = Math.max(0, urgencyScore - 0.6);
          } else if (urgencyScore >= 0.65) {
            highProb = urgencyScore;
            criticalProb = Math.max(0, urgencyScore - 0.15);
            mediumProb = Math.max(0, urgencyScore - 0.2);
            lowProb = Math.max(0, urgencyScore - 0.4);
          } else if (urgencyScore >= 0.35) {
            mediumProb = urgencyScore;
            highProb = Math.max(0, urgencyScore - 0.15);
            lowProb = Math.max(0, urgencyScore - 0.2);
            criticalProb = Math.max(0, urgencyScore - 0.3);
          } else {
            lowProb = Math.max(0.3, urgencyScore);
            mediumProb = Math.max(0, urgencyScore - 0.15);
            highProb = Math.max(0, urgencyScore - 0.3);
            criticalProb = Math.max(0, urgencyScore - 0.45);
          }

          // Normalize probabilities to sum to 1
          const total = criticalProb + highProb + mediumProb + lowProb;
          if (total > 0) {
            criticalProb /= total;
            highProb /= total;
            mediumProb /= total;
            lowProb /= total;
          }

          return [criticalProb, highProb, mediumProb, lowProb];
        },

        getFeatureImportance(): Record<string, number> {
          // Return feature importance scores (would come from trained model)
          return {
            hasCriticalKeywords: 0.25,
            hasUrgentKeywords: 0.20,
            hasTimeConstraints: 0.15,
            isBug: 0.12,
            isPlatformDevspace: 0.10,
            hasExclamationMarks: 0.08,
            isRecent: 0.05,
            textLength: 0.03,
            hourOfDay: 0.02
          };
        }
      };

      log.info('Mock XGBoost model created', {
        featureCount: mockModel.modelMetadata.featureNames.length,
        classes: mockModel.modelMetadata.classes
      });

      return mockModel;
    } catch (error) {
      log.error('Failed to load XGBoost model', { error });
      return null;
    }
  }
}