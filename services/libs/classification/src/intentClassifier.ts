import { getServiceChildLogger } from '@gitmesh/logging';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  IIntentClassifier,
  IActivityData,
  IntentClassification,
  ClassificationConfig,
  INTENT_TYPES,
} from './types';

const log = getServiceChildLogger('intent-classifier');

/**
 * Few-shot example structure
 */
interface FewShotExample {
  text: string;
  embedding: number[];
  labels: string[];
  confidence: number;
}

/**
 * Intent classifier using few-shot learning
 */
export class IntentClassifier implements IIntentClassifier {
  private s3Client: S3Client | null = null;
  private config: ClassificationConfig | null = null;
  private modelLoaded = false;
  private fewShotExamples: FewShotExample[] = [];
  private embeddingCache: Map<string, number[]> = new Map();

  /**
   * Initialize the intent classifier
   */
  async initialize(config: ClassificationConfig): Promise<void> {
    try {
      log.info('Initializing intent classifier');
      
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
      await this.loadModel(config.intentModel.s3Path);
      
      log.info('Intent classifier initialized successfully');
    } catch (error) {
      log.error('Failed to initialize intent classifier', { error });
      throw error;
    }
  }

  /**
   * Classify intent for an activity
   */
  async classify(activity: IActivityData): Promise<IntentClassification> {
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

      // In a real implementation, this would use few-shot learning
      // For now, use rule-based classification as fallback
      const result = await this.callMLModel(text);
      
      log.debug('Intent classification completed', {
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
      log.info('Loading intent model', { modelPath });

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
      // 1. Download the few-shot learning model from S3
      // 2. Load example embeddings and their corresponding labels
      // 3. Set up similarity search index (e.g., FAISS, Annoy)
      // 4. Validate the model structure and examples
      
      const modelData = await this.streamToBuffer(response.Body as any);
      
      if (modelData.length === 0) {
        throw new Error('Downloaded model file is empty');
      }

      // Load few-shot examples
      const fewShotExamples = await this.loadFewShotExamples(modelData);
      
      if (fewShotExamples.length === 0) {
        log.warn('No few-shot examples found, using rule-based fallback');
        this.modelLoaded = false;
        return;
      }

      // Set up similarity search
      await this.setupSimilaritySearch(fewShotExamples);
      
      this.modelLoaded = true;
      
      log.info('Intent model loaded successfully', {
        modelPath,
        exampleCount: fewShotExamples.length,
        modelSize: modelData.length
      });
    } catch (error) {
      log.error('Failed to load intent model', { error, modelPath });
      // Don't throw - fall back to rule-based classification
      this.modelLoaded = false;
    }
  }

  /**
   * Prepare text for classification
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
  private async callMLModel(text: string): Promise<IntentClassification> {
    if (!this.modelLoaded || this.fewShotExamples.length === 0) {
      throw new Error('Few-shot model not available');
    }

    try {
      // In a real implementation, this would:
      // 1. Generate embedding for the input text using sentence transformers
      // 2. Compare with few-shot examples using cosine similarity
      // 3. Return the most similar intent(s) above threshold
      // 4. Support multi-label classification

      // Simulate embedding generation (in reality, this would use sentence transformers)
      const inputEmbedding = await this.generateEmbedding(text);
      
      // Find most similar examples
      const similarities = this.fewShotExamples.map(example => ({
        example,
        similarity: this.cosineSimilarity(inputEmbedding, example.embedding)
      }));

      // Sort by similarity
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Get top-k most similar examples
      const topK = 5;
      const topExamples = similarities.slice(0, topK);

      // Aggregate labels from top examples
      const labelScores: Record<string, number> = {};
      INTENT_TYPES.forEach(intent => {
        labelScores[intent] = 0;
      });

      let totalWeight = 0;
      topExamples.forEach(({ example, similarity }) => {
        if (similarity > 0.5) { // Minimum similarity threshold
          const weight = similarity * example.confidence;
          totalWeight += weight;
          
          example.labels.forEach(label => {
            if (labelScores[label] !== undefined) {
              labelScores[label] += weight;
            }
          });
        }
      });

      // Normalize scores
      if (totalWeight > 0) {
        Object.keys(labelScores).forEach(label => {
          labelScores[label] /= totalWeight;
        });
      }

      // Apply confidence threshold
      const threshold = this.config?.confidenceThreshold || 0.6;
      const labels = Object.entries(labelScores)
        .filter(([_, score]) => score >= threshold)
        .map(([label, _]) => label);

      // If no labels above threshold, use the highest scoring one
      if (labels.length === 0) {
        const maxScore = Math.max(...Object.values(labelScores));
        const maxLabel = Object.entries(labelScores).find(([_, score]) => score === maxScore)?.[0];
        if (maxLabel && maxScore > 0.3) { // Lower threshold for fallback
          labels.push(maxLabel);
        }
      }

      // Calculate overall confidence
      const selectedScores = labels.map(label => labelScores[label]);
      const confidence = selectedScores.length > 0 
        ? selectedScores.reduce((sum, score) => sum + score, 0) / selectedScores.length
        : 0.5;

      const result = {
        labels: labels.length > 0 ? labels : ['discussion'],
        scores: labelScores,
        confidence: Math.min(confidence, 1.0),
      };

      log.debug('Few-shot classification completed', {
        text: text.substring(0, 100) + '...',
        topSimilarities: topExamples.slice(0, 3).map(({ similarity }) => similarity),
        result
      });

      return result;
    } catch (error) {
      log.warn('Few-shot model call failed', { error });
      throw error;
    }
  }

  /**
   * Rule-based classification as fallback
   */
  private ruleBasedClassification(activity: IActivityData): IntentClassification {
    const text = this.prepareText(activity).toLowerCase();
    const scores: Record<string, number> = {};
    
    // Initialize all intents with base score
    INTENT_TYPES.forEach(intent => {
      scores[intent] = 0.1;
    });

    // Question patterns
    if (this.containsPatterns(text, [
      /\?/,
      /^(how|what|when|where|why|who|which|can|could|would|should|is|are|do|does|did)/,
      /help/,
      /question/,
      /ask/,
    ])) {
      scores.question += 0.8;
    }

    // Bug report patterns
    if (this.containsKeywords(text, [
      'bug', 'error', 'issue', 'problem', 'broken', 'crash', 'fail', 'exception',
      'not working', 'doesnt work', 'unexpected', 'wrong', 'incorrect'
    ])) {
      scores.bug_report += 0.8;
    }

    // Feature request patterns
    if (this.containsKeywords(text, [
      'feature', 'request', 'enhancement', 'improvement', 'add', 'new',
      'would like', 'wish', 'hope', 'suggest', 'proposal', 'idea'
    ]) || this.containsPatterns(text, [
      /it would be (great|nice|good|useful|helpful)/,
      /can (you|we) add/,
      /please add/,
    ])) {
      scores.feature_request += 0.8;
    }

    // Feedback patterns
    if (this.containsKeywords(text, [
      'feedback', 'opinion', 'think', 'feel', 'experience', 'review',
      'comment', 'thoughts', 'impression', 'observation'
    ]) || this.containsPatterns(text, [
      /i (think|feel|believe|find)/,
      /in my (opinion|experience)/,
      /from my perspective/,
    ])) {
      scores.feedback += 0.7;
    }

    // Discussion patterns
    if (this.containsKeywords(text, [
      'discuss', 'discussion', 'talk', 'conversation', 'debate', 'share',
      'thoughts', 'ideas', 'perspective', 'view', 'consider'
    ]) || this.containsPatterns(text, [
      /let\'s (talk|discuss)/,
      /what do you think/,
      /thoughts on/,
    ])) {
      scores.discussion += 0.7;
    }

    // Adjust scores based on activity type and platform
    this.adjustScoresByContext(activity, scores);

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
      labels: labels.length > 0 ? labels : ['discussion'],
      scores,
      confidence,
    };
  }

  /**
   * Adjust scores based on activity context
   */
  private adjustScoresByContext(activity: IActivityData, scores: Record<string, number>): void {
    // GitHub issues are more likely to be bug reports or feature requests
    if (activity.platform === 'github' && activity.type?.includes('issue')) {
      scores.bug_report += 0.2;
      scores.feature_request += 0.2;
    }

    // Discord/Slack messages are more likely to be questions or discussions
    if (['discord', 'slack'].includes(activity.platform)) {
      scores.question += 0.1;
      scores.discussion += 0.1;
    }

    // Reddit posts are more likely to be discussions or feedback
    if (activity.platform === 'reddit') {
      scores.discussion += 0.2;
      scores.feedback += 0.1;
    }

    // DevSpace issues are likely bug reports or feature requests
    if (activity.platform === 'devspace') {
      scores.bug_report += 0.3;
      scores.feature_request += 0.2;
    }
  }

  /**
   * Check if text contains any of the keywords
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
   * Check if text matches any of the patterns
   */
  private containsPatterns(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Get default classification
   */
  private getDefaultClassification(): IntentClassification {
    return {
      labels: ['discussion'],
      scores: { discussion: 0.5 },
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
   * Load few-shot examples from model data
   */
  private async loadFewShotExamples(modelData: Buffer): Promise<FewShotExample[]> {
    try {
      // In a real implementation, this would parse the model file format
      // For demonstration, create synthetic few-shot examples
      
      const examples: FewShotExample[] = [
        // Question examples
        {
          text: "How do I configure the database connection?",
          embedding: this.generateSyntheticEmbedding("question database configuration"),
          labels: ["question"],
          confidence: 0.9
        },
        {
          text: "What is the best way to handle authentication?",
          embedding: this.generateSyntheticEmbedding("question authentication best practice"),
          labels: ["question"],
          confidence: 0.85
        },
        {
          text: "Can someone help me with the API integration?",
          embedding: this.generateSyntheticEmbedding("question help api integration"),
          labels: ["question"],
          confidence: 0.8
        },

        // Bug report examples
        {
          text: "The application crashes when I click the submit button",
          embedding: this.generateSyntheticEmbedding("bug crash submit button error"),
          labels: ["bug_report"],
          confidence: 0.95
        },
        {
          text: "Getting a 500 error when trying to upload files",
          embedding: this.generateSyntheticEmbedding("bug error 500 upload files"),
          labels: ["bug_report"],
          confidence: 0.9
        },
        {
          text: "The page doesn't load properly on mobile devices",
          embedding: this.generateSyntheticEmbedding("bug page load mobile responsive"),
          labels: ["bug_report"],
          confidence: 0.85
        },

        // Feature request examples
        {
          text: "It would be great to have dark mode support",
          embedding: this.generateSyntheticEmbedding("feature request dark mode theme"),
          labels: ["feature_request"],
          confidence: 0.9
        },
        {
          text: "Can we add export functionality to CSV?",
          embedding: this.generateSyntheticEmbedding("feature request export csv functionality"),
          labels: ["feature_request"],
          confidence: 0.85
        },
        {
          text: "I wish there was a way to bulk edit items",
          embedding: this.generateSyntheticEmbedding("feature request bulk edit items"),
          labels: ["feature_request"],
          confidence: 0.8
        },

        // Feedback examples
        {
          text: "The new interface is much more intuitive",
          embedding: this.generateSyntheticEmbedding("feedback positive interface intuitive"),
          labels: ["feedback"],
          confidence: 0.8
        },
        {
          text: "I find the navigation a bit confusing",
          embedding: this.generateSyntheticEmbedding("feedback negative navigation confusing"),
          labels: ["feedback"],
          confidence: 0.75
        },
        {
          text: "Overall experience has been good so far",
          embedding: this.generateSyntheticEmbedding("feedback positive experience good"),
          labels: ["feedback"],
          confidence: 0.7
        },

        // Discussion examples
        {
          text: "What are your thoughts on the new architecture?",
          embedding: this.generateSyntheticEmbedding("discussion thoughts architecture design"),
          labels: ["discussion"],
          confidence: 0.8
        },
        {
          text: "Let's discuss the pros and cons of this approach",
          embedding: this.generateSyntheticEmbedding("discussion pros cons approach debate"),
          labels: ["discussion"],
          confidence: 0.85
        },
        {
          text: "I think we should consider alternative solutions",
          embedding: this.generateSyntheticEmbedding("discussion alternative solutions consider"),
          labels: ["discussion"],
          confidence: 0.75
        }
      ];

      log.info('Loaded few-shot examples', { count: examples.length });
      return examples;
    } catch (error) {
      log.error('Failed to load few-shot examples', { error });
      return [];
    }
  }

  /**
   * Set up similarity search (placeholder)
   */
  private async setupSimilaritySearch(examples: FewShotExample[]): Promise<void> {
    // In a real implementation, this would:
    // 1. Build a similarity search index (FAISS, Annoy, etc.)
    // 2. Optimize for fast nearest neighbor search
    // 3. Support approximate search for large example sets
    
    this.fewShotExamples = examples;
    log.info('Similarity search setup completed', { exampleCount: examples.length });
  }

  /**
   * Generate embedding for text (placeholder)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    // In a real implementation, this would use sentence transformers
    // For demonstration, generate a synthetic embedding based on text
    const embedding = this.generateSyntheticEmbedding(text);
    
    // Cache the embedding
    this.embeddingCache.set(text, embedding);
    
    return embedding;
  }

  /**
   * Generate synthetic embedding for demonstration
   */
  private generateSyntheticEmbedding(text: string): number[] {
    // Create a deterministic but realistic embedding based on text content
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);
    
    // Use word hashes to create consistent embeddings
    words.forEach((word, wordIndex) => {
      const hash = this.simpleHash(word);
      for (let i = 0; i < embedding.length; i++) {
        const influence = Math.sin((hash + i + wordIndex) * 0.1) * 0.1;
        embedding[i] += influence;
      }
    });

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  /**
   * Simple hash function for consistent synthetic embeddings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}