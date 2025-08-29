// Judge0 language mappings
export const JUDGE0_LANGUAGES = {
  python: 71,      // Python 3.8.1
  javascript: 63,  // JavaScript (Node.js 12.14.0)
  java: 62,        // Java (OpenJDK 13.0.1)
  cpp: 54,         // C++ (GCC 9.2.0)
  c: 50,           // C (GCC 9.2.0)
  go: 60,          // Go (1.13.5)
  rust: 73,        // Rust (1.40.0)
  kotlin: 78,      // Kotlin (1.3.70)
  swift: 83,       // Swift (5.2.3)
  csharp: 51,      // C# (Mono 6.6.0.161)
  php: 68,         // PHP (7.4.1)
  ruby: 72,        // Ruby (2.7.0)
  typescript: 74,  // TypeScript (3.7.4)
  scala: 81,       // Scala (2.13.2)
  dart: 90,        // Dart (2.19.2)
}

export interface Judge0Submission {
  source_code: string
  language_id: number
  stdin?: string
  expected_output?: string
  cpu_time_limit?: number
  memory_limit?: number
}

export interface Judge0Result {
  token: string
  status: {
    id: number
    description: string
  }
  stdout?: string
  stderr?: string
  compile_output?: string
  time?: string
  memory?: number
  exit_code?: number
}

class Judge0Service {
  private endpoints: string[]
  private apiKey?: string
  private currentEndpointIndex = 0

  constructor() {
    // Multiple Judge0 endpoints for failover
    this.endpoints = [
      process.env.JUDGE0_API_URL || 'https://api.judge0.com',
      'https://judge0-ce.p.rapidapi.com',
      'https://api.judge0.com',
      'https://ce.judge0.com',
    ]
    this.apiKey = process.env.JUDGE0_API_KEY
  }

  private getHeaders(endpoint: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add RapidAPI headers if using RapidAPI endpoint and have API key
    if (endpoint.includes('rapidapi') && this.apiKey) {
      headers['X-RapidAPI-Key'] = this.apiKey
      headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com'
    }

    return headers
  }

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async tryEndpoint<T>(
    operation: (endpoint: string, headers: Record<string, string>) => Promise<T>
  ): Promise<T> {
    let lastError: Error = new Error('All endpoints failed')

    for (let i = 0; i < this.endpoints.length; i++) {
      const endpoint = this.endpoints[(this.currentEndpointIndex + i) % this.endpoints.length]
      const headers = this.getHeaders(endpoint)

      try {
        console.log(`Trying Judge0 endpoint: ${endpoint}`)
        const result = await operation(endpoint, headers)
        
        // Update current endpoint index to the working one
        this.currentEndpointIndex = (this.currentEndpointIndex + i) % this.endpoints.length
        console.log(`Judge0 request successful with endpoint: ${endpoint}`)
        
        return result
      } catch (error) {
        console.warn(`Judge0 endpoint failed: ${endpoint}`, error)
        lastError = error as Error
        
        // Wait a bit before trying next endpoint
        if (i < this.endpoints.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    throw lastError
  }

  async submitCode(submission: Judge0Submission): Promise<string> {
    return await this.tryEndpoint(async (endpoint, headers) => {
      const url = `${endpoint}/submissions?base64_encoded=false&wait=false`
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(submission),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Judge0 submission failed (${response.status}): ${errorText}`)
      }

      const result = await response.json()
      if (!result.token) {
        throw new Error('Judge0 submission failed: No token received')
      }

      return result.token
    })
  }

  async getResult(token: string): Promise<Judge0Result> {
    return await this.tryEndpoint(async (endpoint, headers) => {
      const url = `${endpoint}/submissions/${token}?base64_encoded=false`
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Judge0 result fetch failed (${response.status}): ${errorText}`)
      }

      const result = await response.json()
      return result
    })
  }

  async executeCode(
    code: string,
    language: string,
    input?: string,
    timeLimit: number = 5,
    memoryLimit: number = 128000
  ): Promise<{
    success: boolean
    output: string
    error: string | null
    runtime: number
    memory: number
    status: string
    details: any
  }> {
    const languageId = JUDGE0_LANGUAGES[language as keyof typeof JUDGE0_LANGUAGES]
    
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}. Supported: ${Object.keys(JUDGE0_LANGUAGES).join(', ')}`)
    }

    const submission: Judge0Submission = {
      source_code: code,
      language_id: languageId,
      stdin: input || '',
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit,
    }

    console.log(`Executing code with Judge0:`, {
      language,
      languageId,
      codeLength: code.length,
      hasInput: !!input,
      timeLimit,
      memoryLimit
    })

    try {
      // Submit code for execution
      const token = await this.submitCode(submission)
      console.log(`Judge0 submission token: ${token}`)

      // Poll for result with exponential backoff
      let result: Judge0Result
      let attempts = 0
      const maxAttempts = 30
      let delay = 500 // Start with 500ms

      do {
        await new Promise(resolve => setTimeout(resolve, delay))
        result = await this.getResult(token)
        attempts++
        
        console.log(`Judge0 polling attempt ${attempts}/${maxAttempts}, status: ${result.status.description} (${result.status.id})`)
        
        // Exponential backoff, but cap at 2 seconds
        delay = Math.min(delay * 1.2, 2000)
      } while (result.status.id <= 2 && attempts < maxAttempts) // Status 1=In Queue, 2=Processing

      if (attempts >= maxAttempts) {
        throw new Error('Judge0 execution timeout - submission took too long to process')
      }

      // Map Judge0 status to our format
      let success = false
      let error: string | null = null
      let output = result.stdout || ''

      switch (result.status.id) {
        case 3: // Accepted
          success = true
          break
        case 4: // Wrong Answer
          success = false
          error = 'Wrong Answer'
          break
        case 5: // Time Limit Exceeded
          success = false
          error = 'Time Limit Exceeded'
          break
        case 6: // Compilation Error
          success = false
          error = 'Compilation Error'
          output = result.compile_output || 'Compilation failed'
          break
        case 7: // Runtime Error (SIGSEGV)
        case 8: // Runtime Error (SIGXFSZ)
        case 9: // Runtime Error (SIGFPE)
        case 10: // Runtime Error (SIGABRT)
        case 11: // Runtime Error (NZEC)
        case 12: // Runtime Error (Other)
          success = false
          error = `Runtime Error (${result.status.description})`
          output = result.stderr || 'Program crashed'
          break
        case 13: // Internal Error
          success = false
          error = 'Internal Error'
          break
        case 14: // Exec Format Error
          success = false
          error = 'Execution Format Error'
          break
        default:
          success = result.status.id === 3
          error = success ? null : result.status.description
      }

      const executionResult = {
        success,
        output: output?.trim() || '',
        error,
        runtime: result.time ? parseFloat(result.time) * 1000 : 0, // Convert to milliseconds
        memory: result.memory || 0,
        status: result.status.description,
        details: {
          statusId: result.status.id,
          token,
          stderr: result.stderr,
          exitCode: result.exit_code,
          compileOutput: result.compile_output,
        }
      }

      console.log('Judge0 execution result:', executionResult)
      return executionResult

    } catch (error) {
      console.error('Judge0 execution error:', error)
      throw error
    }
  }

  async executeTestCase(
    code: string,
    language: string,
    testCase: { input: string; expected: string },
    timeLimit?: number,
    memoryLimit?: number
  ): Promise<{
    passed: boolean
    runtime: number
    memory: number
    output: string
    error: string | null
    details: any
  }> {
    const result = await this.executeCode(code, language, testCase.input, timeLimit, memoryLimit)

    const actualOutput = result.output.trim()
    const expectedOutput = testCase.expected.trim()
    const passed = result.success && actualOutput === expectedOutput

    console.log('Test case execution:', {
      passed,
      actualOutput: actualOutput.substring(0, 100),
      expectedOutput: expectedOutput.substring(0, 100),
      outputMatch: actualOutput === expectedOutput,
    })

    return {
      passed,
      runtime: result.runtime,
      memory: result.memory,
      output: result.output,
      error: result.error,
      details: {
        ...result.details,
        expectedOutput,
        actualOutput,
        outputMatch: actualOutput === expectedOutput,
      }
    }
  }

  // Test Judge0 connectivity
  async testConnection(): Promise<{
    connected: boolean
    endpoint: string
    error?: string
  }> {
    try {
      const testCode = 'print("Hello, World!")'
      const result = await this.executeCode(testCode, 'python', '', 2, 64000)
      
      return {
        connected: result.success && result.output.trim() === 'Hello, World!',
        endpoint: this.endpoints[this.currentEndpointIndex],
        error: result.error || undefined
      }
    } catch (error) {
      return {
        connected: false,
        endpoint: 'none',
        error: (error as Error).message
      }
    }
  }
}

export const judge0Service = new Judge0Service()
