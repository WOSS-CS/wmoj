const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002').split(','),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '50'),
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const expectedKey = process.env.API_SECRET_KEY;
  
  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
};

// Language configurations
const languages = {
  python: {
    extension: 'py',
    command: ['python', '-u'],
    timeout: 10000,
    memoryLimit: 128
  },
  javascript: {
    extension: 'js', 
    command: ['node'],
    timeout: 10000,
    memoryLimit: 128
  },
  java: {
    extension: 'java',
    compile: ['javac'],
    command: ['java'],
    timeout: 15000,
    memoryLimit: 256,
    needsCompilation: true
  },
  cpp: {
    extension: 'cpp',
    compile: ['g++', '-o'],
    timeout: 15000,
    memoryLimit: 256,
    needsCompilation: true
  },
  c: {
    extension: 'c',
    compile: ['gcc', '-o'],
    timeout: 15000,
    memoryLimit: 256,
    needsCompilation: true
  }
};

// Create temp directory
const tempDir = path.join(os.tmpdir(), 'wmoj-executor');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Cleanup old temp directories
function cleanup() {
  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stat = fs.statSync(filePath);
      // Remove directories older than 10 minutes
      if (now - stat.mtime.getTime() > 10 * 60 * 1000) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    });
  } catch (error) {
    console.warn('Cleanup error:', error.message);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

// Execute code function
async function executeCode(language, code, input = '', timeLimit = null) {
  const config = languages[language.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const executionId = uuidv4();
  const workDir = path.join(tempDir, executionId);
  fs.mkdirSync(workDir);

  const maxTime = timeLimit || config.timeout;

  try {
    const filename = `solution.${config.extension}`;
    const filepath = path.join(workDir, filename);
    fs.writeFileSync(filepath, code);

    let execCommand = [...config.command];
    let execArgs = [filepath];

    // Handle compilation for compiled languages
    if (config.needsCompilation) {
      const compiledName = language === 'java' ? 'Solution' : 'solution';
      const compileArgs = [...config.compile];
      
      if (language === 'java') {
        // Java needs special handling
        const javaCode = code.replace(/public\s+class\s+\w+/g, 'public class Solution');
        fs.writeFileSync(filepath, javaCode);
        compileArgs.push(filepath);
      } else {
        compileArgs.push(filepath, path.join(workDir, compiledName));
      }

      // Compile step
      await new Promise((resolve, reject) => {
        const compileProcess = spawn(compileArgs[0], compileArgs.slice(1), {
          cwd: workDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderr = '';
        compileProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        const compileTimeout = setTimeout(() => {
          compileProcess.kill('SIGKILL');
          reject(new Error('Compilation timeout'));
        }, 30000);

        compileProcess.on('close', (code) => {
          clearTimeout(compileTimeout);
          if (code !== 0) {
            reject(new Error(`Compilation failed: ${stderr}`));
          } else {
            resolve();
          }
        });

        compileProcess.on('error', (error) => {
          clearTimeout(compileTimeout);
          reject(new Error(`Compilation error: ${error.message}`));
        });
      });

      // Update execution command
      if (language === 'java') {
        execCommand = ['java'];
        execArgs = ['-cp', workDir, 'Solution'];
      } else {
        execCommand = [path.join(workDir, compiledName)];
        execArgs = [];
      }
    }

    // Execute the code
    const startTime = Date.now();
    const result = await new Promise((resolve, reject) => {
      const process = spawn(execCommand[0], [...execCommand.slice(1), ...execArgs], {
        cwd: workDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      // Set execution timeout
      const executionTimeout = setTimeout(() => {
        isTimedOut = true;
        process.kill('SIGKILL');
      }, maxTime);

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Prevent excessive output
        if (stdout.length > 100000) {
          process.kill('SIGKILL');
        }
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > 10000) {
          process.kill('SIGKILL');
        }
      });

      // Send input if provided
      if (input) {
        try {
          process.stdin?.write(input);
          process.stdin?.end();
        } catch (error) {
          // Ignore input errors
        }
      }

      process.on('close', (code, signal) => {
        clearTimeout(executionTimeout);
        const runtime = Date.now() - startTime;
        
        if (isTimedOut || signal === 'SIGKILL') {
          resolve({
            success: false,
            output: stdout.trim(),
            error: 'Time limit exceeded',
            runtime: maxTime,
            memory: 0,
            status: 'TIME_LIMIT_EXCEEDED'
          });
        } else if (code !== 0) {
          resolve({
            success: false,
            output: stdout.trim(),
            error: stderr.trim() || 'Runtime error',
            runtime,
            memory: 0,
            status: code === 1 ? 'RUNTIME_ERROR' : 'RUNTIME_ERROR'
          });
        } else {
          resolve({
            success: true,
            output: stdout.trim(),
            error: null,
            runtime,
            memory: 0, // Memory tracking would need platform-specific implementation
            status: 'SUCCESS'
          });
        }
      });

      process.on('error', (error) => {
        clearTimeout(executionTimeout);
        resolve({
          success: false,
          output: '',
          error: error.message,
          runtime: 0,
          memory: 0,
          status: 'INTERNAL_ERROR'
        });
      });
    });

    return result;
  } finally {
    // Cleanup
    setTimeout(() => {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to cleanup temp directory:', workDir);
      }
    }, 1000);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    supportedLanguages: Object.keys(languages),
    uptime: process.uptime()
  });
});

// Test connection endpoint
app.get('/test-connection', (req, res) => {
  res.json({
    connected: true,
    endpoint: req.get('host'),
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// Get supported languages
app.get('/languages', (req, res) => {
  const supportedLanguages = Object.entries(languages).map(([key, config]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    extension: config.extension,
    timeout: config.timeout,
    memoryLimit: config.memoryLimit
  }));
  
  res.json({
    success: true,
    data: supportedLanguages,
    timestamp: new Date().toISOString()
  });
});

// Simple code execution endpoint
app.post('/execute', validateApiKey, async (req, res) => {
  try {
    const { language, code, input = '', timeLimit } = req.body;

    if (!language || !code) {
      return res.status(400).json({ 
        success: false,
        error: 'Language and code are required',
        status: 'BAD_REQUEST'
      });
    }

    if (code.length > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Code too long (max 50KB)',
        status: 'BAD_REQUEST'
      });
    }

    const result = await executeCode(language, code, input, timeLimit);
    res.json(result);

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'INTERNAL_ERROR',
      output: '',
      runtime: 0,
      memory: 0
    });
  }
});

// Judge endpoint - runs code against multiple test cases
app.post('/judge', validateApiKey, async (req, res) => {
  try {
    const { language, code, testCases = [], timeLimit } = req.body;

    if (!language || !code) {
      return res.status(400).json({ 
        success: false,
        error: 'Language and code are required',
        status: 'BAD_REQUEST'
      });
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Test cases are required and must be an array',
        status: 'BAD_REQUEST'
      });
    }

    const results = [];
    let totalScore = 0;
    let maxScore = 0;
    let passed = 0;
    let totalRuntime = 0;
    let maxMemory = 0;

    // Process each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const points = testCase.points || 1;
      maxScore += points;

      try {
        // Validate test case
        if (testCase.input === undefined || testCase.expectedOutput === undefined) {
          results.push({
            success: false,
            passed: false,
            output: '',
            error: 'Invalid test case: input and expectedOutput are required',
            runtime: 0,
            memory: 0,
            status: 'INTERNAL_ERROR',
            expectedOutput: testCase.expectedOutput || '',
            actualOutput: '',
            points: 0,
            testCaseIndex: i
          });
          continue;
        }

        const result = await executeCode(language, code, testCase.input, timeLimit);
        
        // Check if execution was successful
        if (!result.success) {
          results.push({
            ...result,
            passed: false,
            expectedOutput: testCase.expectedOutput,
            actualOutput: result.output,
            points: 0,
            testCaseIndex: i
          });
          continue;
        }

        const actualOutput = result.output.trim();
        const expectedOutput = testCase.expectedOutput.trim();
        const testPassed = actualOutput === expectedOutput;

        if (testPassed) {
          totalScore += points;
          passed++;
        }

        totalRuntime += result.runtime;
        maxMemory = Math.max(maxMemory, result.memory);

        results.push({
          ...result,
          passed: testPassed,
          expectedOutput,
          actualOutput,
          points: testPassed ? points : 0,
          testCaseIndex: i
        });

      } catch (error) {
        console.error(`Test case ${i} error:`, error);
        results.push({
          success: false,
          passed: false,
          output: '',
          error: error.message,
          runtime: 0,
          memory: 0,
          status: 'INTERNAL_ERROR',
          expectedOutput: testCase.expectedOutput || '',
          actualOutput: '',
          points: 0,
          testCaseIndex: i
        });
      }
    }

    // Determine overall status
    let overallStatus;
    if (passed === testCases.length) {
      overallStatus = 'SUCCESS';
    } else if (passed === 0) {
      // Check if any test case had compilation or runtime errors
      const hasCompilationError = results.some(r => r.status === 'COMPILATION_ERROR');
      const hasRuntimeError = results.some(r => r.status === 'RUNTIME_ERROR');
      const hasTimeoutError = results.some(r => r.status === 'TIME_LIMIT_EXCEEDED');
      
      if (hasCompilationError) {
        overallStatus = 'COMPILATION_ERROR';
      } else if (hasTimeoutError) {
        overallStatus = 'TIME_LIMIT_EXCEEDED';
      } else if (hasRuntimeError) {
        overallStatus = 'RUNTIME_ERROR';
      } else {
        overallStatus = 'WRONG_ANSWER';
      }
    } else {
      overallStatus = 'PARTIAL_SUCCESS';
    }

    const averageRuntime = testCases.length > 0 ? totalRuntime / testCases.length : 0;

    res.json({
      success: true,
      status: overallStatus,
      totalScore,
      maxScore,
      testCasesPassed: passed,
      totalTestCases: testCases.length,
      averageRuntime,
      maxMemory,
      testCaseResults: results,
      summary: {
        passed,
        failed: testCases.length - passed,
        percentage: testCases.length > 0 ? Math.round((passed / testCases.length) * 100) : 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Judge error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'INTERNAL_ERROR',
      totalScore: 0,
      maxScore: 0,
      testCasesPassed: 0,
      totalTestCases: 0,
      averageRuntime: 0,
      maxMemory: 0,
      testCaseResults: [],
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    status: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    status: 'NOT_FOUND',
    availableEndpoints: [
      'GET /health',
      'GET /test-connection', 
      'GET /languages',
      'POST /execute',
      'POST /judge'
    ],
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  cleanup();
  process.exit(0);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WMOJ Code Execution API running on port ${PORT}`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 API Key: ${process.env.API_SECRET_KEY || 'NOT_SET'}`);
  console.log(`🌍 Allowed origins: ${process.env.ALLOWED_ORIGINS || 'default'}`);
  console.log(`⚡ Supported languages: ${Object.keys(languages).join(', ')}`);
});

module.exports = app;
