"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);
// API Key validation middleware
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const expectedKey = process.env.API_SECRET_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
    }
    next();
};
// Language configurations
const languages = {
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
async function executeCode(language, code, input = '') {
    const config = languages[language.toLowerCase()];
    if (!config) {
        throw new Error(`Unsupported language: ${language}`);
    }
    const executionId = (0, uuid_1.v4)();
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
            }
            else {
                compileArgs.push(filepath, path.join(workDir, compiledName));
                execCommand = [`./${compiledName}`];
                execArgs = [];
            }
            // Compile
            await new Promise((resolve, reject) => {
                const compileProcess = (0, child_process_1.spawn)(compileArgs[0], compileArgs.slice(1), {
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
                    }
                    else {
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
        const result = await new Promise((resolve, reject) => {
            const process = (0, child_process_1.spawn)(execCommand[0], [...execCommand.slice(1), ...execArgs], {
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
                }
                else if (code !== 0) {
                    resolve({
                        success: false,
                        output: stdout,
                        error: stderr || 'Runtime error',
                        runtime,
                        memory: 0,
                        status: 'RUNTIME_ERROR'
                    });
                }
                else {
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
    }
    finally {
        // Cleanup
        try {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
        catch (e) {
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
    }
    catch (error) {
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
            }
            catch (error) {
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
    }
    catch (error) {
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
app.use((err, req, res, next) => {
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
exports.default = app;
