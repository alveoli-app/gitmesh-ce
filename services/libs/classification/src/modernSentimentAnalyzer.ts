import { getServiceChildLogger } from '@gitmesh/logging';

const log = getServiceChildLogger('modern-sentiment');

/**
 * Modern sentiment analyzer using lexicon-based approach with context awareness
 * This is more accurate than the existing random-based dev implementation
 * and more efficient than AWS Comprehend for simple sentiment analysis
 */
export class ModernSentimentAnalyzer {
  private positiveWords: Set<string>;
  private negativeWords: Set<string>;
  private intensifiers: Set<string>;
  private negators: Set<string>;
  private initialized = false;

  constructor() {
    this.positiveWords = new Set();
    this.negativeWords = new Set();
    this.intensifiers = new Set();
    this.negators = new Set();
  }

  /**
   * Initialize the sentiment analyzer with word lists
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      log.info('Initializing modern sentiment analyzer');

      // Load positive words
      this.positiveWords = new Set([
        'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful',
        'perfect', 'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'delighted',
        'impressed', 'outstanding', 'brilliant', 'superb', 'magnificent', 'marvelous',
        'terrific', 'fabulous', 'incredible', 'remarkable', 'exceptional', 'phenomenal',
        'beautiful', 'nice', 'fine', 'cool', 'sweet', 'solid', 'smooth', 'clean',
        'elegant', 'efficient', 'fast', 'quick', 'easy', 'simple', 'helpful', 'useful',
        'valuable', 'beneficial', 'positive', 'optimistic', 'confident', 'successful',
        'win', 'winner', 'victory', 'triumph', 'achieve', 'accomplish', 'complete',
        'solve', 'fix', 'improve', 'enhance', 'upgrade', 'better', 'best', 'top',
        'recommend', 'approve', 'support', 'endorse', 'praise', 'compliment', 'thank',
        'thanks', 'grateful', 'appreciate', 'admire', 'respect', 'honor', 'celebrate'
      ]);

      // Load negative words
      this.negativeWords = new Set([
        'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'dislike',
        'annoying', 'frustrating', 'disappointing', 'sad', 'angry', 'upset', 'mad',
        'furious', 'irritated', 'bothered', 'concerned', 'worried', 'anxious', 'stressed',
        'broken', 'bug', 'error', 'issue', 'problem', 'trouble', 'difficulty', 'challenge',
        'fail', 'failure', 'failed', 'failing', 'wrong', 'incorrect', 'mistake', 'error',
        'crash', 'freeze', 'hang', 'slow', 'sluggish', 'laggy', 'unresponsive', 'stuck',
        'confusing', 'complicated', 'difficult', 'hard', 'impossible', 'useless', 'worthless',
        'pointless', 'meaningless', 'waste', 'wasted', 'loss', 'lose', 'losing', 'lost',
        'reject', 'deny', 'refuse', 'decline', 'disapprove', 'criticize', 'complain',
        'complaint', 'blame', 'fault', 'guilty', 'shame', 'embarrass', 'regret', 'sorry',
        'unfortunately', 'sadly', 'worse', 'worst', 'poor', 'lacking', 'missing', 'absent'
      ]);

      // Load intensifiers
      this.intensifiers = new Set([
        'very', 'really', 'extremely', 'incredibly', 'amazingly', 'absolutely', 'totally',
        'completely', 'entirely', 'fully', 'quite', 'rather', 'pretty', 'fairly',
        'highly', 'deeply', 'strongly', 'seriously', 'definitely', 'certainly', 'surely',
        'truly', 'genuinely', 'particularly', 'especially', 'remarkably', 'exceptionally',
        'extraordinarily', 'tremendously', 'immensely', 'vastly', 'hugely', 'massively'
      ]);

      // Load negators
      this.negators = new Set([
        'not', 'no', 'never', 'none', 'nothing', 'nobody', 'nowhere', 'neither',
        'nor', 'hardly', 'barely', 'scarcely', 'rarely', 'seldom', 'without',
        'lack', 'lacks', 'lacking', 'absent', 'missing', 'fail', 'failed', 'unable',
        'cannot', 'cant', 'couldnt', 'wouldnt', 'shouldnt', 'dont', 'doesnt', 'didnt',
        'wont', 'isnt', 'arent', 'wasnt', 'werent', 'hasnt', 'havent', 'hadnt'
      ]);

      this.initialized = true;
      log.info('Modern sentiment analyzer initialized successfully');
    } catch (error) {
      log.error('Failed to initialize modern sentiment analyzer', { error });
      throw error;
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text: string): Promise<{
    label: string;
    confidence: number;
    scores: {
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    };
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!text || text.trim().length === 0) {
      return {
        label: 'neutral',
        confidence: 0.5,
        scores: { positive: 0, negative: 0, neutral: 100, mixed: 0 }
      };
    }

    try {
      const analysis = this.performSentimentAnalysis(text);
      
      log.debug('Sentiment analysis completed', {
        text: text.substring(0, 100) + '...',
        result: analysis
      });

      return analysis;
    } catch (error) {
      log.warn('Sentiment analysis failed, returning neutral', { error });
      return {
        label: 'neutral',
        confidence: 0.5,
        scores: { positive: 0, negative: 0, neutral: 100, mixed: 0 }
      };
    }
  }

  /**
   * Perform the actual sentiment analysis
   */
  private performSentimentAnalysis(text: string): {
    label: string;
    confidence: number;
    scores: {
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    };
  } {
    // Normalize text
    const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = normalizedText.split(/\s+/).filter(word => word.length > 0);

    let positiveScore = 0;
    let negativeScore = 0;
    let totalWords = 0;

    // Analyze each word with context
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prevWord = i > 0 ? words[i - 1] : '';
      const nextWord = i < words.length - 1 ? words[i + 1] : '';

      // Skip if word is too short
      if (word.length < 2) continue;

      totalWords++;

      // Check for sentiment words
      let wordScore = 0;
      if (this.positiveWords.has(word)) {
        wordScore = 1;
      } else if (this.negativeWords.has(word)) {
        wordScore = -1;
      }

      // Apply intensifiers
      if (wordScore !== 0) {
        if (this.intensifiers.has(prevWord)) {
          wordScore *= 1.5; // Amplify sentiment
        }

        // Apply negation
        if (this.negators.has(prevWord) || this.negators.has(nextWord)) {
          wordScore *= -1; // Flip sentiment
        }

        // Add to appropriate score
        if (wordScore > 0) {
          positiveScore += wordScore;
        } else {
          negativeScore += Math.abs(wordScore);
        }
      }
    }

    // Calculate normalized scores
    const totalSentimentWords = positiveScore + negativeScore;
    
    if (totalSentimentWords === 0) {
      // No sentiment words found - neutral
      return {
        label: 'neutral',
        confidence: 0.6,
        scores: { positive: 0, negative: 0, neutral: 100, mixed: 0 }
      };
    }

    // Normalize scores to percentages
    const positivePercent = (positiveScore / totalSentimentWords) * 100;
    const negativePercent = (negativeScore / totalSentimentWords) * 100;

    // Determine dominant sentiment
    const sentimentDifference = Math.abs(positivePercent - negativePercent);
    const confidence = Math.min(sentimentDifference / 100 + 0.5, 1.0);

    let label: string;
    let scores: { positive: number; negative: number; neutral: number; mixed: number };

    if (sentimentDifference < 20) {
      // Mixed sentiment
      label = 'mixed';
      scores = {
        positive: positivePercent,
        negative: negativePercent,
        neutral: Math.max(0, 100 - positivePercent - negativePercent),
        mixed: 100
      };
    } else if (positivePercent > negativePercent) {
      // Positive sentiment
      label = 'positive';
      scores = {
        positive: 100,
        negative: (negativePercent / positivePercent) * 50,
        neutral: Math.max(0, 100 - positivePercent - negativePercent),
        mixed: sentimentDifference < 40 ? 30 : 0
      };
    } else {
      // Negative sentiment
      label = 'negative';
      scores = {
        positive: (positivePercent / negativePercent) * 50,
        negative: 100,
        neutral: Math.max(0, 100 - positivePercent - negativePercent),
        mixed: sentimentDifference < 40 ? 30 : 0
      };
    }

    return {
      label,
      confidence,
      scores
    };
  }

  /**
   * Batch analyze sentiment for multiple texts
   */
  async analyzeSentimentBatch(texts: string[]): Promise<Array<{
    label: string;
    confidence: number;
    scores: {
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    };
  }>> {
    if (!this.initialized) {
      await this.initialize();
    }

    return Promise.all(texts.map(text => this.analyzeSentiment(text)));
  }
}