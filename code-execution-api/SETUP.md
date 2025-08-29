# WMOJ Custom Judge API Setup Guide

This guide will help you set up your own code execution API for the WMOJ platform.

## 🚀 Quick Start

### 1. Navigate to the API Directory
```bash
cd code-execution-api
```

### 2. Run the Installation Script

**Linux/macOS:**
```bash
chmod +x install.sh
./install.sh
```

**Windows:**
```cmd
install.bat
```

### 3. Start the API Server
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### 4. Update WMOJ Configuration

The installation script will generate an API key. Add these to your WMOJ `.env.local`:

```bash
# Custom Judge API Configuration
CUSTOM_JUDGE_API_URL=http://localhost:3002
CUSTOM_JUDGE_API_KEY=your-generated-api-key-here
```

### 5. Test the Integration

Visit your WMOJ application and try running code. Check the health endpoint:
```bash
curl http://localhost:3002/health
```

## 🐳 Docker Deployment

For production deployment, use Docker:

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t wmoj-judge-api .
docker run -p 3002:3002 -e API_SECRET_KEY=your-key wmoj-judge-api
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3002` |
| `API_SECRET_KEY` | API authentication key | Generated |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |
| `MAX_EXECUTION_TIME` | Max execution time (ms) | `10000` |
| `MAX_MEMORY_LIMIT` | Max memory limit (MB) | `256` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per minute | `100` |

### Language Support

The API supports these languages out of the box:
- Python 3
- JavaScript (Node.js)
- Java 17+
- C++ 17
- C 11
- Go
- Rust

## 🧪 Testing

### API Health Check
```bash
curl http://localhost:3002/health
```

### Run Example Tests
```bash
# Make the test script executable
chmod +x examples/test-api.sh

# Update the API key in the script
nano examples/test-api.sh

# Run tests
./examples/test-api.sh
```

### JavaScript Client Example
```bash
cd examples
node client-example.js
```

## 🔒 Security Features

- **API Key Authentication**: All endpoints require valid API key
- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Comprehensive request validation
- **Sandboxed Execution**: Isolated code execution environment
- **Resource Limits**: Time and memory constraints
- **CORS Protection**: Cross-origin request filtering

## 📊 Monitoring

### Health Endpoint
```http
GET /health
```

Returns API status, uptime, memory usage, and supported languages.

### Judge Health in WMOJ
```http
GET /api/judge-health
```

Returns status of all configured judge services (custom API only).

## 🚀 Production Deployment

### 1. Build for Production
```bash
npm run build
```

### 2. Set Production Environment
```bash
export NODE_ENV=production
export PORT=3002
export API_SECRET_KEY=your-secure-key
```

### 3. Start with PM2 (Recommended)
```bash
npm install -g pm2
pm2 start dist/server.js --name wmoj-judge-api
pm2 startup
pm2 save
```

### 4. Nginx Reverse Proxy (Optional)
```nginx
server {
    listen 80;
    server_name your-api-domain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🔄 Code Execution

The WMOJ platform exclusively uses the custom API for code execution:

1. **Custom Judge API** (configured via `CUSTOM_JUDGE_API_URL`)

This ensures consistent, fast, and reliable code execution for all submissions.

## 🛠️ Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in .env file
   PORT=3003
   ```

2. **Permission denied on Linux**
   ```bash
   chmod +x install.sh
   sudo chmod 755 /tmp/code-execution
   ```

3. **Language not found**
   - Ensure all programming languages are installed
   - Check PATH environment variable
   - Restart the API after installing languages

4. **API key authentication failed**
   - Check the API key in both .env files
   - Ensure the key matches between API and WMOJ

### Logs and Debugging

```bash
# Check API logs
npm run dev  # Shows real-time logs

# Check system dependencies
which python3 node java g++ go rustc

# Test individual language execution
curl -X POST http://localhost:3002/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"language":"python","code":"print(\"test\")"}'
```

## 📈 Performance Optimization

### For High Load

1. **Use Docker with resource limits**
2. **Set up load balancing** with multiple API instances
3. **Use Redis** for rate limiting across instances
4. **Monitor resource usage** with PM2 or Docker stats

### Memory Management

The API automatically:
- Cleans up temporary files every 5 minutes
- Sets memory limits for code execution
- Kills processes that exceed time limits

## 🔍 API Endpoints

### Execute Code
```http
POST /execute
{
  "language": "python",
  "code": "print('Hello')",
  "input": "",
  "timeLimit": 5000,
  "memoryLimit": 128
}
```

### Judge Submission
```http
POST /judge
{
  "language": "python",
  "code": "print(int(input()) * 2)",
  "testCases": [
    {"input": "5", "expectedOutput": "10", "points": 10}
  ]
}
```

### Test Single Case
```http
POST /test
{
  "language": "python",
  "code": "print('hello')",
  "expectedOutput": "hello"
}
```

## ✅ Verification

After setup, verify everything works:

1. **API Health**: `curl http://localhost:3002/health`
2. **WMOJ Health**: Visit `http://localhost:3000/api/judge-health`
3. **Code Execution**: Try running code in WMOJ problems
4. **Performance**: Check execution times and memory usage

Your custom judge API is now ready to handle code execution for the WMOJ platform! 🎉

## 📚 Additional Resources

- [API Documentation](../README.md)
- [Docker Deployment Guide](../docker-compose.yml)
- [Example Usage](../examples/)
- [Troubleshooting Guide](#troubleshooting)
