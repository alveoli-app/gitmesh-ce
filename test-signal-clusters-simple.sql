-- Simple test script for signal_clusters materialized view
-- This can be run manually against a database to verify functionality

-- Test 1: Check if materialized view exists
SELECT 
  schemaname,
  matviewname,
  ispopulated
FROM pg_matviews 
WHERE matviewname = 'signal_clusters';

-- Test 2: Check if refresh function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'refresh_signal_clusters';

-- Test 3: Check view structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'signal_clusters' 
ORDER BY ordinal_position;

-- Test 4: Test refresh function (should work even with no data)
SELECT refresh_signal_clusters();

-- Test 5: Query the view (will be empty if no signal data exists)
SELECT 
  cluster_id,
  signal_count,
  platforms,
  first_seen,
  last_seen,
  dominant_sentiment
FROM signal_clusters 
ORDER BY signal_count DESC 
LIMIT 5;