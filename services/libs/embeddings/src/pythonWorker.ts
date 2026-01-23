import { spawn, ChildProcess } from 'child_process';
import { getServiceChildLogger } from '@gitmesh/logging';
import { IPythonEmbeddingWorker } from './types';

/**
 * Python worker for embedding generation using sentence transformers
 */
export class PythonEmbeddingWorker implements IPythonEmbeddingWorker {
  private logger: ReturnType<typeof getServiceChildLogger>;
  private timeoutMs: number;

  constructor(timeoutMs: number = 30000) {
    this.logger = getServiceChildLogger('PythonEmbeddingWorker');
    this.timeoutMs = timeoutMs;
  }

  /**
   * Generate embedding using Python sentence transformers
   */
  async generateEmbedding(text: string, modelName: string): Promise<number[]> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      if (text.length > 10000) {
        // Truncate very long text to prevent memory issues
        text = text.substring(0, 10000);
        this.logger.warn('Text truncated to 10000 characters for embedding generation');
      }

      const result = await this.executePythonScript('generate_embedding', {
        text: text.trim(),
        model_name: modelName,
      });

      const embedding = result.embedding;
      
      // Validate embedding dimensions
      if (!Array.isArray(embedding) || embedding.length !== 384) {
        throw new Error(`Invalid embedding dimensions: expected 384, got ${embedding?.length || 'undefined'}`);
      }

      // Validate embedding values are numbers
      if (!embedding.every(val => typeof val === 'number' && !isNaN(val))) {
        throw new Error('Embedding contains invalid values');
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug('Embedding generated successfully', {
        textLength: text.length,
        embeddingDimensions: embedding.length,
        processingTimeMs: processingTime,
      });

      return embedding;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Failed to generate embedding', {
        error: error.message,
        textLength: text?.length || 0,
        processingTimeMs: processingTime,
      });
      throw error;
    }
  }

  /**
   * Quantize embedding vector from 384 to target dimensions
   */
  async quantizeEmbedding(
    embedding: number[],
    targetDimensions: number
  ): Promise<number[]> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!Array.isArray(embedding) || embedding.length !== 384) {
        throw new Error(`Invalid embedding dimensions: expected 384, got ${embedding?.length || 'undefined'}`);
      }

      if (targetDimensions <= 0 || targetDimensions >= 384) {
        throw new Error(`Invalid target dimensions: ${targetDimensions}`);
      }

      const result = await this.executePythonScript('quantize_embedding', {
        embedding,
        target_dimensions: targetDimensions,
      });

      const quantizedEmbedding = result.quantized_embedding;

      // Validate quantized embedding
      if (!Array.isArray(quantizedEmbedding) || quantizedEmbedding.length !== targetDimensions) {
        throw new Error(`Invalid quantized embedding dimensions: expected ${targetDimensions}, got ${quantizedEmbedding?.length || 'undefined'}`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug('Embedding quantized successfully', {
        originalDimensions: embedding.length,
        targetDimensions,
        processingTimeMs: processingTime,
      });

      return quantizedEmbedding;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Failed to quantize embedding', {
        error: error.message,
        originalDimensions: embedding?.length || 0,
        targetDimensions,
        processingTimeMs: processingTime,
      });
      throw error;
    }
  }

  /**
   * Execute Python script with given operation and data
   */
  private async executePythonScript(
    operation: string,
    data: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import json
import sys
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA
import warnings
warnings.filterwarnings('ignore')

def generate_embedding(data):
    model = SentenceTransformer(data['model_name'])
    embedding = model.encode(data['text'])
    return {'embedding': embedding.tolist()}

def quantize_embedding(data):
    embedding = np.array(data['embedding']).reshape(1, -1)
    pca = PCA(n_components=data['target_dimensions'])
    quantized = pca.fit_transform(embedding)
    return {'quantized_embedding': quantized[0].tolist()}

if __name__ == '__main__':
    try:
        input_data = json.loads(sys.argv[1])
        operation = input_data['operation']
        
        if operation == 'generate_embedding':
            result = generate_embedding(input_data)
        elif operation == 'quantize_embedding':
            result = quantize_embedding(input_data)
        else:
            raise ValueError(f'Unknown operation: {operation}')
            
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
`;

      const inputData = JSON.stringify({
        operation,
        ...data,
      });

      const python: ChildProcess = spawn('python3', ['-c', pythonScript, inputData], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      python.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        python.kill('SIGKILL');
        reject(new Error(`Python script timeout after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      python.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          this.logger.error('Python script failed', {
            code,
            stderr,
            operation,
          });
          
          try {
            const errorResult = JSON.parse(stderr);
            reject(new Error(errorResult.error || 'Python script failed'));
          } catch {
            reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          }
          return;
        }

        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(new Error(`Failed to parse Python script output: ${error.message}`));
        }
      });

      python.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }
}