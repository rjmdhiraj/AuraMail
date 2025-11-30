# Production Deployment Guide

Complete guide for deploying the Voice-Enabled Email System to production.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Frontend Deployment (Vercel)](#frontend-deployment)
3. [Backend Deployment (Render)](#backend-deployment)
4. [AI Backend Deployment (Fly.io)](#ai-backend-deployment)
5. [Database & Redis Setup](#database-setup)
6. [SSL/TLS Configuration](#ssl-configuration)
7. [Monitoring & Logging](#monitoring)
8. [Backup Strategy](#backup-strategy)

## Pre-Deployment Checklist

### Security Configuration

✅ **Environment Variables**
- [ ] Generate strong SESSION_SECRET and JWT_SECRET
- [ ] Update CORS_ORIGIN to production domains
- [ ] Set COOKIE_SECURE=true
- [ ] Configure production Google OAuth redirect URIs
- [ ] Set appropriate rate limits

```bash
# Generate secure secrets
openssl rand -base64 32
```

✅ **Google Cloud Setup**
- [ ] Create production project
- [ ] Enable Gmail API
- [ ] Create OAuth 2.0 credentials
- [ ] Add production redirect URIs
- [ ] Enable billing (if using Cloud services)

✅ **API Keys**
- [ ] Google Cloud credentials JSON
- [ ] Session secret (32+ characters)
- [ ] JWT secret (32+ characters)

✅ **Code Review**
- [ ] Remove console.log statements
- [ ] Check error handling
- [ ] Verify input validation
- [ ] Review security headers

## Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Create vercel.json

Create `vercel.json` in project root:

```json
{
  "version": 2,
  "name": "voice-email-frontend",
  "builds": [
    { "src": "index.html", "use": "@vercel/static" },
    { "src": "style.css", "use": "@vercel/static" },
    { "src": "app.js", "use": "@vercel/static" }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend-url.onrender.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Step 3: Deploy

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables (if needed)
vercel env add REACT_APP_API_URL production
```

### Step 4: Configure Custom Domain (Optional)

```bash
vercel domains add your-domain.com
```

## Backend Deployment (Render)

### Step 1: Prepare render.yaml

Create `render.yaml` in backend directory:

```yaml
services:
  - type: web
    name: voice-email-backend
    env: node
    region: oregon
    plan: starter
    buildCommand: npm install
    startCommand: node src/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: FRONTEND_URL
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: GOOGLE_REDIRECT_URI
        sync: false
      - key: SESSION_SECRET
        generateValue: true
      - key: JWT_SECRET
        generateValue: true
      - key: REDIS_HOST
        fromService:
          type: redis
          name: voice-email-redis
          property: host
      - key: REDIS_PORT
        fromService:
          type: redis
          name: voice-email-redis
          property: port
    healthCheckPath: /health

  - type: redis
    name: voice-email-redis
    region: oregon
    plan: starter
    maxmemoryPolicy: allkeys-lru
```

### Step 2: Connect GitHub Repository

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Select backend directory

### Step 3: Configure Environment Variables

In Render dashboard:
1. Go to Environment tab
2. Add all variables from `.env.example`
3. Use generated secrets for sensitive values

### Step 4: Deploy

```bash
# Manual deploy via dashboard
# Or use Render CLI

render-cli deploy
```

### Step 5: Setup Redis

1. Go to Render dashboard
2. Click "New +" → "Redis"
3. Name: `voice-email-redis`
4. Plan: Starter
5. Note connection details

## AI Backend Deployment (Fly.io)

### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Create fly.toml

Create `fly.toml` in python-ai-backend directory:

```toml
app = "voice-email-ai"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "5000"
  FLASK_ENV = "production"
  WHISPER_MODEL = "base"

[http_service]
  internal_port = 5000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 4096

[[services]]
  protocol = "tcp"
  internal_port = 5000

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 100
    soft_limit = 80

  [[services.tcp_checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "10s"
    restart_limit = 6
    
  [[services.http_checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/health"
```

### Step 3: Deploy to Fly.io

```bash
cd python-ai-backend

# Login
flyctl auth login

# Launch app (first time)
flyctl launch

# Deploy
flyctl deploy

# Set secrets
flyctl secrets set GOOGLE_APPLICATION_CREDENTIALS="$(cat credentials/google-credentials.json | base64)"

# Scale resources
flyctl scale memory 4096
flyctl scale count 2

# View logs
flyctl logs

# Access shell
flyctl ssh console
```

### Step 4: Configure Volumes (for model cache)

```bash
# Create volume
flyctl volumes create models_cache --size 10

# Update fly.toml
[[mounts]]
  source = "models_cache"
  destination = "/app/models_cache"
```

## Database Setup

### Redis Configuration

For production, use managed Redis:

**Option 1: Redis Cloud**
```bash
# Sign up at https://redis.com/cloud/
# Get connection details
# Update environment variables:
REDIS_HOST=redis-xxxxx.redis.cloud.com
REDIS_PORT=xxxxx
REDIS_PASSWORD=your_password
```

**Option 2: Render Redis**
- Already configured in render.yaml
- No additional setup needed

**Option 3: AWS ElastiCache**
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id voice-email-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1
```

## SSL/TLS Configuration

### Automatic SSL (Recommended)

All platforms provide automatic SSL:
- **Vercel**: Auto SSL with Let's Encrypt
- **Render**: Auto SSL certificates
- **Fly.io**: Auto SSL/TLS

### Custom Domain SSL

```bash
# Vercel
vercel domains add yourdomain.com
# SSL is automatic

# Render
# Add custom domain in dashboard
# Update DNS records
# SSL is automatic

# Fly.io
flyctl certs add yourdomain.com
```

### Force HTTPS

Update environment variables:
```env
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
```

## Monitoring & Logging

### Log Aggregation

**Option 1: LogDNA/Mezmo**
```bash
# Install agent
npm install --save logdna

# Configure in logger.js
const logdna = require('@logdna/logger');
const logger = logdna.createLogger(process.env.LOGDNA_KEY);
```

**Option 2: Datadog**
```bash
# Add to package.json
npm install dd-trace --save

# Initialize in server.js
require('dd-trace').init();
```

**Option 3: Cloud Logging**
```bash
# Google Cloud Logging
npm install @google-cloud/logging
```

### Health Monitoring

**Uptime Robot**
1. Go to https://uptimerobot.com/
2. Add monitors for:
   - Frontend: `https://yourdomain.com`
   - Backend: `https://api.yourdomain.com/health`
   - AI Backend: `https://ai.yourdomain.com/health`

**Better Uptime**
```bash
# Alternative: https://betteruptime.com/
# Monitor endpoints with custom intervals
```

### Error Tracking

**Sentry**
```bash
# Install Sentry
npm install @sentry/node
pip install sentry-sdk

# Configure Node.js
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN });

# Configure Python
import sentry_sdk
sentry_sdk.init(dsn=os.getenv('SENTRY_DSN'))
```

### Performance Monitoring

**New Relic**
```bash
# Install
npm install newrelic
pip install newrelic

# Configure
export NEW_RELIC_LICENSE_KEY=your_key
export NEW_RELIC_APP_NAME='Voice Email System'
```

## Backup Strategy

### Session Data (Redis)

```bash
# Automatic backups with Redis Cloud
# Or manual backups:

# Create snapshot
redis-cli BGSAVE

# Schedule with cron
0 2 * * * redis-cli --rdb /backup/dump.rdb
```

### User Settings

Store in database with regular backups:

```bash
# PostgreSQL backup (if added)
pg_dump voice_email_db > backup.sql

# Schedule automated backups
# Use provider's backup feature or:
0 3 * * * pg_dump voice_email_db | gzip > backup_$(date +\%Y\%m\%d).sql.gz
```

### Environment Variables Backup

```bash
# Backup all secrets
cat > .env.backup << EOF
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
# ... other variables
EOF

# Encrypt backup
gpg -c .env.backup

# Store securely (never commit to git)
```

## Post-Deployment

### Verify Deployment

```bash
# Check all endpoints
curl https://yourdomain.com/health
curl https://api.yourdomain.com/health
curl https://ai.yourdomain.com/health

# Test OAuth flow
# 1. Open frontend
# 2. Click "Sign in with Google"
# 3. Complete authentication
# 4. Verify email loading

# Test voice commands
# 1. Allow microphone access
# 2. Say "read inbox"
# 3. Verify response
```

### Performance Optimization

```bash
# Enable CDN for static assets
# Configure caching headers
# Optimize images
# Minify CSS/JS

# Monitor response times
# Target: < 200ms API, < 50ms static assets
```

### Security Audit

```bash
# Run security scan
npm audit
pip-audit

# Check dependencies
npm outdated
pip list --outdated

# SSL test
https://www.ssllabs.com/ssltest/
```

## Scaling Considerations

### Horizontal Scaling

```bash
# Fly.io - Scale instances
flyctl scale count 3

# Render - Upgrade plan for auto-scaling
# Configure in dashboard

# Load balancing is automatic
```

### Vertical Scaling

```bash
# Increase resources
flyctl scale memory 8192  # 8GB RAM
flyctl scale vm shared-cpu-2x  # 2 CPUs
```

### Database Scaling

```bash
# Redis - Upgrade plan
# Use Redis Cluster for > 1M keys

# Add PostgreSQL for user data
# Use connection pooling
```

## Troubleshooting Production Issues

### High Memory Usage (AI Backend)

```bash
# Reduce Whisper model size
WHISPER_MODEL=tiny  # Instead of base

# Limit concurrent requests
# Add queue system
```

### Slow Response Times

```bash
# Enable caching
# Use Redis for API responses

# Optimize database queries
# Add indexes

# Use CDN for static assets
```

### OAuth Issues

```bash
# Verify redirect URIs match exactly
# Check credentials not expired
# Ensure Gmail API enabled
# Review OAuth consent screen settings
```

## Maintenance

### Regular Tasks

Weekly:
- [ ] Review logs for errors
- [ ] Check resource usage
- [ ] Verify backups running
- [ ] Update dependencies (patch versions)

Monthly:
- [ ] Security audit
- [ ] Performance review
- [ ] Cost optimization
- [ ] Update documentation

Quarterly:
- [ ] Major dependency updates
- [ ] Disaster recovery test
- [ ] User feedback review
- [ ] Feature planning

---

**Production deployment complete! 🚀**

For issues, check:
1. Service logs
2. Health endpoints
3. Error tracking (Sentry)
4. This troubleshooting guide
