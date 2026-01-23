/**
 * @gitmesh/classification - Multi-label classification library for signal intelligence
 * 
 * This library provides comprehensive classification capabilities for activities including:
 * - Product area classification (engineering, design, marketing, sales, support, product)
 * - Sentiment analysis (positive, negative, neutral, mixed)
 * - Intent classification (question, feedback, bug_report, feature_request, discussion)
 * - Urgency classification (critical, high, medium, low)
 * 
 * The library supports both ML-based classification with S3-stored models and
 * rule-based fallback classification for reliability.
 */

export * from './types';
export * from './classificationService';
export * from './productAreaClassifier';
export * from './intentClassifier';
export * from './urgencyClassifier';
export * from './modernSentimentAnalyzer';

// Re-export main service as default
export { ClassificationService as default } from './classificationService';