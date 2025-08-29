// Custom Judge API Service - the sole code execution backend for WMOJ
import { ExecutionResult, TestCaseResult, JudgeResult, ExecutionStatus } from "./types"

export interface CustomJudgeConfig {
  apiUrl: string
  apiKey?: string
  timeout?: number
}

export interface CustomJudgeTestCase {
  input: string
  expected: string
  points?: number
}

class CustomJudgeService {
  private config: CustomJudgeConfig
  private defaultTimeout = 30000 // 30 seconds

  constructor() {
    this.config = {
      apiUrl: process.env.CUSTOM_JUDGE_API_URL || 'http://localhost:3002',
      apiKey: process.env.CUSTOM_JUDGE_API_KEY,
      timeout: parseInt(process.env.CUSTOM_JUDGE_TIMEOUT || '30000')
    }
  }

  private async makeRequest(endpoint: string, data: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || this.defaultTimeout)

    try {
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Custom Judge API error (${response.status}): ${errorData.error || response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(`Custom Judge API error: ${result.error || 'Unknown error'}`)
      }

      return result.data
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  async executeCode(
    code: string,
    language: string,
    input?: string,
    timeLimit: number = 5000,
    memoryLimit: number = 128
  ): Promise<{
    success: boolean
    output: string
    error: string | null
    runtime: number
    memory: number
    status: string
    details: any
  }> {
    console.log(`Executing ${language} code with custom judge API`)

    try {
      const result = await this.makeRequest('/execute', {
        language: language.toLowerCase(),
        code,
        input: input || '',
        timeLimit,
        memoryLimit
      })

      return {
        success: result.status === 'SUCCESS',
        output: result.output || '',
        error: result.error,
        runtime: result.runtime || 0,
        memory: result.memory || 0,
        status: result.status || 'UNKNOWN',
        details: {
          customJudge: true,
          originalStatus: result.status
        }
      }
    } catch (error) {
      console.error('Custom judge execution error:', error)
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
    console.log(`Testing ${language} code with custom judge API`)

    try {
      const result = await this.makeRequest('/test', {
        language: language.toLowerCase(),
        code,
        input: testCase.input,
        expectedOutput: testCase.expected,
        timeLimit,
        memoryLimit
      })

      return {
        passed: result.passed || false,
        runtime: result.runtime || 0,
        memory: result.memory || 0,
        output: result.output || '',
        error: result.error,
        details: {
          customJudge: true,
          expectedOutput: result.expectedOutput,
          actualOutput: result.actualOutput,
          status: result.status
        }
      }
    } catch (error) {
      console.error('Custom judge test case error:', error)
      throw error
    }
  }

  async judgeSubmission(
    code: string,
    language: string,
    testCases: CustomJudgeTestCase[],
    timeLimit?: number,
    memoryLimit?: number
  ): Promise<{
    success: boolean
    status: string
    totalScore: number
    maxScore: number
    testCasesPassed: number
    totalTestCases: number
    averageRuntime: number
    maxMemory: number
    testCaseResults: any[]
    error?: string
  }> {
    console.log(`Judging ${language} submission with ${testCases.length} test cases using custom judge API`)

    try {
      const formattedTestCases = testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.expected,
        points: tc.points || 1
      }))

      const result = await this.makeRequest('/judge', {
        language: language.toLowerCase(),
        code,
        testCases: formattedTestCases,
        timeLimit,
        memoryLimit
      })

      return {
        success: result.success || false,
        status: result.status || 'UNKNOWN',
        totalScore: result.totalScore || 0,
        maxScore: result.maxScore || 0,
        testCasesPassed: result.testCasesPassed || 0,
        totalTestCases: result.totalTestCases || 0,
        averageRuntime: result.averageRuntime || 0,
        maxMemory: result.maxMemory || 0,
        testCaseResults: result.testCaseResults || [],
        error: result.error
      }
    } catch (error) {
      console.error('Custom judge submission error:', error)
      throw error
    }
  }

  // Test API connectivity
  async testConnection(): Promise<{
    connected: boolean
    endpoint: string
    error?: string
    supportedLanguages?: string[]
  }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {},
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return {
          connected: true,
          endpoint: this.config.apiUrl,
          supportedLanguages: result.data.supportedLanguages
        }
      } else {
        throw new Error('Health check returned unsuccessful status')
      }
    } catch (error) {
      return {
        connected: false,
        endpoint: this.config.apiUrl,
        error: (error as Error).message
      }
    }
  }

  // Get supported languages
  async getSupportedLanguages(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/languages`, {
        method: 'GET',
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {},
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`Failed to get languages: ${response.status}`)
      }

      const result = await response.json()
      return result.success ? result.data : []
    } catch (error) {
      console.error('Failed to get supported languages:', error)
      return []
    }
  }
}

export const customJudgeService = new CustomJudgeService()
