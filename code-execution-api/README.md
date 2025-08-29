# 🚀 WMOJ Code Execution API - Production Ready

A robust, production-ready code execution API that serves as an online judge for the WMOJ competitive programming platform. Supports multiple programming languages, test case validation, and can be deployed on Render.

## ✨ Features

### Core Functionality
- **Multi-Language Support**: Python, JavaScript, Java, C++, C
- **Code Execution**: Secure sandboxed execution with timeout and memory limits
- **Judge System**: Run code against multiple test cases with scoring
- **Real-time Results**: Get execution time, memory usage, and output
- **Error Handling**: Comprehensive error reporting and status codes

### Security & Performance  
- **API Key Authentication**: Secure endpoint access
- **Rate Limiting**: Configurable request throttling
- **CORS Protection**: Configurable allowed origins
- **Resource Limits**: Time and memory constraints
- **Input Validation**: Code length and input size limits
- **Automatic Cleanup**: Temporary file management

### Production Features
- **Health Monitoring**: `/health` endpoint for uptime checks
- **Graceful Shutdown**: Proper cleanup on termination  
- **Error Recovery**: Robust error handling and recovery
- **Logging**: Structured logging for debugging
- **Scalable**: Stateless design for horizontal scaling
- **Automatic Cleanup**: Temporary file management
- **Docker Support**: Containerized deployment option
- **Comprehensive API**: RESTful endpoints for all operations

## Supported Languages

| Language   | Version | Extension | Compile Time | Default Limits |
|------------|---------|-----------|--------------|----------------|
| Python     | 3.x     | .py       | N/A          | 5s, 128MB      |
| JavaScript | Node.js | .js       | N/A          | 5s, 128MB      |
| Java       | 17+     | .java     | Yes          | 10s, 256MB     |
| C++        | 17      | .cpp      | Yes          | 5s, 64MB       |
| C          | 11      | .c        | Yes          | 5s, 64MB       |
| Go         | 1.19+   | .go       | N/A          | 5s, 128MB      |
| Rust       | Latest  | .rs       | Yes          | 10s, 128MB     |

## API Endpoints

### Health Check
```http
GET /health
```
Returns API status and system information.

### Get Supported Languages
```http
GET /languages
```
Returns list of supported programming languages with their configurations.

### Execute Code
```http
POST /execute
Content-Type: application/json
X-API-Key: your-api-key

{
  "language": "python",
  "code": "print('Hello, World!')",
  "input": "",
  "timeLimit": 5000,
  "memoryLimit": 128
}
```

### Judge Submission
```http
POST /judge
Content-Type: application/json
X-API-Key: your-api-key

{
  "language": "python",
  "code": "n = int(input())\nprint(n * 2)",
  "testCases": [
    {
      "input": "5",
      "expectedOutput": "10",
      "points": 10
    }
  ],
  "timeLimit": 5000,
  "memoryLimit": 128
}
```

### Test Single Case
```http
POST /test
Content-Type: application/json
X-API-Key: your-api-key

{
  "language": "python",
  "code": "print('Hello')",
  "input": "",
  "expectedOutput": "Hello",
  "timeLimit": 5000,
  "memoryLimit": 128
}
```

## Installation

### Local Development

1. **Clone and Install Dependencies**
   ```bash
   cd code-execution-api
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Install System Dependencies**
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install python3 nodejs openjdk-17-jdk gcc g++ golang-go
   
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   
   **macOS:**
   ```bash
   brew install python3 node openjdk gcc go rust
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Build Docker Image**
   ```bash
   npm run docker:build
   ```

2. **Run Container**
   ```bash
   npm run docker:run
   ```

### Production Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3002` |
| `API_SECRET_KEY` | API authentication key | `none` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |
| `MAX_EXECUTION_TIME` | Max execution time (ms) | `10000` |
| `MAX_MEMORY_LIMIT` | Max memory limit (MB) | `256` |
| `MAX_CODE_LENGTH` | Max code length | `50000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### Security Configuration

- **API Key Authentication**: Protect endpoints with API keys
- **Rate Limiting**: Prevent abuse with configurable limits
- **Input Validation**: Comprehensive request validation
- **Sandboxed Execution**: Isolated code execution environment
- **Resource Limits**: Time and memory constraints
- **CORS Protection**: Cross-origin request filtering

## Integration with WMOJ

### Update Environment Variables

In your WMOJ `.env.local`:
```bash
# Custom API configuration
CUSTOM_JUDGE_API_URL=http://localhost:3002
CUSTOM_JUDGE_API_KEY=your-api-key-here
```

### Update Judge Service

The API is designed to be the **sole code execution backend** for WMOJ. Update your WMOJ judge service to use the new endpoints.

## Response Formats

### Execution Response
```json
{
  "success": true,
  "data": {
    "output": "Hello, World!",
    "error": null,
    "runtime": 45,
    "memory": 1024,
    "status": "SUCCESS"
  },
  "timestamp": "2025-08-29T10:30:00Z"
}
```

### Judge Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "status": "SUCCESS",
    "totalScore": 100,
    "maxScore": 100,
    "testCasesPassed": 5,
    "totalTestCases": 5,
    "averageRuntime": 67,
    "maxMemory": 2048,
    "testCaseResults": [...]
  },
  "timestamp": "2025-08-29T10:30:00Z"
}
```

## Error Handling

The API returns detailed error information for debugging:

- **COMPILATION_ERROR**: Code compilation failed
- **RUNTIME_ERROR**: Code crashed during execution
- **TIME_LIMIT_EXCEEDED**: Code took too long to execute
- **MEMORY_LIMIT_EXCEEDED**: Code used too much memory
- **WRONG_ANSWER**: Output doesn't match expected result
- **INTERNAL_ERROR**: Server-side error occurred

## Performance

- **Execution Time**: Sub-second response for most code
- **Concurrent Requests**: Handles multiple simultaneous executions
- **Memory Usage**: Efficient resource management
- **Scalability**: Stateless design for horizontal scaling

## Monitoring

### Health Monitoring
```bash
curl http://localhost:3002/health
```

### Logs
The API provides structured logging for:
- Request/response tracking
- Execution metrics
- Error debugging
- Security events

## Security Considerations

- **Code Sandboxing**: All code runs in isolated environments
- **Resource Limits**: Prevents resource exhaustion attacks
- **Input Sanitization**: All inputs are validated and sanitized
- **API Authentication**: Secure key-based authentication
- **Rate Limiting**: Prevents denial of service
- **Temp File Cleanup**: Automatic cleanup prevents disk filling

## Development

### Running Tests
```bash
npm test
```

### Code Structure
```
src/
├── server.ts          # Express server and routes
├── executor.ts        # Core code execution logic
├── judge.ts           # Test case judging service
├── languages.ts       # Language configurations
├── fileManager.ts     # File system operations
└── types.ts           # TypeScript type definitions
```

### Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Ensure security considerations

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the logs for detailed error information
- Ensure all system dependencies are installed
- Verify environment configuration
- Test with simple code examples first

---

**Ready to power WMOJ with your own secure, fast, and reliable code execution API!** 🚀
