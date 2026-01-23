-- Simple verification script for signal_clusters materialized view
-- This script can be run manually to verify the migration worked

-- Check if the materialized view exists
SELECT 
  schemaname,
  matviewname,
  matviewowner,
  tablespace,
  hasindexes,
  ispopulated,
  definition
FROM pg_matviews 
WHERE matviewname = 'signal_clusters';

-- Check if the refresh function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'refresh_signal_clusters';

-- Show the view structure
\d signal_clusters

-- Test the refresh function (this should work even with no data)
SELECT refresh_signal_clusters();

-- Query the view (should return empty result if no data)
SELECT * FROM signal_clusters LIMIT 5;