# WMOJ Code Execution API - Render Deployment

## Environment Variables for Render

Set these environment variables in your Render service:

```bash
NODE_ENV=production
PORT=10000
API_SECRET_KEY=your-super-secure-production-api-key-here
ALLOWED_ORIGINS=https://your-wmoj-app.com,https://your-domain.com
MAX_EXECUTION_TIME=10000
MAX_MEMORY_LIMIT=256
MAX_CODE_LENGTH=50000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=50
```

## Render Service Configuration

1. **Service Type**: Web Service
2. **Runtime**: Node
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Node Version**: 18+ (set in package.json engines)

## Important Notes for Render

- **Port**: Render automatically sets PORT environment variable to 10000
- **Build**: No build step required (using plain JS)
- **Health Check**: Use `/health` endpoint
- **Timeout**: Default request timeout is 30 seconds
- **Memory**: Basic plan has 512MB RAM
- **CPU**: Shared CPU on free tier

## Deployment Steps

1. Push code to GitHub repository
2. Connect repository to Render
3. Set environment variables
4. Deploy!

## Testing Your Deployed API

Replace `YOUR_RENDER_URL` with your actual Render service URL:

```bash
# Health check
curl https://YOUR_RENDER_URL.onrender.com/health

# Test code execution
curl -X POST https://YOUR_RENDER_URL.onrender.com/execute \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "language": "python",
    "code": "print(\"Hello from Render!\")",
    "input": ""
  }'
```

## Security Considerations

- Always use a strong API key in production
- Set appropriate CORS origins
- Monitor rate limiting
- Keep dependencies updated

## Monitoring

- Use Render's built-in logs
- Monitor the `/health` endpoint
- Set up alerts for downtime

## Limitations on Render Free Tier

- Service spins down after 15 minutes of inactivity
- 750 hours/month free usage
- Shared resources
- No persistent storage

For production use, consider upgrading to a paid plan for:
- Always-on service
- Dedicated resources
- Better performance
- More memory and CPU
