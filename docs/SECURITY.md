# Security Best Practices

Comprehensive security guide for the Voice-Enabled Email System.

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [API Security](#api-security)
3. [Data Protection](#data-protection)
4. [Network Security](#network-security)
5. [Session Management](#session-management)
6. [Input Validation](#input-validation)
7. [Error Handling](#error-handling)
8. [Logging & Monitoring](#logging--monitoring)
9. [Dependency Management](#dependency-management)
10. [Deployment Security](#deployment-security)

## Authentication & Authorization

### OAuth 2.0 Implementation

✅ **DO:**
- Use PKCE (Proof Key for Code Exchange) flow
- Implement proper state parameter validation
- Store tokens securely (encrypted in database)
- Refresh tokens before expiration
- Validate redirect URIs strictly

❌ **DON'T:**
- Store tokens in localStorage or sessionStorage
- Expose client secrets in frontend code
- Use implicit flow (deprecated)
- Share refresh tokens between clients

**Implementation:**
```javascript
// backend/src/config/google.js
export const getAuthUrl = (oauth2Client) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: generateSecureState(), // Add CSRF protection
  });
};
```

### Session Security

```javascript
// backend/src/config/session.js
export const sessionMiddleware = session({
  store: redisStore,
  name: 'voice-email.sid',
  secret: process.env.SESSION_SECRET, // 32+ char random
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true, // Prevent XSS
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'strict', // CSRF protection
    domain: process.env.COOKIE_DOMAIN, // Specific domain
  },
});
```

### JWT Token Security

```javascript
// Generate strong secret
const JWT_SECRET = crypto.randomBytes(32).toString('base64');

// Token payload - minimal data
const payload = {
  id: user.id,
  email: user.email,
  iat: Date.now(),
};

// Short expiration
const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: '15m',
  issuer: 'voice-email-system',
  audience: 'api.voice-email.com',
});

// Refresh token - longer expiration
const refreshToken = jwt.sign(
  { id: user.id, type: 'refresh' },
  JWT_SECRET,
  { expiresIn: '7d' }
);
```

## API Security

### Rate Limiting

```javascript
// Strict rate limiting for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: ${req.ip}`);
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: 900, // seconds
    });
  },
});
```

### CORS Configuration

```javascript
// Strict CORS for production
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
};
```

### Security Headers (Helmet)

```javascript
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline in prod
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
};
```

## Data Protection

### Encryption at Rest

```javascript
// Encrypt sensitive data before storing
const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

function decrypt(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Encryption in Transit

```javascript
// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// TLS 1.2+ only
const httpsOptions = {
  minVersion: 'TLSv1.2',
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
  ].join(':'),
};
```

### Secure Token Storage

```javascript
// Store tokens in Redis with encryption
async function storeUserTokens(userId, tokens) {
  const encryptedTokens = encrypt(JSON.stringify(tokens));
  
  await redisClient.setex(
    `tokens:${userId}`,
    3600, // 1 hour TTL
    JSON.stringify(encryptedTokens)
  );
}

async function getUserTokens(userId) {
  const encryptedData = await redisClient.get(`tokens:${userId}`);
  if (!encryptedData) return null;
  
  const { encrypted, iv, authTag } = JSON.parse(encryptedData);
  const decrypted = decrypt(encrypted, iv, authTag);
  
  return JSON.parse(decrypted);
}
```

## Network Security

### WebSocket Security

```javascript
// Verify origin
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
  
  if (!allowedOrigins.includes(origin)) {
    ws.close(1008, 'Policy Violation');
    return;
  }
  
  // Authenticate connection
  const token = new URL(req.url, 'wss://example.com').searchParams.get('token');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ws.userId = decoded.id;
  } catch (error) {
    ws.close(1008, 'Authentication Failed');
    return;
  }
  
  // Connection established
  setupWebSocketHandlers(ws);
});
```

### API Gateway Pattern

```nginx
# nginx.conf - API gateway
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # DDoS protection
    client_body_timeout 10s;
    client_header_timeout 10s;
    client_max_body_size 10M;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy to backend
    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Session Management

### Session Fixation Prevention

```javascript
// Regenerate session ID after login
app.post('/api/auth/login', async (req, res) => {
  // Authenticate user
  const user = await authenticateUser(req.body);
  
  // Regenerate session
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Session error' });
    }
    
    // Store user data
    req.session.userId = user.id;
    req.session.save();
    
    res.json({ success: true });
  });
});
```

### Session Timeout

```javascript
// Automatic logout after inactivity
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

app.use((req, res, next) => {
  if (req.session.lastActivity) {
    const timeSinceLastActivity = Date.now() - req.session.lastActivity;
    
    if (timeSinceLastActivity > SESSION_TIMEOUT) {
      req.session.destroy();
      return res.status(401).json({
        error: 'Session Expired',
        message: 'Please log in again',
      });
    }
  }
  
  req.session.lastActivity = Date.now();
  next();
});
```

## Input Validation

### Email Validation

```javascript
import { body, validationResult } from 'express-validator';

export const validateEmailCompose = [
  body('to')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  
  body('subject')
    .trim()
    .escape()
    .isLength({ min: 1, max: 998 })
    .withMessage('Subject must be 1-998 characters'),
  
  body('body')
    .trim()
    .isLength({ min: 1, max: 100000 })
    .withMessage('Body must be 1-100000 characters'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array(),
      });
    }
    next();
  },
];
```

### SQL Injection Prevention

```javascript
// Use parameterized queries (if using SQL)
const query = 'SELECT * FROM users WHERE email = $1 AND active = $2';
const values = [email, true];
const result = await pool.query(query, values);
```

### XSS Prevention

```javascript
// Sanitize HTML input
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}
```

### Command Injection Prevention

```python
# Python - Never use shell=True
import subprocess

# BAD: Vulnerable to injection
# subprocess.run(f"echo {user_input}", shell=True)

# GOOD: Use list arguments
subprocess.run(['echo', user_input], capture_output=True)
```

## Error Handling

### Secure Error Messages

```javascript
// Don't leak sensitive info
app.use((err, req, res, next) => {
  // Log full error (server-side only)
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    ip: req.ip,
  });
  
  // Send generic message to client
  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message,
    timestamp: new Date().toISOString(),
  });
});
```

## Logging & Monitoring

### Security Event Logging

```javascript
// Log security events
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.File({
      filename: 'logs/security.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// Log authentication attempts
function logAuthAttempt(email, success, ip) {
  securityLogger.info('Authentication attempt', {
    email,
    success,
    ip,
    timestamp: new Date().toISOString(),
  });
}

// Log suspicious activity
function logSuspiciousActivity(type, details, ip) {
  securityLogger.warn('Suspicious activity', {
    type,
    details,
    ip,
    timestamp: new Date().toISOString(),
  });
}
```

### Intrusion Detection

```javascript
// Detect brute force attacks
const failedAttempts = new Map();

function checkBruteForce(ip) {
  const attempts = failedAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
  
  // Reset after 1 hour
  if (Date.now() - attempts.firstAttempt > 3600000) {
    failedAttempts.delete(ip);
    return false;
  }
  
  // Block after 10 failed attempts
  if (attempts.count >= 10) {
    logger.warn(`Brute force detected from IP: ${ip}`);
    return true;
  }
  
  return false;
}

function recordFailedAttempt(ip) {
  const attempts = failedAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
  attempts.count++;
  failedAttempts.set(ip, attempts);
}
```

## Dependency Management

### Regular Updates

```bash
# Check for vulnerabilities
npm audit
pip-audit

# Update dependencies
npm update
pip install --upgrade -r requirements.txt

# Automated updates with Dependabot
# Create .github/dependabot.yml
```

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
  
  - package-ecosystem: "pip"
    directory: "/python-ai-backend"
    schedule:
      interval: "weekly"
```

### Pin Versions

```json
// package.json - Use exact versions
{
  "dependencies": {
    "express": "4.18.2",  // Not "^4.18.2"
    "jsonwebtoken": "9.0.2"
  }
}
```

```txt
# requirements.txt - Pin versions
Flask==3.0.0
flask-cors==4.0.0
```

## Deployment Security

### Environment Variables

```bash
# Generate secure secrets
openssl rand -base64 32

# Never commit secrets
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore

# Use secret management
# AWS Secrets Manager, Google Secret Manager, HashiCorp Vault
```

### Container Security

```dockerfile
# Use specific versions
FROM node:18.19.0-alpine

# Don't run as root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Scan for vulnerabilities
# docker scan voice-email-backend

# Multi-stage builds
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER node
CMD ["node", "src/server.js"]
```

### Security Checklist

✅ **Pre-deployment:**
- [ ] All secrets in environment variables
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages sanitized
- [ ] Logging configured
- [ ] Dependencies updated
- [ ] Vulnerability scan passed
- [ ] Backup strategy in place

✅ **Post-deployment:**
- [ ] SSL/TLS certificate valid
- [ ] Security headers verified
- [ ] Authentication working
- [ ] Rate limiting effective
- [ ] Monitoring active
- [ ] Incident response plan ready

---

## Security Incident Response

### Detection
1. Monitor logs for anomalies
2. Set up alerting for:
   - Failed authentication attempts
   - Rate limit violations
   - Unusual API patterns
   - System errors

### Response
1. **Identify** - What happened?
2. **Contain** - Stop the attack
3. **Eradicate** - Remove threat
4. **Recover** - Restore services
5. **Learn** - Improve security

### Emergency Contacts
- Security team: security@yourcompany.com
- On-call engineer: +1-xxx-xxx-xxxx
- Cloud provider support

---

**Security is an ongoing process, not a one-time task. Stay vigilant! 🔒**
