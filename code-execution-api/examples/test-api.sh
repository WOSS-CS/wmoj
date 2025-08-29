#!/bin/bash

# Test the Custom Judge API with various examples

API_URL="http://localhost:3002"
API_KEY="your-api-key-here"  # Replace with actual API key

echo "🧪 Testing Custom Judge API..."

# Test health endpoint
echo "📊 Testing health endpoint..."
curl -s "$API_URL/health" | jq '.'

echo -e "\n📚 Getting supported languages..."
curl -s "$API_URL/languages" | jq '.'

# Test Python execution
echo -e "\n🐍 Testing Python execution..."
curl -s -X POST "$API_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "language": "python",
    "code": "print(\"Hello, World!\")",
    "input": ""
  }' | jq '.'

# Test Python with input
echo -e "\n🐍 Testing Python with input..."
curl -s -X POST "$API_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "language": "python",
    "code": "name = input()\nprint(f\"Hello, {name}!\")",
    "input": "World"
  }' | jq '.'

# Test JavaScript
echo -e "\n🟨 Testing JavaScript..."
curl -s -X POST "$API_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "language": "javascript",
    "code": "console.log(\"Hello from Node.js!\")"
  }' | jq '.'

# Test C++ compilation and execution
echo -e "\n⚡ Testing C++ compilation and execution..."
curl -s -X POST "$API_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "language": "cpp",
    "code": "#include <iostream>\nusing namespace std;\nint main() {\n    cout << \"Hello from C++!\" << endl;\n    return 0;\n}"
  }' | jq '.'

# Test Java compilation and execution
echo -e "\n☕ Testing Java compilation and execution..."
curl -s -X POST "$API_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "language": "java",
    "code": "public class Solution {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from Java!\");\n    }\n}"
  }' | jq '.'

# Test single test case
echo -e "\n🧪 Testing single test case..."
curl -s -X POST "$API_URL/test" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "language": "python",
    "code": "n = int(input())\nprint(n * 2)",
    "input": "5",
    "expectedOutput": "10"
  }' | jq '.'

# Test judging with multiple test cases
echo -e "\n⚖️ Testing judging with multiple test cases..."
curl -s -X POST "$API_URL/judge" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "language": "python",
    "code": "a, b = map(int, input().split())\nprint(a + b)",
    "testCases": [
      {
        "input": "1 2",
        "expectedOutput": "3",
        "points": 10
      },
      {
        "input": "5 7",
        "expectedOutput": "12",
        "points": 10
      },
      {
        "input": "-1 1",
        "expectedOutput": "0",
        "points": 10
      }
    ]
  }' | jq '.'

# Test compilation error
echo -e "\n❌ Testing compilation error..."
curl -s -X POST "$API_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "language": "cpp",
    "code": "#include <iostream>\nint main() {\n    cout << \"Missing namespace!\" << endl;\n    return 0;\n}"
  }' | jq '.'

# Test runtime error
echo -e "\n💥 Testing runtime error..."
curl -s -X POST "$API_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "language": "python",
    "code": "x = 1 / 0\nprint(x)"
  }' | jq '.'

echo -e "\n✅ API testing complete!"
