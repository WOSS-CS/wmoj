export interface ExecutionRequest {
  language: string;
  code: string;
  input?: string;
  timeLimit?: number; // milliseconds
  memoryLimit?: number; // MB
}

export interface TestCaseRequest {
  language: string;
  code: string;
  testCases: TestCase[];
  timeLimit?: number;
  memoryLimit?: number;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  points?: number;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error: string | null;
  runtime: number; // milliseconds
  memory: number; // KB
  status: ExecutionStatus;
  details?: any;
}

export interface TestCaseResult extends ExecutionResult {
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  points: number;
}

export interface JudgeResult {
  success: boolean;
  status: ExecutionStatus;
  totalScore: number;
  maxScore: number;
  testCasesPassed: number;
  totalTestCases: number;
  averageRuntime: number;
  maxMemory: number;
  testCaseResults: TestCaseResult[];
  error?: string;
}

export enum ExecutionStatus {
  SUCCESS = 'SUCCESS',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface LanguageConfig {
  id: string;
  name: string;
  extension: string;
  compileCommand?: string[];
  runCommand: string[];
  defaultTimeLimit: number;
  defaultMemoryLimit: number;
  template: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
