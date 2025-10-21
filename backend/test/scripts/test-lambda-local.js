// scripts/test-lambda-local.js
// Test Lambda function locally without deploying

// const { handler } = require('../lambda-click-tracker/index');

// Mock Lambda event for testing
const mockEvent = {
  pathParameters: {
    code: 'sarah-blog-1' // Test short code from seed data
  },
  path: '/sarah-blog-1',
  headers: {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'cookie': '', // Will generate new cookie
    'x-forwarded-for': '192.168.1.100',
    'referer': 'https://sarahtech.blog/best-saas-2025'
  },
  queryStringParameters: {
    utm_source: 'blog',
    utm_medium: 'article',
    utm_campaign: 'launch2025'
  },
  requestContext: {
    identity: {
      sourceIp: '192.168.1.100'
    }
  }
};

// Set environment variables for local testing
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'affable_platform';
process.env.DB_USER = 'admin';
process.env.DB_PASSWORD = 'admin';

console.log('🧪 Testing Lambda function locally...\n');
console.log('📝 Test Event:');
console.log(JSON.stringify(mockEvent, null, 2));
console.log('\n');

// Execute Lambda handler
handler(mockEvent)
  .then(response => {
    console.log('✅ Lambda Response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Check if redirect was successful
    if (response.statusCode === 302) {
      console.log('\n✅ SUCCESS: Redirect response received');
      console.log(`📍 Redirect Location: ${response.headers.Location}`);
      console.log(`🍪 Cookie Set: ${response.headers['Set-Cookie'] ? 'Yes' : 'No'}`);
    } else {
      console.log('\n❌ UNEXPECTED: Non-redirect status code');
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Lambda Error:');
    console.error(error);
    process.exit(1);
  });

// Alternative: Test with multiple scenarios
async function runTestSuite() {
  const scenarios = [
    {
      name: 'Valid short code',
      event: { ...mockEvent, pathParameters: { code: 'sarah-blog-1' } }
    },
    {
      name: 'Invalid short code',
      event: { ...mockEvent, pathParameters: { code: 'invalid-code' } }
    },
    {
      name: 'With existing cookie',
      event: { 
        ...mockEvent, 
        headers: { 
          ...mockEvent.headers, 
          cookie: 'afl_track=550e8400-e29b-41d4-a716-446655440000' 
        }
      }
    }
  ];
  
  console.log('🧪 Running Lambda Test Suite...\n');
  
  for (const scenario of scenarios) {
    console.log(`\n📋 Test: ${scenario.name}`);
    console.log('─'.repeat(50));
    
    try {
      const response = await handler(scenario.event);
      console.log(`Status: ${response.statusCode}`);
      console.log(`Success: ${response.statusCode === 302 || response.statusCode === 404 ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`Error: ❌ ${error.message}`);
    }
  }
}

// Uncomment to run full test suite
runTestSuite();