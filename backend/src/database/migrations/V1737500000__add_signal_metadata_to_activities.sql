--
-- Signal Intelligence - Add signal_metadata column to activities table
-- Adds JSONB column for storing signal enrichment data including:
-- - Embedding references
-- - MinHash signatures for deduplication
-- - Classification results (product area, sentiment, urgency, intent)
-- - Pre-computed scores (velocity, cross-platform, actionability, novelty)
-- - Cluster assignments
--

-- Add signal_metadata column with default empty object
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS signal_metadata JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for classification queries
-- Allows efficient filtering by classification labels
CREATE INDEX IF NOT EXISTS idx_activities_signal_classification 
ON activities USING GIN ((signal_metadata->'classification'));

-- Create GIN index for scores queries
-- Allows efficient filtering and sorting by score values
CREATE INDEX IF NOT EXISTS idx_activities_signal_scores 
ON activities USING GIN ((signal_metadata->'scores'));

-- Create B-tree index for cluster_id queries
-- Allows efficient filtering by cluster membership
CREATE INDEX IF NOT EXISTS idx_activities_cluster_id 
ON activities ((signal_metadata->>'cluster_id'));

-- Create B-tree index for is_duplicate queries
-- Allows efficient filtering of duplicate vs canonical signals
CREATE INDEX IF NOT EXISTS idx_activities_is_duplicate 
ON activities ((signal_metadata->>'is_duplicate'));

-- Add comment to document the signal_metadata structure
COMMENT ON COLUMN activities.signal_metadata IS 
'Signal intelligence metadata including:
{
  "embedding_id": "uuid",           -- Reference to cached embedding
  "minhash_signature": "string",    -- 64-bit signature for deduplication
  "is_duplicate": boolean,          -- Whether this is a duplicate signal
  "canonical_id": "uuid",           -- If duplicate, points to original
  "classification": {
    "product_area": ["engineering"], -- Multi-label product area
    "sentiment": "positive",         -- Sentiment classification
    "urgency": "medium",             -- Urgency level
    "intent": ["feature_request"],   -- Multi-label intent
    "confidence": 0.85               -- Classification confidence
  },
  "scores": {
    "velocity": 75,                  -- Activity velocity score (0-100)
    "cross_platform": 60,            -- Cross-platform activity score (0-100)
    "actionability": 80,             -- Actionability score (0-100)
    "novelty": 45                    -- Novelty score (0-100)
  },
  "cluster_id": "string",            -- Cluster assignment
  "enriched_at": "timestamp",        -- When enrichment was performed
  "enrichment_version": "1.0"        -- Version of enrichment pipeline
}';
