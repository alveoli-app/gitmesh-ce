/**
 * @gitmesh/embeddings - Embedding generation library for signal intelligence
 * 
 * This library provides semantic embedding generation using Sentence Transformers
 * with Redis caching and vector quantization capabilities.
 */

export * from './types';
export * from './embeddingService';
export * from './pythonWorker';

// Re-export main service as default
export { EmbeddingService as default } from './embeddingService';