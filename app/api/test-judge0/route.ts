import { NextRequest, NextResponse } from "next/server"
import { judge0Service } from "@/lib/judge/judge0"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { language = 'python', testType = 'basic' } = body

    let testCode = ''
    let testInput = ''

    switch (testType) {
      case 'basic':
        testCode = 'print("Hello, World!")'
        break
      case 'input':
        testCode = language === 'python' 
          ? 'name = input()\nprint(f"Hello, {name}!")'
          : 'const readline = require("readline");\nconst rl = readline.createInterface({input: process.stdin});\nrl.on("line", (name) => {\n  console.log(`Hello, ${name}!`);\n  rl.close();\n});'
        testInput = 'World'
        break
      case 'math':
        testCode = language === 'python'
          ? 'a, b = map(int, input().split())\nprint(a + b)'
          : 'const [a, b] = require("fs").readFileSync(0, "utf8").trim().split(" ").map(Number);\nconsole.log(a + b);'
        testInput = '5 3'
        break
      case 'complex':
        testCode = language === 'python'
          ? `
import math
import time

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def is_prime(num):
    if num < 2:
        return False
    for i in range(2, int(math.sqrt(num)) + 1):
        if num % i == 0:
            return False
    return True

n = int(input())
print(f"Fibonacci({n}) = {fibonacci(n)}")
print(f"Is {n} prime? {is_prime(n)}")

# Test list processing
numbers = list(range(1, n+1))
squares = [x*x for x in numbers]
print(f"Squares: {squares}")
`
          : `
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

function isPrime(num) {
    if (num < 2) return false;
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) return false;
    }
    return true;
}

const n = parseInt(require('fs').readFileSync(0, 'utf8').trim());
console.log(\`Fibonacci(\${n}) = \${fibonacci(n)}\`);
console.log(\`Is \${n} prime? \${isPrime(n)}\`);

const numbers = Array.from({length: n}, (_, i) => i + 1);
const squares = numbers.map(x => x * x);
console.log(\`Squares: \${squares}\`);
`
        testInput = '10'
        break
      case 'error':
        testCode = language === 'python'
          ? 'print(undefined_variable)'
          : 'console.log(undefinedVariable);'
        break
      default:
        testCode = 'print("Hello, World!")'
    }

    console.log(`\n🧪 Testing Judge0 with ${language} (${testType} test)`)
    console.log('Code:', testCode.substring(0, 100) + (testCode.length > 100 ? '...' : ''))
    console.log('Input:', testInput || '(none)')

    const startTime = Date.now()
    const result = await judge0Service.executeCode(
      testCode,
      language,
      testInput,
      testType === 'complex' ? 10 : 5, // longer timeout for complex test
      128000
    )
    const executionTime = Date.now() - startTime

    console.log('\n📊 Detailed Execution Results:')
    console.log('─'.repeat(50))
    console.log('✅ Success:', result.success)
    console.log('📤 Output:', result.output?.substring(0, 200) + (result.output?.length > 200 ? '...' : ''))
    console.log('⚠️  Error:', result.error || 'None')
    console.log('⏱️  Runtime:', `${result.runtime}ms`)
    console.log('💾 Memory:', `${result.memory}KB`)
    console.log('📈 Status:', result.status)
    console.log('🌐 Total Time:', `${executionTime}ms`)
    console.log('🔧 Details:', JSON.stringify(result.details, null, 2))

    return NextResponse.json({
      success: true,
      testType,
      language,
      executionData: {
        ...result,
        totalExecutionTime: executionTime,
        testMetadata: {
          codeLength: testCode.length,
          hasInput: !!testInput,
          inputLength: testInput?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Judge0 test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
