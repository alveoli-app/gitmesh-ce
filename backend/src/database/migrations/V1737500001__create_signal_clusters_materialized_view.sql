--
-- Signal Intelligence - Create signal_clusters materialized view
-- Creates a materialized view for cluster statistics and metadata
-- Includes cluster size, platforms, time range, and dominant sentiment
--

-- Create materialized view for signal clusters
-- This view aggregates cluster statistics from activities with signal_metadata
CREATE MATERIALIZED VIEW signal_clusters AS
SELECT 
  signal_metadata->>'cluster_id' as cluster_id,
  COUNT(*) as signal_count,
  array_agg(DISTINCT platform) as platforms,
  MIN(timestamp) as first_seen,
  MAX(timestamp) as last_seen,
  mode() WITHIN GROUP (ORDER BY signal_metadata->'classification'->>'sentiment') as dominant_sentiment
FROM activities
WHERE signal_metadata->>'cluster_id' IS NOT NULL
  AND signal_metadata->>'is_duplicate' = 'false'
  AND "deletedAt" IS NULL
GROUP BY signal_metadata->>'cluster_id';

-- Create unique index on cluster_id for efficient lookups
CREATE UNIQUE INDEX ON signal_clusters (cluster_id);

-- Create refresh function for periodic updates
-- This function refreshes the materialized view concurrently to avoid blocking
CREATE OR REPLACE FUNCTION refresh_signal_clusters()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY signal_clusters;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the materialized view structure
COMMENT ON MATERIALIZED VIEW signal_clusters IS 
'Signal cluster statistics and metadata including:
- cluster_id: Unique identifier for the cluster
- signal_count: Number of non-duplicate signals in the cluster
- platforms: Array of distinct platforms represented in the cluster
- first_seen: Timestamp of the earliest signal in the cluster
- last_seen: Timestamp of the most recent signal in the cluster
- dominant_sentiment: Most common sentiment classification in the cluster';
