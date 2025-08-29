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
  private baseUrl: string
  private apiKey?: string

  constructor() {
    // Use environment variables for configuration
    this.baseUrl = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com'
    this.apiKey = process.env.JUDGE0_API_KEY
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['X-RapidAPI-Key'] = this.apiKey
      headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com'
    }

    return headers
  }

  async submitCode(submission: Judge0Submission): Promise<string> {
    const response = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(submission),
    })

    if (!response.ok) {
      throw new Error(`Judge0 submission failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.token
  }

  async getResult(token: string): Promise<Judge0Result> {
    const response = await fetch(`${this.baseUrl}/submissions/${token}?base64_encoded=false`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Judge0 result fetch failed: ${response.statusText}`)
    }

    return await response.json()
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
  }> {
    const languageId = JUDGE0_LANGUAGES[language as keyof typeof JUDGE0_LANGUAGES]
    
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`)
    }

    const submission: Judge0Submission = {
      source_code: code,
      language_id: languageId,
      stdin: input,
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit,
    }

    try {
      // Submit code for execution
      const token = await this.submitCode(submission)

      // Poll for result
      let result: Judge0Result
      let attempts = 0
      const maxAttempts = 20

      do {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        result = await this.getResult(token)
        attempts++
      } while (result.status.id <= 2 && attempts < maxAttempts) // Status 1=In Queue, 2=Processing

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
          error = 'Runtime Error'
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
          success = false
          error = result.status.description
      }

      return {
        success,
        output,
        error,
        runtime: result.time ? parseFloat(result.time) * 1000 : 0, // Convert to milliseconds
        memory: result.memory || 0,
        status: result.status.description,
      }
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
  }> {
    const result = await this.executeCode(code, language, testCase.input, timeLimit, memoryLimit)

    const passed = result.success && result.output.trim() === testCase.expected.trim()

    return {
      passed,
      runtime: result.runtime,
      memory: result.memory,
      output: result.output,
      error: result.error,
    }
  }
}

export const judge0Service = new Judge0Service()
