import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import dotenv from 'dotenv';

import { codeExecutor } from './executor';
import { judgeService } from './judge';
import { getSupportedLanguages, getLanguageConfig } from './languages';
import { fileManager } from './fileManager';
import { 
  ExecutionRequest, 
  TestCaseRequest, 
  ApiResponse, 
  ExecutionStatus 
} from './types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    timestamp: new Date().toISOString()
  }
});

app.use(limiter);
app.use(express.json({ limit: '1mb' }));

// Request validation middleware
const validateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  const expectedKey = process.env.API_SECRET_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

const validateCodeRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({
      success: false,
      error: 'Language and code are required',
      timestamp: new Date().toISOString()
    });
  }

  if (!getLanguageConfig(language)) {
    return res.status(400).json({
      success: false,
      error: `Unsupported language: ${language}. Supported languages: ${getSupportedLanguages().join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }

  const maxCodeLength = parseInt(process.env.MAX_CODE_LENGTH || '50000');
  if (code.length > maxCodeLength) {
    return res.status(400).json({
      success: false,
      error: `Code length exceeds maximum limit of ${maxCodeLength} characters`,
      timestamp: new Date().toISOString()
    });
  }

  const maxInputLength = parseInt(process.env.MAX_INPUT_LENGTH || '10000');
  if (req.body.input && req.body.input.length > maxInputLength) {
    return res.status(400).json({
      success: false,
      error: `Input length exceeds maximum limit of ${maxInputLength} characters`,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      supportedLanguages: getSupportedLanguages()
    },
    timestamp: new Date().toISOString()
  });
});

// Get supported languages
app.get('/languages', (req, res) => {
  const languages = getSupportedLanguages().map(lang => {
    const config = getLanguageConfig(lang);
    return {
      id: config!.id,
      name: config!.name,
      extension: config!.extension,
      defaultTimeLimit: config!.defaultTimeLimit,
      defaultMemoryLimit: config!.defaultMemoryLimit,
      template: config!.template
    };
  });

  res.json({
    success: true,
    data: languages,
    timestamp: new Date().toISOString()
  });
});

// Execute code
app.post('/execute', validateApiKey, validateCodeRequest, async (req, res) => {
  try {
    const request: ExecutionRequest = req.body;
    
    console.log(`Executing ${request.language} code, length: ${request.code.length}`);
    
    const result = await codeExecutor.executeCode(request);
    
    const response: ApiResponse = {
      success: result.success,
      data: {
        output: result.output,
        error: result.error,
        runtime: result.runtime,
        memory: result.memory,
        status: result.status
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Judge submission with test cases
app.post('/judge', validateApiKey, validateCodeRequest, async (req, res) => {
  try {
    const request: TestCaseRequest = req.body;

    if (!request.testCases || !Array.isArray(request.testCases) || request.testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Test cases are required and must be a non-empty array',
        timestamp: new Date().toISOString()
      });
    }

    // Validate test cases
    for (let i = 0; i < request.testCases.length; i++) {
      const testCase = request.testCases[i];
      if (!testCase.input && testCase.input !== '') {
        return res.status(400).json({
          success: false,
          error: `Test case ${i + 1} is missing input`,
          timestamp: new Date().toISOString()
        });
      }
      if (!testCase.expectedOutput && testCase.expectedOutput !== '') {
        return res.status(400).json({
          success: false,
          error: `Test case ${i + 1} is missing expected output`,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log(`Judging ${request.language} submission with ${request.testCases.length} test cases`);

    const result = await judgeService.judgeSubmission(request);

    const response: ApiResponse = {
      success: result.success,
      data: result,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Judging error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Run single test case
app.post('/test', validateApiKey, validateCodeRequest, async (req, res) => {
  try {
    const { language, code, input, expectedOutput, timeLimit, memoryLimit } = req.body;

    if (expectedOutput === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Expected output is required for testing',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`Testing ${language} code against expected output`);

    const result = await judgeService.runSingleTest(
      language, 
      code, 
      input || '', 
      expectedOutput, 
      timeLimit, 
      memoryLimit
    );

    const response: ApiResponse = {
      success: result.success,
      data: {
        passed: result.passed,
        output: result.output,
        expectedOutput: result.expectedOutput,
        actualOutput: result.actualOutput,
        error: result.error,
        runtime: result.runtime,
        memory: result.memory,
        status: result.status,
        points: result.points
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Test execution error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Cleanup cron job - runs every 5 minutes
cron.schedule(process.env.CLEANUP_INTERVAL_MINUTES || '*/5 * * * *', () => {
  console.log('Running cleanup...');
  fileManager.cleanupOldFiles();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Code Execution API running on port ${PORT}`);
  console.log(`📚 Supported languages: ${getSupportedLanguages().join(', ')}`);
  console.log(`🔒 API Key required: ${!!process.env.API_SECRET_KEY}`);
  console.log(`🧹 Cleanup interval: ${process.env.CLEANUP_INTERVAL_MINUTES || '5'} minutes`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
