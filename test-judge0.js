// Test script to verify Judge0 API with RapidAPI key
const testJudge0 = async () => {
  try {
    console.log('Testing Judge0 API...')
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3001/api/health')
    const healthData = await healthResponse.json()
    console.log('Health Check:', healthData)
    
    // Test code execution
    const codeResponse = await fetch('http://localhost:3001/api/code/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token' // This will be handled by middleware
      },
      body: JSON.stringify({
        language: 'python',
        code: 'print("Hello from Python!")',
        input: ''
      })
    })
    
    const codeData = await codeResponse.json()
    console.log('Code Execution:', codeData)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// If running in Node.js
if (typeof window === 'undefined') {
  const fetch = require('node-fetch')
  testJudge0()
}

// If running in browser
if (typeof window !== 'undefined') {
  window.testJudge0 = testJudge0
  console.log('Run window.testJudge0() to test')
}
