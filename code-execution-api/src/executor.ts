import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { fileManager } from './fileManager';
import { getLanguageConfig } from './languages';
import { ExecutionRequest, ExecutionResult, ExecutionStatus } from './types';

export class CodeExecutor {
  private maxExecutionTime: number;
  private maxMemoryLimit: number;

  constructor() {
    this.maxExecutionTime = parseInt(process.env.MAX_EXECUTION_TIME || '10000');
    this.maxMemoryLimit = parseInt(process.env.MAX_MEMORY_LIMIT || '256');
  }

  async executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    let tempFiles: string[] = [];
    let tempDir: string | null = null;

    try {
      const languageConfig = getLanguageConfig(request.language);
      if (!languageConfig) {
        return this.createErrorResult('Unsupported language', ExecutionStatus.INTERNAL_ERROR);
      }

      const timeLimit = Math.min(request.timeLimit || languageConfig.defaultTimeLimit, this.maxExecutionTime);
      const memoryLimit = Math.min(request.memoryLimit || languageConfig.defaultMemoryLimit, this.maxMemoryLimit);

      // Create temporary directory for this execution
      tempDir = fileManager.createTempDir();
      
      // Create source file
      const sourceFileName = request.language === 'java' ? 'Solution.java' : `solution.${languageConfig.extension}`;
      const sourceFilePath = fileManager.joinPath(tempDir, sourceFileName);
      fileManager.writeFile(sourceFilePath, request.code);
      tempFiles.push(sourceFilePath);

      // Compile if necessary
      if (languageConfig.compileCommand) {
        const compileResult = await this.compile(languageConfig, sourceFilePath, tempDir);
        if (!compileResult.success) {
          return compileResult;
        }
        // Add compiled files to cleanup list
        if (compileResult.compiledFile) {
          tempFiles.push(compileResult.compiledFile);
        }
      }

      // Execute the code
      const executionResult = await this.execute(
        languageConfig,
        sourceFilePath,
        tempDir,
        request.input || '',
        timeLimit,
        memoryLimit
      );

      const runtime = Date.now() - startTime;
      return {
        ...executionResult,
        runtime: Math.min(executionResult.runtime, runtime)
      };

    } catch (error) {
      return this.createErrorResult(
        `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ExecutionStatus.INTERNAL_ERROR
      );
    } finally {
      // Cleanup temporary files
      tempFiles.forEach(file => fileManager.deleteFile(file));
      if (tempDir) {
        fileManager.deleteDirectory(tempDir);
      }
    }
  }

  private async compile(
    languageConfig: any,
    sourceFilePath: string,
    workDir: string
  ): Promise<{ success: boolean; compiledFile?: string; error?: string; status?: ExecutionStatus }> {
    return new Promise((resolve) => {
      const sourceFileName = fileManager.getFileName(sourceFilePath);
      const executableName = fileManager.getFileNameWithoutExtension(sourceFilePath);
      const executablePath = fileManager.joinPath(workDir, executableName);

      let compileCommand: string[];
      
      if (languageConfig.id === 'java') {
        compileCommand = [...languageConfig.compileCommand, sourceFileName];
      } else if (languageConfig.id === 'cpp' || languageConfig.id === 'c') {
        compileCommand = [...languageConfig.compileCommand, executableName, sourceFileName];
      } else if (languageConfig.id === 'rust') {
        compileCommand = [...languageConfig.compileCommand, executableName, sourceFileName];
      } else {
        compileCommand = [...languageConfig.compileCommand, sourceFileName];
      }

      const process = spawn(compileCommand[0], compileCommand.slice(1), {
        cwd: workDir,
        timeout: 10000 // 10 second compile timeout
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
        } else {
          resolve({
            success: false,
            error: stderr || stdout || 'Compilation failed',
            status: ExecutionStatus.COMPILATION_ERROR
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: `Compilation error: ${error.message}`,
          status: ExecutionStatus.COMPILATION_ERROR
        });
      });
    });
  }

  private async execute(
    languageConfig: any,
    sourceFilePath: string,
    workDir: string,
    input: string,
    timeLimit: number,
    memoryLimit: number
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = process.hrtime.bigint();
      let runCommand: string[];
      
      if (languageConfig.id === 'java') {
        runCommand = [languageConfig.runCommand[0], 'Solution'];
      } else if (languageConfig.id === 'cpp' || languageConfig.id === 'c' || languageConfig.id === 'rust') {
        const executableName = fileManager.getFileNameWithoutExtension(sourceFilePath);
        runCommand = [`${languageConfig.runCommand[0]}${executableName}`];
      } else if (languageConfig.id === 'go') {
        runCommand = [...languageConfig.runCommand, fileManager.getFileName(sourceFilePath)];
      } else {
        runCommand = [...languageConfig.runCommand, fileManager.getFileName(sourceFilePath)];
      }

      const process = spawn(runCommand[0], runCommand.slice(1), {
        cwd: workDir,
        timeout: timeLimit,
        // Set memory limit (Linux only - for cross-platform, we'll track manually)
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let killed = false;
      let memoryUsage = 0;

      // Memory monitoring (basic implementation)
      const memoryInterval = setInterval(() => {
        try {
          if (process.pid) {
            // This is a simplified memory check - in production you might want to use pidusage
            const usage = process.memoryUsage?.() || { rss: 0 };
            memoryUsage = Math.max(memoryUsage, usage.rss / 1024); // Convert to KB
            
            if (memoryUsage > memoryLimit * 1024) { // Convert MB to KB
              killed = true;
              process.kill('SIGKILL');
              clearInterval(memoryInterval);
            }
          }
        } catch (error) {
          // Ignore errors in memory monitoring
        }
      }, 10);

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Prevent excessive output
        if (stdout.length > parseInt(process.env.MAX_OUTPUT_LENGTH || '100000')) {
          killed = true;
          process.kill('SIGKILL');
        }
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Send input to the process and ALWAYS close stdin
      // Important: even when input is empty, close stdin so programs waiting on EOF don't hang
      if (process.stdin) {
        if (typeof input === 'string' && input.length > 0) {
          process.stdin.write(input);
        }
        process.stdin.end();
      }

      process.on('close', (code, signal) => {
        clearInterval(memoryInterval);
        const endTime = process.hrtime.bigint();
        const runtime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        if (killed) {
          if (memoryUsage > memoryLimit * 1024) {
            resolve(this.createErrorResult('Memory limit exceeded', ExecutionStatus.MEMORY_LIMIT_EXCEEDED, runtime, memoryUsage));
          } else {
            resolve(this.createErrorResult('Output limit exceeded or process killed', ExecutionStatus.RUNTIME_ERROR, runtime, memoryUsage));
          }
          return;
        }

        if (signal === 'SIGTERM' || runtime >= timeLimit) {
          resolve(this.createErrorResult('Time limit exceeded', ExecutionStatus.TIME_LIMIT_EXCEEDED, runtime, memoryUsage));
          return;
        }

        if (code === 0) {
          resolve({
            success: true,
            output: stdout.trim(),
            error: null,
            runtime,
            memory: memoryUsage,
            status: ExecutionStatus.SUCCESS
          });
        } else {
          resolve(this.createErrorResult(
            stderr.trim() || 'Runtime error',
            ExecutionStatus.RUNTIME_ERROR,
            runtime,
            memoryUsage
          ));
        }
      });

      process.on('error', (error) => {
        clearInterval(memoryInterval);
        resolve(this.createErrorResult(`Process error: ${error.message}`, ExecutionStatus.RUNTIME_ERROR));
      });

      // Set timeout manually as backup
      setTimeout(() => {
        if (!process.killed) {
          killed = true;
          process.kill('SIGKILL');
        }
      }, timeLimit + 1000);
    });
  }

  private createErrorResult(
    error: string, 
    status: ExecutionStatus, 
    runtime: number = 0, 
    memory: number = 0
  ): ExecutionResult {
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

export const codeExecutor = new CodeExecutor();
