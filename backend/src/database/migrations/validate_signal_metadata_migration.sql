-- Validation script for signal_metadata migration
-- This script can be used to verify the migration syntax and structure
-- Run with: psql -U postgres -d gitmesh-web -f validate_signal_metadata_migration.sql

-- Check if signal_metadata column exists
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'activities' 
  AND column_name = 'signal_metadata';

-- Check if indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'activities' 
  AND indexname IN (
    'idx_activities_signal_classification',
    'idx_activities_signal_scores',
    'idx_activities_cluster_id',
    'idx_activities_is_duplicate'
  )
ORDER BY indexname;

-- Check column comment
SELECT 
    col_description('activities'::regclass, 
                    (SELECT ordinal_position 
                     FROM information_schema.columns 
                     WHERE table_name = 'activities' 
                       AND column_name = 'signal_metadata')) as column_comment;

-- Sample query to test index usage (requires EXPLAIN)
-- Uncomment to test:
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM activities 
-- WHERE signal_metadata->'classification'->>'sentiment' = 'positive';

-- Test data insertion (optional - uncomment to test)
-- BEGIN;
-- 
-- INSERT INTO activities (
--   id, type, timestamp, platform, "sourceId", "memberId", "tenantId", 
--   "createdAt", "updatedAt", signal_metadata
-- ) VALUES (
--   gen_random_uuid(),
--   'test-migration-validation',
--   NOW(),
--   'github',
--   'test-validation-' || gen_random_uuid()::text,
--   (SELECT id FROM members LIMIT 1),
--   (SELECT id FROM tenants LIMIT 1),
--   NOW(),
--   NOW(),
--   '{
--     "classification": {
--       "product_area": ["engineering"],
--       "sentiment": "positive",
--       "urgency": "medium",
--       "intent": ["feature_request"],
--       "confidence": 0.85
--     },
--     "scores": {
--       "velocity": 75,
--       "cross_platform": 60,
--       "actionability": 80,
--       "novelty": 45
--     },
--     "cluster_id": "test-cluster-123",
--     "is_duplicate": false,
--     "enriched_at": "2024-01-22T10:00:00Z",
--     "enrichment_version": "1.0"
--   }'::jsonb
-- );
-- 
-- -- Verify the insertion
-- SELECT 
--   id,
--   type,
--   signal_metadata->'classification'->>'sentiment' as sentiment,
--   signal_metadata->'scores'->>'velocity' as velocity_score,
--   signal_metadata->>'cluster_id' as cluster_id,
--   signal_metadata->>'is_duplicate' as is_duplicate
-- FROM activities 
-- WHERE type = 'test-migration-validation';
-- 
-- ROLLBACK;

-- Summary
SELECT 
    'Migration validation complete' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'activities' AND column_name = 'signal_metadata'
        ) THEN 'Column exists'
        ELSE 'Column missing'
    END as column_status,
    (
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE tablename = 'activities' 
          AND indexname IN (
            'idx_activities_signal_classification',
            'idx_activities_signal_scores',
            'idx_activities_cluster_id',
            'idx_activities_is_duplicate'
          )
    ) as indexes_created;
