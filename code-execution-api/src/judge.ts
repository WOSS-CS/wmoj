import { codeExecutor } from './executor';
import { 
  TestCaseRequest, 
  TestCaseResult, 
  JudgeResult, 
  ExecutionStatus, 
  TestCase 
} from './types';

export class JudgeService {
  
  async judgeSubmission(request: TestCaseRequest): Promise<JudgeResult> {
    const results: TestCaseResult[] = [];
    let totalRuntime = 0;
    let maxMemory = 0;
    let testCasesPassed = 0;
    let totalScore = 0;
    let maxScore = 0;

    // Calculate maximum possible score
    maxScore = request.testCases.reduce((sum, testCase) => sum + (testCase.points || 1), 0);

    for (let i = 0; i < request.testCases.length; i++) {
      const testCase = request.testCases[i];
      
      try {
        // Execute code with test case input
        const executionResult = await codeExecutor.executeCode({
          language: request.language,
          code: request.code,
          input: testCase.input,
          timeLimit: request.timeLimit,
          memoryLimit: request.memoryLimit
        });

        const actualOutput = executionResult.output.trim();
        const expectedOutput = testCase.expectedOutput.trim();
        const passed = executionResult.success && actualOutput === expectedOutput;
        const points = passed ? (testCase.points || 1) : 0;

        if (passed) {
          testCasesPassed++;
          totalScore += points;
        }

        totalRuntime += executionResult.runtime;
        maxMemory = Math.max(maxMemory, executionResult.memory);

        const testResult: TestCaseResult = {
          ...executionResult,
          passed,
          expectedOutput,
          actualOutput,
          points,
          status: passed ? ExecutionStatus.SUCCESS : 
                  executionResult.success ? ExecutionStatus.WRONG_ANSWER : 
                  executionResult.status
        };

        results.push(testResult);

        // Stop on first critical error (not wrong answer)
        if (!executionResult.success && executionResult.status !== ExecutionStatus.WRONG_ANSWER) {
          break;
        }

      } catch (error) {
        const testResult: TestCaseResult = {
          success: false,
          output: '',
          error: `Test case execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          runtime: 0,
          memory: 0,
          status: ExecutionStatus.INTERNAL_ERROR,
          passed: false,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          points: 0
        };

        results.push(testResult);
        break;
      }
    }

    // Determine overall result status
    let overallStatus: ExecutionStatus;
    if (testCasesPassed === request.testCases.length) {
      overallStatus = ExecutionStatus.SUCCESS;
    } else {
      // Find the first failed test case to determine status
      const failedResult = results.find(r => !r.passed);
      overallStatus = failedResult?.status || ExecutionStatus.WRONG_ANSWER;
    }

    return {
      success: testCasesPassed === request.testCases.length,
      status: overallStatus,
      totalScore,
      maxScore,
      testCasesPassed,
      totalTestCases: request.testCases.length,
      averageRuntime: results.length > 0 ? totalRuntime / results.length : 0,
      maxMemory,
      testCaseResults: results,
      error: overallStatus !== ExecutionStatus.SUCCESS ? 
        this.getErrorMessage(overallStatus, testCasesPassed, request.testCases.length) : 
        undefined
    };
  }

  async runSingleTest(
    language: string,
    code: string,
    input: string,
    expectedOutput: string,
    timeLimit?: number,
    memoryLimit?: number
  ): Promise<TestCaseResult> {
    try {
      const executionResult = await codeExecutor.executeCode({
        language,
        code,
        input,
        timeLimit,
        memoryLimit
      });

      const actualOutput = executionResult.output.trim();
      const expected = expectedOutput.trim();
      const passed = executionResult.success && actualOutput === expected;

      return {
        ...executionResult,
        passed,
        expectedOutput: expected,
        actualOutput,
        points: passed ? 1 : 0,
        status: passed ? ExecutionStatus.SUCCESS : 
                executionResult.success ? ExecutionStatus.WRONG_ANSWER : 
                executionResult.status
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        runtime: 0,
        memory: 0,
        status: ExecutionStatus.INTERNAL_ERROR,
        passed: false,
        expectedOutput,
        actualOutput: '',
        points: 0
      };
    }
  }

  private getErrorMessage(status: ExecutionStatus, passed: number, total: number): string {
    switch (status) {
      case ExecutionStatus.COMPILATION_ERROR:
        return 'Your code failed to compile. Please check for syntax errors.';
      case ExecutionStatus.RUNTIME_ERROR:
        return 'Your code encountered a runtime error during execution.';
      case ExecutionStatus.TIME_LIMIT_EXCEEDED:
        return 'Your code exceeded the time limit. Consider optimizing your algorithm.';
      case ExecutionStatus.MEMORY_LIMIT_EXCEEDED:
        return 'Your code exceeded the memory limit. Consider using less memory.';
      case ExecutionStatus.WRONG_ANSWER:
        return `Wrong answer. Passed ${passed} out of ${total} test cases.`;
      case ExecutionStatus.INTERNAL_ERROR:
        return 'An internal error occurred while judging your submission.';
      default:
        return 'Submission failed for unknown reason.';
    }
  }
}

export const judgeService = new JudgeService();
