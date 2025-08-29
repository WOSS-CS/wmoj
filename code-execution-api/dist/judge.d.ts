import { TestCaseRequest, TestCaseResult, JudgeResult } from './types';
export declare class JudgeService {
    judgeSubmission(request: TestCaseRequest): Promise<JudgeResult>;
    runSingleTest(language: string, code: string, input: string, expectedOutput: string, timeLimit?: number, memoryLimit?: number): Promise<TestCaseResult>;
    private getErrorMessage;
}
export declare const judgeService: JudgeService;
//# sourceMappingURL=judge.d.ts.map