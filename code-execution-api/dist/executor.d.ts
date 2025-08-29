import { ExecutionRequest, ExecutionResult } from './types';
export declare class CodeExecutor {
    private maxExecutionTime;
    private maxMemoryLimit;
    constructor();
    executeCode(request: ExecutionRequest): Promise<ExecutionResult>;
    private compile;
    private execute;
    private createErrorResult;
}
export declare const codeExecutor: CodeExecutor;
//# sourceMappingURL=executor.d.ts.map