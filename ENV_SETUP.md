# Environment Variable Configuration

## Required Environment Variables

### Kimi K2 API Configuration
```bash
export KIMI_API_KEY="your-kimi-api-key-here"
```

**Note**: If `KIMI_API_KEY` is not set, the system will gracefully fallback to Claude and Gemini adapters.

### Optional Environment Variables

#### Rate Limiting (for production)
```bash
export STORM_RATE_LIMIT="100"  # requests per minute
export STORM_MAX_SESSIONS="50"  # concurrent sessions
```

#### Logging Level
```bash
export LOG_LEVEL="info"  # debug, info, warn, error
```

## Setup Instructions

1. **Create a .env file** in the project root:
   ```bash
   touch .env
   ```

2. **Add your API keys**:
   ```
   KIMI_API_KEY=your-kimi-key-here
   STORM_RATE_LIMIT=100
   STORM_MAX_SESSIONS=50
   LOG_LEVEL=info
   ```

3. **Load environment variables**:
   ```bash
   source .env
   # or
   export $(cat .env | xargs)
   ```

## Security Best Practices

- **Never commit API keys** to version control
- **Use different keys** for development and production
- **Rotate keys regularly** (monthly recommended)
- **Monitor API usage** to detect anomalies

## Testing Configuration

To test without Kimi API key:
```bash
unset KIMI_API_KEY
node -e "import('./swarm/orchestrator.js').then(m => console.log('✓ Fallback working'))"
```

## Troubleshooting

### "KIMI_API_KEY environment variable is required"
- Set the environment variable or let the system fallback to Claude/Gemini
- Check that the variable is exported in your shell session

### High API usage costs
- Use Claude (FREE) and Gemini (FREE with subscription) for most tasks
- Reserve Kimi for premium technical analysis only
- Monitor the `requiresPremiumTechnicalAnalysis` function results

### Rate limiting errors
- Adjust `STORM_RATE_LIMIT` and `STORM_MAX_SESSIONS`
- Implement exponential backoff in production
- Consider using multiple API keys for higher throughput