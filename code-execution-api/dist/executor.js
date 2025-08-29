"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeExecutor = exports.CodeExecutor = void 0;
const child_process_1 = require("child_process");
const fileManager_1 = require("./fileManager");
const languages_1 = require("./languages");
const types_1 = require("./types");
class CodeExecutor {
    constructor() {
        this.maxExecutionTime = parseInt(process.env.MAX_EXECUTION_TIME || '10000');
        this.maxMemoryLimit = parseInt(process.env.MAX_MEMORY_LIMIT || '256');
    }
    async executeCode(request) {
        const startTime = Date.now();
        let tempFiles = [];
        let tempDir = null;
        try {
            const languageConfig = (0, languages_1.getLanguageConfig)(request.language);
            if (!languageConfig) {
                return this.createErrorResult('Unsupported language', types_1.ExecutionStatus.INTERNAL_ERROR);
            }
            const timeLimit = Math.min(request.timeLimit || languageConfig.defaultTimeLimit, this.maxExecutionTime);
            const memoryLimit = Math.min(request.memoryLimit || languageConfig.defaultMemoryLimit, this.maxMemoryLimit);
            tempDir = fileManager_1.fileManager.createTempDir();
            const sourceFileName = request.language === 'java' ? 'Solution.java' : `solution.${languageConfig.extension}`;
            const sourceFilePath = fileManager_1.fileManager.joinPath(tempDir, sourceFileName);
            fileManager_1.fileManager.writeFile(sourceFilePath, request.code);
            tempFiles.push(sourceFilePath);
            if (languageConfig.compileCommand) {
                const compileResult = await this.compile(languageConfig, sourceFilePath, tempDir);
                if (!compileResult.success) {
                    return compileResult;
                }
                if (compileResult.compiledFile) {
                    tempFiles.push(compileResult.compiledFile);
                }
            }
            const executionResult = await this.execute(languageConfig, sourceFilePath, tempDir, request.input || '', timeLimit, memoryLimit);
            const runtime = Date.now() - startTime;
            return {
                ...executionResult,
                runtime: Math.min(executionResult.runtime, runtime)
            };
        }
        catch (error) {
            return this.createErrorResult(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`, types_1.ExecutionStatus.INTERNAL_ERROR);
        }
        finally {
            tempFiles.forEach(file => fileManager_1.fileManager.deleteFile(file));
            if (tempDir) {
                fileManager_1.fileManager.deleteDirectory(tempDir);
            }
        }
    }
    async compile(languageConfig, sourceFilePath, workDir) {
        return new Promise((resolve) => {
            const sourceFileName = fileManager_1.fileManager.getFileName(sourceFilePath);
            const executableName = fileManager_1.fileManager.getFileNameWithoutExtension(sourceFilePath);
            const executablePath = fileManager_1.fileManager.joinPath(workDir, executableName);
            let compileCommand;
            if (languageConfig.id === 'java') {
                compileCommand = [...languageConfig.compileCommand, sourceFileName];
            }
            else if (languageConfig.id === 'cpp' || languageConfig.id === 'c') {
                compileCommand = [...languageConfig.compileCommand, executableName, sourceFileName];
            }
            else if (languageConfig.id === 'rust') {
                compileCommand = [...languageConfig.compileCommand, executableName, sourceFileName];
            }
            else {
                compileCommand = [...languageConfig.compileCommand, sourceFileName];
            }
            const process = (0, child_process_1.spawn)(compileCommand[0], compileCommand.slice(1), {
                cwd: workDir,
                timeout: 10000
            });
            let stderr = '';
            let stdout = '';
            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            process.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        compiledFile: languageConfig.id === 'java' ? undefined : executablePath
                    });
                }
                else {
                    resolve({
                        success: false,
                        error: stderr || stdout || 'Compilation failed',
                        status: types_1.ExecutionStatus.COMPILATION_ERROR
                    });
                }
            });
            process.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Compilation error: ${error.message}`,
                    status: types_1.ExecutionStatus.COMPILATION_ERROR
                });
            });
        });
    }
    async execute(languageConfig, sourceFilePath, workDir, input, timeLimit, memoryLimit) {
        return new Promise((resolve) => {
            const startTime = process.hrtime.bigint();
            let runCommand;
            if (languageConfig.id === 'java') {
                runCommand = [languageConfig.runCommand[0], 'Solution'];
            }
            else if (languageConfig.id === 'cpp' || languageConfig.id === 'c' || languageConfig.id === 'rust') {
                const executableName = fileManager_1.fileManager.getFileNameWithoutExtension(sourceFilePath);
                runCommand = [`${languageConfig.runCommand[0]}${executableName}`];
            }
            else if (languageConfig.id === 'go') {
                runCommand = [...languageConfig.runCommand, fileManager_1.fileManager.getFileName(sourceFilePath)];
            }
            else {
                runCommand = [...languageConfig.runCommand, fileManager_1.fileManager.getFileName(sourceFilePath)];
            }
            const process = (0, child_process_1.spawn)(runCommand[0], runCommand.slice(1), {
                cwd: workDir,
                timeout: timeLimit,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let stdout = '';
            let stderr = '';
            let killed = false;
            let memoryUsage = 0;
            const memoryInterval = setInterval(() => {
                try {
                    if (process.pid) {
                        const usage = process.memoryUsage?.() || { rss: 0 };
                        memoryUsage = Math.max(memoryUsage, usage.rss / 1024);
                        if (memoryUsage > memoryLimit * 1024) {
                            killed = true;
                            process.kill('SIGKILL');
                            clearInterval(memoryInterval);
                        }
                    }
                }
                catch (error) {
                }
            }, 10);
            process.stdout?.on('data', (data) => {
                stdout += data.toString();
                if (stdout.length > parseInt(process.env.MAX_OUTPUT_LENGTH || '100000')) {
                    killed = true;
                    process.kill('SIGKILL');
                }
            });
            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            if (input && process.stdin) {
                process.stdin.write(input);
                process.stdin.end();
            }
            process.on('close', (code, signal) => {
                clearInterval(memoryInterval);
                const endTime = process.hrtime.bigint();
                const runtime = Number(endTime - startTime) / 1000000;
                if (killed) {
                    if (memoryUsage > memoryLimit * 1024) {
                        resolve(this.createErrorResult('Memory limit exceeded', types_1.ExecutionStatus.MEMORY_LIMIT_EXCEEDED, runtime, memoryUsage));
                    }
                    else {
                        resolve(this.createErrorResult('Output limit exceeded or process killed', types_1.ExecutionStatus.RUNTIME_ERROR, runtime, memoryUsage));
                    }
                    return;
                }
                if (signal === 'SIGTERM' || runtime >= timeLimit) {
                    resolve(this.createErrorResult('Time limit exceeded', types_1.ExecutionStatus.TIME_LIMIT_EXCEEDED, runtime, memoryUsage));
                    return;
                }
                if (code === 0) {
                    resolve({
                        success: true,
                        output: stdout.trim(),
                        error: null,
                        runtime,
                        memory: memoryUsage,
                        status: types_1.ExecutionStatus.SUCCESS
                    });
                }
                else {
                    resolve(this.createErrorResult(stderr.trim() || 'Runtime error', types_1.ExecutionStatus.RUNTIME_ERROR, runtime, memoryUsage));
                }
            });
            process.on('error', (error) => {
                clearInterval(memoryInterval);
                resolve(this.createErrorResult(`Process error: ${error.message}`, types_1.ExecutionStatus.RUNTIME_ERROR));
            });
            setTimeout(() => {
                if (!process.killed) {
                    killed = true;
                    process.kill('SIGKILL');
                }
            }, timeLimit + 1000);
        });
    }
    createErrorResult(error, status, runtime = 0, memory = 0) {
        return {
            success: false,
            output: '',
            error,
            runtime,
            memory,
            status
        };
    }
}
exports.CodeExecutor = CodeExecutor;
exports.codeExecutor = new CodeExecutor();
//# sourceMappingURL=executor.js.map