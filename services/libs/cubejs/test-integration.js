const cubejs = require('@cubejs-client/core').default || require('@cubejs-client/core');
const jwt = require('jsonwebtoken');

const CUBEJS_API_URL = 'http://localhost:4000/cubejs-api/v1';
const CUBEJS_JWT_SECRET = '137ea167812145c6d77452a58d7dd29b';
const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_SEGMENTS = ['660e8400-e29b-41d4-a716-446655440001'];

const MEASURES = {
  ORGANIZATION_COUNT: 'Organizations.count',
  MEMBER_COUNT: 'Members.count',
  ACTIVITY_COUNT: 'Activities.count',
  CONVERSATION_COUNT: 'Conversations.count'
};

const DIMENSIONS = {
  IS_TEAM_MEMBER: 'Members.isTeamMember',
  ACTIVITY_DATE: 'Activities.date',
  MEMBER_JOINED_AT: 'Members.joinedAt',
  ORGANIZATIONS_JOINED_AT: 'Organizations.joinedAt'
};

function generateToken(tenantId, segments) {
  return jwt.sign({ tenantId, segments }, CUBEJS_JWT_SECRET, { expiresIn: '1h' });
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function runIntegrationTests() {
  console.log('🚀 Starting CubeJS Integration Tests...\n');
  
  const token = generateToken(TEST_TENANT_ID, TEST_SEGMENTS);
  const cubeApi = cubejs(token, { apiUrl: CUBEJS_API_URL });
  
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Organizations.count query
  try {
    console.log('📊 Testing Organizations.count query...');
    const query = {
      measures: [MEASURES.ORGANIZATION_COUNT],
      limit: 1000
    };
    
    const result = await cubeApi.load(query);
    const data = result.loadResponses[0].data;
    
    if (Array.isArray(data) && data.length >= 0) {
      const count = data.length > 0 ? data[0][MEASURES.ORGANIZATION_COUNT] : '0';
      console.log(`✅ Organizations.count: ${count} organizations`);
      passedTests++;
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.log(`❌ Organizations.count failed: ${error.message}`);
    failedTests++;
  }
  
  // Test 2: Members.count with filter
  try {
    console.log('📊 Testing Members.count with isTeamMember filter...');
    const query = {
      measures: [MEASURES.MEMBER_COUNT],
      filters: [{
        member: DIMENSIONS.IS_TEAM_MEMBER,
        operator: 'equals',
        values: ['false']
      }],
      limit: 1000
    };
    
    const result = await cubeApi.load(query);
    const data = result.loadResponses[0].data;
    
    if (Array.isArray(data)) {
      const count = data.length > 0 ? data[0][MEASURES.MEMBER_COUNT] : '0';
      console.log(`✅ Members.count (isTeamMember=false): ${count} members`);
      passedTests++;
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.log(`❌ Members.count with filter failed: ${error.message}`);
    failedTests++;
  }
  
  // Test 3: Activities.count with time dimension
  try {
    console.log('📊 Testing Activities.count with time dimension...');
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const query = {
      measures: [MEASURES.ACTIVITY_COUNT],
      timeDimensions: [{
        dimension: DIMENSIONS.ACTIVITY_DATE,
        dateRange: [formatDate(oneMonthAgo), formatDate(new Date())]
      }],
      limit: 1000
    };
    
    const result = await cubeApi.load(query);
    const data = result.loadResponses[0].data;
    
    if (Array.isArray(data)) {
      const count = data.length > 0 ? data[0][MEASURES.ACTIVITY_COUNT] : '0';
      console.log(`✅ Activities.count with time dimension: ${count} activities`);
      passedTests++;
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.log(`❌ Activities.count with time dimension failed: ${error.message}`);
    failedTests++;
  }
  
  // Test 4: Error handling - Invalid measure
  try {
    console.log('📊 Testing error handling with invalid measure...');
    const query = {
      measures: ['InvalidCube.invalidMeasure'],
      limit: 10
    };
    
    await cubeApi.load(query);
    console.log(`❌ Error handling test failed: Should have thrown an error`);
    failedTests++;
  } catch (error) {
    console.log(`✅ Error handling works correctly: ${error.message.substring(0, 100)}...`);
    passedTests++;
  }
  
  // Test 5: Error handling - Missing measures
  try {
    console.log('📊 Testing error handling with missing measures...');
    const query = {
      dimensions: [DIMENSIONS.IS_TEAM_MEMBER],
      limit: 10
    };
    
    await cubeApi.load(query);
    console.log(`❌ Error handling test failed: Should have thrown an error`);
    failedTests++;
  } catch (error) {
    console.log(`✅ Missing measures error handled correctly: ${error.message.substring(0, 100)}...`);
    passedTests++;
  }
  
  // Test 6: Error handling - Invalid JWT
  try {
    console.log('📊 Testing error handling with invalid JWT...');
    const invalidToken = jwt.sign({ tenantId: TEST_TENANT_ID, segments: TEST_SEGMENTS }, 'wrong-secret', { expiresIn: '1h' });
    const invalidApi = cubejs(invalidToken, { apiUrl: CUBEJS_API_URL });
    
    const query = {
      measures: [MEASURES.ORGANIZATION_COUNT],
      limit: 10
    };
    
    await invalidApi.load(query);
    console.log(`❌ JWT error handling test failed: Should have thrown an error`);
    failedTests++;
  } catch (error) {
    console.log(`✅ Invalid JWT error handled correctly: ${error.message.substring(0, 100)}...`);
    passedTests++;
  }
  
  console.log('\n📋 Test Summary:');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All integration tests passed! Task 13 completed successfully.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    return false;
  }
}

// Run the tests
runIntegrationTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Integration test runner failed:', error);
    process.exit(1);
  });