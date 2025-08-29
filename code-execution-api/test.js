const http = require('http');

// Test configuration
const API_URL = 'http://localhost:3003';
const API_KEY = 'wmoj-custom-api-key-2024-secure';

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test cases
async function runTests() {
  console.log('🧪 Starting API tests...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const health = await makeRequest('/health');
    console.log(`Status: ${health.status}`);
    console.log(`Response:`, health.data);
    console.log('✅ Health check passed\n');

    // Test 2: Get languages
    console.log('2️⃣ Testing languages endpoint...');
    const languages = await makeRequest('/languages');
    console.log(`Status: ${languages.status}`);
    console.log(`Supported languages: ${languages.data.data?.map(l => l.id).join(', ')}`);
    console.log('✅ Languages check passed\n');

    // Test 3: Simple code execution
    console.log('3️⃣ Testing simple code execution...');
    const execution = await makeRequest('/execute', 'POST', {
      language: 'python',
      code: 'print("Hello, World!")',
      input: ''
    });
    console.log(`Status: ${execution.status}`);
    console.log(`Output: "${execution.data.output}"`);
    console.log(`Success: ${execution.data.success}`);
    console.log('✅ Simple execution passed\n');

    // Test 4: Judge with test cases
    console.log('4️⃣ Testing judge with test cases...');
    const judge = await makeRequest('/judge', 'POST', {
      language: 'python',
      code: `
a, b = map(int, input().split())
print(a + b)
      `.trim(),
      testCases: [
        {
          input: '2 3',
          expectedOutput: '5',
          points: 1
        },
        {
          input: '10 20',
          expectedOutput: '30',
          points: 1
        },
        {
          input: '0 0',
          expectedOutput: '0',
          points: 1
        }
      ]
    });
    console.log(`Status: ${judge.status}`);
    console.log(`Score: ${judge.data.totalScore}/${judge.data.maxScore}`);
    console.log(`Passed: ${judge.data.testCasesPassed}/${judge.data.totalTestCases}`);
    console.log(`Status: ${judge.data.status}`);
    console.log('✅ Judge test passed\n');

    // Test 5: Error handling
    console.log('5️⃣ Testing error handling...');
    const errorTest = await makeRequest('/execute', 'POST', {
      language: 'python',
      code: 'print(undefined_variable)',
      input: ''
    });
    console.log(`Status: ${errorTest.status}`);
    console.log(`Success: ${errorTest.data.success}`);
    console.log(`Error: ${errorTest.data.error}`);
    console.log('✅ Error handling passed\n');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, makeRequest };
