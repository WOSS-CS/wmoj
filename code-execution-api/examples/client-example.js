// Example usage of the Custom Judge API from Node.js/JavaScript

const API_URL = 'http://localhost:3002';
const API_KEY = 'your-api-key-here'; // Replace with actual API key

class CustomJudgeClient {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async makeRequest(endpoint, data) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  async executeCode(language, code, input = '') {
    return this.makeRequest('/execute', {
      language,
      code,
      input
    });
  }

  async testCode(language, code, input, expectedOutput) {
    return this.makeRequest('/test', {
      language,
      code,
      input,
      expectedOutput
    });
  }

  async judgeSubmission(language, code, testCases) {
    return this.makeRequest('/judge', {
      language,
      code,
      testCases
    });
  }

  async getHealth() {
    const response = await fetch(`${this.apiUrl}/health`);
    return response.json();
  }

  async getLanguages() {
    const response = await fetch(`${this.apiUrl}/languages`);
    return response.json();
  }
}

// Example usage
async function runExamples() {
  const client = new CustomJudgeClient(API_URL, API_KEY);

  try {
    console.log('🧪 Testing Custom Judge API from JavaScript...');

    // Test health
    console.log('\n📊 Health check:');
    const health = await client.getHealth();
    console.log(JSON.stringify(health, null, 2));

    // Get languages
    console.log('\n📚 Supported languages:');
    const languages = await client.getLanguages();
    console.log(JSON.stringify(languages, null, 2));

    // Execute Python code
    console.log('\n🐍 Executing Python code:');
    const pythonResult = await client.executeCode(
      'python',
      'print("Hello from Python!")'
    );
    console.log(JSON.stringify(pythonResult, null, 2));

    // Test with expected output
    console.log('\n🧪 Testing with expected output:');
    const testResult = await client.testCode(
      'python',
      'n = int(input())\nprint(n * 2)',
      '5',
      '10'
    );
    console.log(JSON.stringify(testResult, null, 2));

    // Judge submission with multiple test cases
    console.log('\n⚖️ Judging submission:');
    const judgeResult = await client.judgeSubmission(
      'python',
      'a, b = map(int, input().split())\nprint(a + b)',
      [
        { input: '1 2', expectedOutput: '3', points: 10 },
        { input: '5 7', expectedOutput: '12', points: 10 },
        { input: '-1 1', expectedOutput: '0', points: 10 }
      ]
    );
    console.log(JSON.stringify(judgeResult, null, 2));

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run examples if this script is executed directly
if (require.main === module) {
  runExamples();
}

module.exports = { CustomJudgeClient };
