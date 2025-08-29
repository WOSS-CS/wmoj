"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const node_cron_1 = __importDefault(require("node-cron"));
const dotenv_1 = __importDefault(require("dotenv"));
const executor_1 = require("./executor");
const judge_1 = require("./judge");
const languages_1 = require("./languages");
const fileManager_1 = require("./fileManager");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
        timestamp: new Date().toISOString()
    }
});
app.use(limiter);
app.use(express_1.default.json({ limit: '1mb' }));
const validateApiKey = (req, res, next) => {
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
const validateCodeRequest = (req, res, next) => {
    const { language, code } = req.body;
    if (!language || !code) {
        return res.status(400).json({
            success: false,
            error: 'Language and code are required',
            timestamp: new Date().toISOString()
        });
    }
    if (!(0, languages_1.getLanguageConfig)(language)) {
        return res.status(400).json({
            success: false,
            error: `Unsupported language: ${language}. Supported languages: ${(0, languages_1.getSupportedLanguages)().join(', ')}`,
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
app.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            supportedLanguages: (0, languages_1.getSupportedLanguages)()
        },
        timestamp: new Date().toISOString()
    });
});
app.get('/languages', (req, res) => {
    const languages = (0, languages_1.getSupportedLanguages)().map(lang => {
        const config = (0, languages_1.getLanguageConfig)(lang);
        return {
            id: config.id,
            name: config.name,
            extension: config.extension,
            defaultTimeLimit: config.defaultTimeLimit,
            defaultMemoryLimit: config.defaultMemoryLimit,
            template: config.template
        };
    });
    res.json({
        success: true,
        data: languages,
        timestamp: new Date().toISOString()
    });
});
app.post('/execute', validateApiKey, validateCodeRequest, async (req, res) => {
    try {
        const request = req.body;
        console.log(`Executing ${request.language} code, length: ${request.code.length}`);
        const result = await executor_1.codeExecutor.executeCode(request);
        const response = {
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
    }
    catch (error) {
        console.error('Code execution error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});
app.post('/judge', validateApiKey, validateCodeRequest, async (req, res) => {
    try {
        const request = req.body;
        if (!request.testCases || !Array.isArray(request.testCases) || request.testCases.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Test cases are required and must be a non-empty array',
                timestamp: new Date().toISOString()
            });
        }
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
        const result = await judge_1.judgeService.judgeSubmission(request);
        const response = {
            success: result.success,
            data: result,
            timestamp: new Date().toISOString()
        };
        res.json(response);
    }
    catch (error) {
        console.error('Judging error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});
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
        const result = await judge_1.judgeService.runSingleTest(language, code, input || '', expectedOutput, timeLimit, memoryLimit);
        const response = {
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
    }
    catch (error) {
        console.error('Test execution error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        timestamp: new Date().toISOString()
    });
});
node_cron_1.default.schedule(process.env.CLEANUP_INTERVAL_MINUTES || '*/5 * * * *', () => {
    console.log('Running cleanup...');
    fileManager_1.fileManager.cleanupOldFiles();
});
app.listen(PORT, () => {
    console.log(`🚀 Code Execution API running on port ${PORT}`);
    console.log(`📚 Supported languages: ${(0, languages_1.getSupportedLanguages)().join(', ')}`);
    console.log(`🔒 API Key required: ${!!process.env.API_SECRET_KEY}`);
    console.log(`🧹 Cleanup interval: ${process.env.CLEANUP_INTERVAL_MINUTES || '5'} minutes`);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
//# sourceMappingURL=server.js.map