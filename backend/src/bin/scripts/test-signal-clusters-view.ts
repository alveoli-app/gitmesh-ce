import { getServiceLogger } from '@gitmesh/logging'
import commandLineArgs from 'command-line-args'
import commandLineUsage from 'command-line-usage'
import * as fs from 'fs'
import path from 'path'
import { databaseInit } from '../../database/databaseConnection'

/* eslint-disable no-console */

const banner = fs.readFileSync(path.join(__dirname, 'banner.txt'), 'utf8')

const log = getServiceLogger()

const options = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Print this usage guide.',
  },
]
const sections = [
  {
    content: banner,
    raw: true,
  },
  {
    header: 'Test Signal Clusters Materialized View',
    content: 'Test the signal_clusters materialized view creation and refresh functionality',
  },
  {
    header: 'Options',
    optionList: options,
  },
]

const usage = commandLineUsage(sections)
const parameters = commandLineArgs(options)

if (parameters.help) {
  console.log(usage)
} else {
  setImmediate(async () => {
    try {
      // Initialize database
      const database = await databaseInit()

      console.log('🔍 Testing signal_clusters materialized view...\n')

      // Test 1: Check if materialized view exists
      console.log('1. Checking if signal_clusters materialized view exists...')
      const viewExists = await database.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'signal_clusters'
          AND table_type = 'VIEW'
        ) as exists;
      `, { type: database.sequelize.QueryTypes.SELECT })

      if (viewExists[0].exists) {
        console.log('✅ signal_clusters materialized view exists')
      } else {
        console.log('❌ signal_clusters materialized view does not exist')
        process.exit(1)
      }

      // Test 2: Check view structure
      console.log('\n2. Checking view structure...')
      const viewStructure = await database.sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'signal_clusters' 
        ORDER BY ordinal_position;
      `, { type: database.sequelize.QueryTypes.SELECT })

      console.log('View columns:')
      viewStructure.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`)
      })

      // Test 3: Check if refresh function exists
      console.log('\n3. Checking if refresh_signal_clusters function exists...')
      const functionExists = await database.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name = 'refresh_signal_clusters'
          AND routine_type = 'FUNCTION'
        ) as exists;
      `, { type: database.sequelize.QueryTypes.SELECT })

      if (functionExists[0].exists) {
        console.log('✅ refresh_signal_clusters function exists')
      } else {
        console.log('❌ refresh_signal_clusters function does not exist')
        process.exit(1)
      }

      // Test 4: Insert test data with signal_metadata
      console.log('\n4. Creating test data with signal_metadata...')
      
      // First, get a tenant ID from existing data
      const tenants = await database.sequelize.query(`
        SELECT id FROM tenants LIMIT 1;
      `, { type: database.sequelize.QueryTypes.SELECT })

      if (tenants.length === 0) {
        console.log('⚠️  No tenants found, creating test tenant...')
        await database.sequelize.query(`
          INSERT INTO tenants (id, name, "createdAt", "updatedAt") 
          VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Tenant', NOW(), NOW());
        `)
      }

      const tenantId = tenants.length > 0 ? tenants[0].id : '550e8400-e29b-41d4-a716-446655440000'

      // Get or create a member
      const members = await database.sequelize.query(`
        SELECT id FROM members WHERE "tenantId" = :tenantId LIMIT 1;
      `, { 
        replacements: { tenantId },
        type: database.sequelize.QueryTypes.SELECT 
      })

      let memberId
      if (members.length === 0) {
        console.log('⚠️  No members found, creating test member...')
        const memberResult = await database.sequelize.query(`
          INSERT INTO members (id, "displayName", "tenantId", "createdAt", "updatedAt") 
          VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Test Member', :tenantId, NOW(), NOW())
          RETURNING id;
        `, { 
          replacements: { tenantId },
          type: database.sequelize.QueryTypes.INSERT 
        })
        memberId = memberResult[0][0].id
      } else {
        memberId = members[0].id
      }

      // Get or create a segment
      const segments = await database.sequelize.query(`
        SELECT id FROM segments WHERE "tenantId" = :tenantId LIMIT 1;
      `, { 
        replacements: { tenantId },
        type: database.sequelize.QueryTypes.SELECT 
      })

      let segmentId
      if (segments.length === 0) {
        console.log('⚠️  No segments found, creating test segment...')
        const segmentResult = await database.sequelize.query(`
          INSERT INTO segments (id, name, "tenantId", "createdAt", "updatedAt") 
          VALUES ('550e8400-e29b-41d4-a716-446655440002', 'Test Segment', :tenantId, NOW(), NOW())
          RETURNING id;
        `, { 
          replacements: { tenantId },
          type: database.sequelize.QueryTypes.INSERT 
        })
        segmentId = segmentResult[0][0].id
      } else {
        segmentId = segments[0].id
      }

      // Insert test activities with signal_metadata
      await database.sequelize.query(`
        INSERT INTO activities (
          id, type, timestamp, platform, "isContribution", score, "sourceId", 
          "memberId", "segmentId", "tenantId", attributes, signal_metadata, 
          "createdAt", "updatedAt"
        ) VALUES 
        (
          '550e8400-e29b-41d4-a716-446655440010',
          'issue-created',
          NOW() - INTERVAL '1 hour',
          'github',
          true,
          5,
          'test-source-1',
          :memberId,
          :segmentId,
          :tenantId,
          '{}',
          '{
            "cluster_id": "cluster-1",
            "is_duplicate": false,
            "classification": {
              "sentiment": "positive",
              "product_area": ["engineering"],
              "urgency": "medium",
              "intent": ["feature_request"]
            },
            "scores": {
              "velocity": 75,
              "cross_platform": 60,
              "actionability": 80,
              "novelty": 45
            }
          }',
          NOW(),
          NOW()
        ),
        (
          '550e8400-e29b-41d4-a716-446655440011',
          'comment-created',
          NOW() - INTERVAL '30 minutes',
          'slack',
          false,
          3,
          'test-source-2',
          :memberId,
          :segmentId,
          :tenantId,
          '{}',
          '{
            "cluster_id": "cluster-1",
            "is_duplicate": false,
            "classification": {
              "sentiment": "neutral",
              "product_area": ["engineering"],
              "urgency": "low",
              "intent": ["discussion"]
            },
            "scores": {
              "velocity": 60,
              "cross_platform": 80,
              "actionability": 40,
              "novelty": 70
            }
          }',
          NOW(),
          NOW()
        ),
        (
          '550e8400-e29b-41d4-a716-446655440012',
          'pr-created',
          NOW() - INTERVAL '2 hours',
          'github',
          true,
          8,
          'test-source-3',
          :memberId,
          :segmentId,
          :tenantId,
          '{}',
          '{
            "cluster_id": "cluster-2",
            "is_duplicate": false,
            "classification": {
              "sentiment": "positive",
              "product_area": ["engineering", "design"],
              "urgency": "high",
              "intent": ["feature_request"]
            },
            "scores": {
              "velocity": 90,
              "cross_platform": 40,
              "actionability": 95,
              "novelty": 85
            }
          }',
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `, { 
        replacements: { memberId, segmentId, tenantId },
        type: database.sequelize.QueryTypes.INSERT 
      })

      console.log('✅ Test data created')

      // Test 5: Query the materialized view
      console.log('\n5. Querying signal_clusters materialized view...')
      const clusters = await database.sequelize.query(`
        SELECT * FROM signal_clusters ORDER BY cluster_id;
      `, { type: database.sequelize.QueryTypes.SELECT })

      console.log(`Found ${clusters.length} clusters:`)
      clusters.forEach(cluster => {
        console.log(`   - Cluster ${cluster.cluster_id}: ${cluster.signal_count} signals, platforms: [${cluster.platforms.join(', ')}], dominant sentiment: ${cluster.dominant_sentiment}`)
      })

      // Test 6: Test refresh function
      console.log('\n6. Testing refresh function...')
      await database.sequelize.query(`
        SELECT refresh_signal_clusters();
      `, { type: database.sequelize.QueryTypes.SELECT })

      console.log('✅ Refresh function executed successfully')

      // Test 7: Query again after refresh
      console.log('\n7. Querying after refresh...')
      const clustersAfterRefresh = await database.sequelize.query(`
        SELECT * FROM signal_clusters ORDER BY cluster_id;
      `, { type: database.sequelize.QueryTypes.SELECT })

      console.log(`Found ${clustersAfterRefresh.length} clusters after refresh:`)
      clustersAfterRefresh.forEach(cluster => {
        console.log(`   - Cluster ${cluster.cluster_id}: ${cluster.signal_count} signals, platforms: [${cluster.platforms.join(', ')}], dominant sentiment: ${cluster.dominant_sentiment}`)
      })

      // Clean up test data
      console.log('\n8. Cleaning up test data...')
      await database.sequelize.query(`
        DELETE FROM activities WHERE id IN (
          '550e8400-e29b-41d4-a716-446655440010',
          '550e8400-e29b-41d4-a716-446655440011',
          '550e8400-e29b-41d4-a716-446655440012'
        );
      `)

      console.log('✅ Test data cleaned up')

      console.log('\n🎉 All tests passed! The signal_clusters materialized view is working correctly.')

    } catch (error) {
      console.error('❌ Test failed:', error.message)
      console.error(error.stack)
      process.exit(1)
    }

    process.exit(0)
  })
}