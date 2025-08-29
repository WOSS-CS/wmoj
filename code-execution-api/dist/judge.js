"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.judgeService = exports.JudgeService = void 0;
const executor_1 = require("./executor");
const types_1 = require("./types");
class JudgeService {
    async judgeSubmission(request) {
        const results = [];
        let totalRuntime = 0;
        let maxMemory = 0;
        let testCasesPassed = 0;
        let totalScore = 0;
        let maxScore = 0;
        maxScore = request.testCases.reduce((sum, testCase) => sum + (testCase.points || 1), 0);
        for (let i = 0; i < request.testCases.length; i++) {
            const testCase = request.testCases[i];
            try {
                const executionResult = await executor_1.codeExecutor.executeCode({
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
                const testResult = {
                    ...executionResult,
                    passed,
                    expectedOutput,
                    actualOutput,
                    points,
                    status: passed ? types_1.ExecutionStatus.SUCCESS :
                        executionResult.success ? types_1.ExecutionStatus.WRONG_ANSWER :
                            executionResult.status
                };
                results.push(testResult);
                if (!executionResult.success && executionResult.status !== types_1.ExecutionStatus.WRONG_ANSWER) {
                    break;
                }
            }
            catch (error) {
                const testResult = {
                    success: false,
                    output: '',
                    error: `Test case execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    runtime: 0,
                    memory: 0,
                    status: types_1.ExecutionStatus.INTERNAL_ERROR,
                    passed: false,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: '',
                    points: 0
                };
                results.push(testResult);
                break;
            }
        }
        let overallStatus;
        if (testCasesPassed === request.testCases.length) {
            overallStatus = types_1.ExecutionStatus.SUCCESS;
        }
        else {
            const failedResult = results.find(r => !r.passed);
            overallStatus = failedResult?.status || types_1.ExecutionStatus.WRONG_ANSWER;
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
            error: overallStatus !== types_1.ExecutionStatus.SUCCESS ?
                this.getErrorMessage(overallStatus, testCasesPassed, request.testCases.length) :
                undefined
        };
    }
    async runSingleTest(language, code, input, expectedOutput, timeLimit, memoryLimit) {
        try {
            const executionResult = await executor_1.codeExecutor.executeCode({
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
                status: passed ? types_1.ExecutionStatus.SUCCESS :
                    executionResult.success ? types_1.ExecutionStatus.WRONG_ANSWER :
                        executionResult.status
            };
        }
        catch (error) {
            return {
                success: false,
                output: '',
                error: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                runtime: 0,
                memory: 0,
                status: types_1.ExecutionStatus.INTERNAL_ERROR,
                passed: false,
                expectedOutput,
                actualOutput: '',
                points: 0
            };
        }
    }
    getErrorMessage(status, passed, total) {
        switch (status) {
            case types_1.ExecutionStatus.COMPILATION_ERROR:
                return 'Your code failed to compile. Please check for syntax errors.';
            case types_1.ExecutionStatus.RUNTIME_ERROR:
                return 'Your code encountered a runtime error during execution.';
            case types_1.ExecutionStatus.TIME_LIMIT_EXCEEDED:
                return 'Your code exceeded the time limit. Consider optimizing your algorithm.';
            case types_1.ExecutionStatus.MEMORY_LIMIT_EXCEEDED:
                return 'Your code exceeded the memory limit. Consider using less memory.';
            case types_1.ExecutionStatus.WRONG_ANSWER:
                return `Wrong answer. Passed ${passed} out of ${total} test cases.`;
            case types_1.ExecutionStatus.INTERNAL_ERROR:
                return 'An internal error occurred while judging your submission.';
            default:
                return 'Submission failed for unknown reason.';
        }
    }
}
exports.JudgeService = JudgeService;
exports.judgeService = new JudgeService();
//# sourceMappingURL=judge.js.map