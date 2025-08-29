import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);

// API Key validation middleware
const validateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const expectedKey = process.env.API_SECRET_KEY;
  
  if (!expectedKey || apiKey !== expectedKey) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }
  next();
};

// Language configurations
const languages: Record<string, any> = {
  python: {
    extension: 'py',
    command: ['python3', '-u'],
    timeout: 10000
  },
  javascript: {
    extension: 'js', 
    command: ['node'],
    timeout: 10000
  },
  java: {
    extension: 'java',
    compile: ['javac'],
    command: ['java'],
    timeout: 15000
  },
  cpp: {
    extension: 'cpp',
    compile: ['g++', '-o'],
    timeout: 15000
  },
  c: {
    extension: 'c',
    compile: ['gcc', '-o'],
    timeout: 15000
  }
};

// Create temp directory
const tempDir = path.join(os.tmpdir(), 'wmoj-executor');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Utility function to execute code
async function executeCode(language: string, code: string, input: string = ''): Promise<any> {
  const config = languages[language.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const executionId = uuidv4();
  const workDir = path.join(tempDir, executionId);
  fs.mkdirSync(workDir);

  try {
    const filename = `solution.${config.extension}`;
    const filepath = path.join(workDir, filename);
    fs.writeFileSync(filepath, code);

    let execCommand = config.command;
    let execArgs = [filepath];

    // Handle compilation for compiled languages
    if (config.compile) {
      const compiledName = language === 'java' ? 'Solution' : 'solution';
      const compileArgs = [...config.compile];
      
      if (language === 'java') {
        compileArgs.push(filepath);
      } else {
        compileArgs.push(filepath, path.join(workDir, compiledName));
        execCommand = [`./${compiledName}`];
        execArgs = [];
      }

      // Compile
      await new Promise<void>((resolve, reject) => {
        const compileProcess = spawn(compileArgs[0], compileArgs.slice(1), {
          cwd: workDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderr = '';
        compileProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        compileProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Compilation failed: ${stderr}`));
          } else {
            resolve();
          }
        });
      });

      if (language === 'java') {
        execCommand = ['java'];
        execArgs = ['-cp', workDir, 'Solution'];
      }
    }

    // Execute
    const startTime = Date.now();
    const result = await new Promise<any>((resolve, reject) => {
      const process = spawn(execCommand[0], [...execCommand.slice(1), ...execArgs], {
        cwd: workDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: config.timeout
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      if (input) {
        process.stdin?.write(input);
        process.stdin?.end();
      }

      process.on('close', (code, signal) => {
        const runtime = Date.now() - startTime;
        
        if (signal === 'SIGTERM') {
          resolve({
            success: false,
            output: '',
            error: 'Time limit exceeded',
            runtime: config.timeout,
            memory: 0,
            status: 'TIME_LIMIT_EXCEEDED'
          });
        } else if (code !== 0) {
          resolve({
            success: false,
            output: stdout,
            error: stderr || 'Runtime error',
            runtime,
            memory: 0,
            status: 'RUNTIME_ERROR'
          });
        } else {
          resolve({
            success: true,
            output: stdout,
            error: null,
            runtime,
            memory: 0, // Memory tracking would need more complex implementation
            status: 'SUCCESS'
          });
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });

    return result;
  } finally {
    // Cleanup
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to cleanup temp directory:', workDir);
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    supportedLanguages: Object.keys(languages)
  });
});

// Test connection endpoint (for health checks)
app.get('/test-connection', (req, res) => {
  res.json({
    connected: true,
    endpoint: `http://localhost:${PORT}`,
    timestamp: new Date().toISOString()
  });
});

// Code execution endpoint
app.post('/execute', validateApiKey, async (req, res) => {
  try {
    const { language, code, input = '' } = req.body;

    if (!language || !code) {
      return res.status(400).json({ error: 'Language and code are required' });
    }

    const result = await executeCode(language, code, input);
    res.json(result);
  } catch (error: any) {
    console.error('Execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'INTERNAL_ERROR'
    });
  }
});

// Judge endpoint (test against multiple test cases)
app.post('/judge', validateApiKey, async (req, res) => {
  try {
    const { language, code, testCases = [] } = req.body;

    if (!language || !code) {
      return res.status(400).json({ error: 'Language and code are required' });
    }

    const results = [];
    let totalScore = 0;
    let maxScore = 0;
    let passed = 0;

    for (const testCase of testCases) {
      const points = testCase.points || 1;
      maxScore += points;

      try {
        const result = await executeCode(language, code, testCase.input);
        const actualOutput = result.output.trim();
        const expectedOutput = testCase.expectedOutput.trim();
        const testPassed = actualOutput === expectedOutput;

        if (testPassed) {
          totalScore += points;
          passed++;
        }

        results.push({
          ...result,
          passed: testPassed,
          expectedOutput,
          actualOutput,
          points: testPassed ? points : 0
        });
      } catch (error: any) {
        results.push({
          success: false,
          passed: false,
          output: '',
          error: error.message,
          runtime: 0,
          memory: 0,
          status: 'INTERNAL_ERROR',
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          points: 0
        });
      }
    }

    res.json({
      success: true,
      totalScore,
      maxScore,
      testCasesPassed: passed,
      totalTestCases: testCases.length,
      testCaseResults: results,
      status: passed === testCases.length ? 'SUCCESS' : 'WRONG_ANSWER'
    });
  } catch (error: any) {
    console.error('Judge error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'INTERNAL_ERROR'
    });
  }
});

// Get supported languages
app.get('/languages', (req, res) => {
  const supportedLanguages = Object.entries(languages).map(([key, config]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    extension: config.extension
  }));
  
  res.json(supportedLanguages);
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WMOJ Code Execution API running on port ${PORT}`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 API Key: ${process.env.API_SECRET_KEY}`);
  console.log(`🌍 Allowed origins: ${process.env.ALLOWED_ORIGINS}`);
});

export default app;
