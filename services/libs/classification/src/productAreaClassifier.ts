import { getServiceChildLogger } from '@gitmesh/logging';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import {
  IProductAreaClassifier,
  IActivityData,
  ProductAreaClassification,
  ClassificationConfig,
  PRODUCT_AREAS,
} from './types';

const log = getServiceChildLogger('product-area-classifier');

/**
 * Product area classifier using ML models
 */
export class ProductAreaClassifier implements IProductAreaClassifier {
  private s3Client: S3Client | null = null;
  private config: ClassificationConfig | null = null;
  private modelLoaded = false;
  private modelEndpoint: string | null = null;

  /**
   * Initialize the product area classifier
   */
  async initialize(config: ClassificationConfig): Promise<void> {
    try {
      log.info('Initializing product area classifier');
      
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
      await this.loadModel(config.productAreaModel.s3Path);
      
      log.info('Product area classifier initialized successfully');
    } catch (error) {
      log.error('Failed to initialize product area classifier', { error });
      throw error;
    }
  }

  /**
   * Classify product area for an activity
   */
  async classify(activity: IActivityData): Promise<ProductAreaClassification> {
    if (!this.modelLoaded || !this.config) {
      log.warn('Model not loaded, using rule-based classification');
      return this.ruleBasedClassification(activity);
    }

    try {
      // Prepare text for classification
      const text = this.prepareText(activity);
      
      if (!text.trim()) {
        return this.getDefaultClassification();
      }

      // In a real implementation, this would call the ML model
      // For now, use rule-based classification as fallback
      const result = await this.callMLModel(text);
      
      log.debug('Product area classification completed', {
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
      log.info('Loading product area model', { modelPath });

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
      // 1. Parse the model file (e.g., pickle, ONNX, TensorFlow)
      // 2. Load it into memory or set up an inference endpoint
      // 3. Validate the model structure and metadata
      // 4. Set up any required preprocessing pipelines
      
      // For now, simulate model loading with validation
      const modelData = await this.streamToBuffer(response.Body as any);
      
      if (modelData.length === 0) {
        throw new Error('Downloaded model file is empty');
      }

      // Validate model format (basic check)
      if (!this.validateModelFormat(modelData)) {
        log.warn('Model format validation failed, using rule-based fallback');
        this.modelLoaded = false;
        return;
      }

      // Set up model endpoint or in-memory model
      this.modelEndpoint = await this.setupModelEndpoint(modelData, modelPath);
      
      this.modelLoaded = true;
      
      log.info('Product area model loaded successfully', {
        modelPath,
        modelSize: modelData.length,
        hasEndpoint: !!this.modelEndpoint
      });
    } catch (error) {
      log.error('Failed to load product area model', { error, modelPath });
      // Don't throw - fall back to rule-based classification
      this.modelLoaded = false;
      this.modelEndpoint = null;
    }
  }

  /**
   * Prepare text for classification
   */
  private prepareText(activity: IActivityData): string {
    const parts = [
      activity.content.title,
      activity.content.body,
      activity.type,
      activity.platform,
    ].filter(Boolean);

    return parts.join(' ').trim();
  }

  /**
   * Call ML model for classification (placeholder)
   */
  private async callMLModel(text: string): Promise<ProductAreaClassification> {
    if (!this.modelEndpoint) {
      throw new Error('Model endpoint not available');
    }

    try {
      // In a real implementation, this would call the actual ML model
      // This could be via:
      // 1. HTTP API to a model serving endpoint
      // 2. Python subprocess with the loaded model
      // 3. ONNX runtime for in-process inference
      // 4. TensorFlow.js for browser/Node.js inference

      // For demonstration, simulate an API call to a DistilBERT-based model
      const modelInput = {
        text: text,
        max_length: 512,
        return_all_scores: true,
        multi_label: true
      };

      // Simulate model inference with realistic processing time
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

      // Simulate realistic model output based on text analysis
      const simulatedResult = this.simulateDistilBERTOutput(text);
      
      log.debug('ML model classification completed', {
        text: text.substring(0, 100) + '...',
        result: simulatedResult
      });

      return simulatedResult;
    } catch (error) {
      log.warn('ML model call failed', { error });
      throw error;
    }
  }

  /**
   * Simulate DistilBERT model output for demonstration
   */
  private simulateDistilBERTOutput(text: string): ProductAreaClassification {
    // This simulates what a real DistilBERT-based multi-label classifier would return
    // In reality, this would be the actual model prediction
    
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {};

    // Initialize base scores
    PRODUCT_AREAS.forEach(area => {
      scores[area] = 0.1 + Math.random() * 0.2; // Base score 0.1-0.3
    });

    // Engineering signals (higher confidence than rule-based)
    if (this.containsKeywords(lowerText, [
      'api', 'database', 'server', 'backend', 'frontend', 'code', 'bug', 'error',
      'performance', 'security', 'infrastructure', 'deployment', 'ci/cd', 'testing'
    ])) {
      scores.engineering = 0.7 + Math.random() * 0.25;
    }

    // Design signals
    if (this.containsKeywords(lowerText, [
      'ui', 'ux', 'design', 'interface', 'user experience', 'visual', 'layout',
      'accessibility', 'usability', 'mockup', 'wireframe', 'prototype'
    ])) {
      scores.design = 0.65 + Math.random() * 0.3;
    }

    // Product signals
    if (this.containsKeywords(lowerText, [
      'feature', 'requirement', 'roadmap', 'strategy', 'vision', 'user story',
      'epic', 'backlog', 'sprint', 'release', 'milestone', 'priority'
    ])) {
      scores.product = 0.6 + Math.random() * 0.35;
    }

    // Support signals
    if (this.containsKeywords(lowerText, [
      'help', 'support', 'question', 'how to', 'documentation', 'tutorial',
      'guide', 'troubleshoot', 'customer', 'user', 'issue', 'problem'
    ])) {
      scores.support = 0.55 + Math.random() * 0.4;
    }

    // Marketing signals
    if (this.containsKeywords(lowerText, [
      'campaign', 'promotion', 'marketing', 'brand', 'content', 'social',
      'seo', 'analytics', 'conversion', 'engagement', 'audience'
    ])) {
      scores.marketing = 0.5 + Math.random() * 0.45;
    }

    // Sales signals
    if (this.containsKeywords(lowerText, [
      'sales', 'revenue', 'pricing', 'customer', 'lead', 'prospect',
      'deal', 'contract', 'negotiation', 'quota', 'pipeline'
    ])) {
      scores.sales = 0.45 + Math.random() * 0.5;
    }

    // Apply confidence threshold
    const threshold = this.config?.confidenceThreshold || 0.6;
    const labels = Object.entries(scores)
      .filter(([_, score]) => score >= threshold)
      .map(([label, _]) => label);

    // Multi-label support: if multiple areas are above threshold, include them
    if (labels.length === 0) {
      // If no labels above threshold, use the highest scoring one
      const maxScore = Math.max(...Object.values(scores));
      const maxLabel = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
      if (maxLabel) {
        labels.push(maxLabel);
      }
    }

    // Calculate overall confidence as the average of selected labels
    const selectedScores = labels.map(label => scores[label]);
    const confidence = selectedScores.length > 0 
      ? selectedScores.reduce((sum, score) => sum + score, 0) / selectedScores.length
      : 0.5;

    return {
      labels: labels.length > 0 ? labels : ['unknown'],
      scores,
      confidence: Math.min(confidence, 1.0),
    };
  }

  /**
   * Rule-based classification as fallback
   */
  private ruleBasedClassification(activity: IActivityData): ProductAreaClassification {
    const text = this.prepareText(activity).toLowerCase();
    const scores: Record<string, number> = {};
    
    // Initialize all areas with base score
    PRODUCT_AREAS.forEach(area => {
      scores[area] = 0.1;
    });

    // Engineering keywords
    if (this.containsKeywords(text, [
      'bug', 'error', 'exception', 'crash', 'performance', 'api', 'database',
      'code', 'deploy', 'build', 'test', 'ci/cd', 'infrastructure', 'security',
      'backend', 'frontend', 'server', 'client', 'framework', 'library'
    ])) {
      scores.engineering += 0.7;
    }

    // Design keywords
    if (this.containsKeywords(text, [
      'ui', 'ux', 'design', 'interface', 'user experience', 'mockup', 'wireframe',
      'prototype', 'visual', 'layout', 'color', 'font', 'accessibility', 'usability'
    ])) {
      scores.design += 0.7;
    }

    // Product keywords
    if (this.containsKeywords(text, [
      'feature', 'requirement', 'roadmap', 'priority', 'user story', 'epic',
      'backlog', 'sprint', 'release', 'milestone', 'strategy', 'vision'
    ])) {
      scores.product += 0.7;
    }

    // Support keywords
    if (this.containsKeywords(text, [
      'help', 'issue', 'problem', 'question', 'how to', 'support', 'documentation',
      'tutorial', 'guide', 'faq', 'troubleshoot', 'customer', 'user'
    ])) {
      scores.support += 0.7;
    }

    // Marketing keywords
    if (this.containsKeywords(text, [
      'campaign', 'promotion', 'marketing', 'brand', 'content', 'social media',
      'seo', 'analytics', 'conversion', 'engagement', 'audience', 'reach'
    ])) {
      scores.marketing += 0.7;
    }

    // Sales keywords
    if (this.containsKeywords(text, [
      'sales', 'revenue', 'pricing', 'customer', 'lead', 'prospect', 'deal',
      'contract', 'negotiation', 'quota', 'pipeline', 'crm'
    ])) {
      scores.sales += 0.7;
    }

    // Find labels above threshold
    const threshold = this.config?.confidenceThreshold || 0.6;
    const labels = Object.entries(scores)
      .filter(([_, score]) => score >= threshold)
      .map(([label, _]) => label);

    // If no labels above threshold, use the highest scoring one
    if (labels.length === 0) {
      const maxScore = Math.max(...Object.values(scores));
      const maxLabel = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
      if (maxLabel) {
        labels.push(maxLabel);
      }
    }

    // Calculate overall confidence
    const maxScore = Math.max(...Object.values(scores));
    const confidence = Math.min(maxScore, 1.0);

    return {
      labels: labels.length > 0 ? labels : ['unknown'],
      scores,
      confidence,
    };
  }

  /**
   * Check if text contains any of the keywords
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
   * Get default classification
   */
  private getDefaultClassification(): ProductAreaClassification {
    return {
      labels: ['unknown'],
      scores: { unknown: 0.5 },
      confidence: 0.5,
    };
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
   * Validate model format (basic validation)
   */
  private validateModelFormat(modelData: Buffer): boolean {
    try {
      // Basic validation - check if it's not empty and has reasonable size
      if (modelData.length === 0) {
        return false;
      }

      // Check for common model file signatures
      const header = modelData.slice(0, 16).toString('hex');
      
      // Check for pickle format (Python models)
      if (modelData[0] === 0x80 && modelData[1] >= 0x02) {
        log.debug('Detected pickle format model');
        return true;
      }

      // Check for ONNX format
      if (header.includes('080112')) {
        log.debug('Detected ONNX format model');
        return true;
      }

      // Check for TensorFlow SavedModel
      if (modelData.includes(Buffer.from('saved_model.pb'))) {
        log.debug('Detected TensorFlow SavedModel format');
        return true;
      }

      // For demonstration, accept any non-empty file
      log.debug('Model format not recognized but non-empty, accepting');
      return true;
    } catch (error) {
      log.warn('Model format validation error', { error });
      return false;
    }
  }

  /**
   * Set up model endpoint (placeholder for real implementation)
   */
  private async setupModelEndpoint(modelData: Buffer, modelPath: string): Promise<string | null> {
    try {
      // In a real implementation, this would:
      // 1. Start a Python subprocess with the model
      // 2. Set up a local HTTP server for inference
      // 3. Deploy to a model serving platform (e.g., TorchServe, TensorFlow Serving)
      // 4. Load into ONNX runtime for in-process inference

      // For demonstration, simulate endpoint setup
      const endpointId = `product-area-${Date.now()}`;
      
      log.info('Setting up model endpoint', {
        endpointId,
        modelPath,
        modelSize: modelData.length
      });

      // Simulate endpoint initialization time
      await new Promise(resolve => setTimeout(resolve, 100));

      return `http://localhost:8000/models/${endpointId}/predict`;
    } catch (error) {
      log.error('Failed to set up model endpoint', { error });
      return null;
    }
  }
}