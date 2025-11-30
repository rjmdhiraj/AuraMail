# Development Setup Guide

Complete guide for setting up the Voice-Enabled Email System locally for development.

## System Requirements

### Required Software
- **Node.js**: 18.x or higher
- **Python**: 3.11 or higher
- **Redis**: 7.x or higher
- **Git**: Latest version
- **npm**: 9.x or higher (comes with Node.js)

### Optional Tools
- **Docker Desktop**: For containerized development
- **VS Code**: Recommended IDE
- **Postman**: For API testing
- **Redis Commander**: Redis GUI client

### Hardware Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space (for models and dependencies)
- **CPU**: Multi-core processor recommended for AI workloads

## Step-by-Step Setup

### 1. Install Prerequisites

#### macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@18

# Install Python
brew install python@3.11

# Install Redis
brew install redis

# Start Redis
brew services start redis

# Verify installations
node --version  # Should be 18.x
python3 --version  # Should be 3.11.x
redis-cli ping  # Should return PONG
```

#### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Redis
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Verify installations
node --version
python3.11 --version
redis-cli ping
```

#### Windows

```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install packages
choco install nodejs-lts python redis-64

# Start Redis
redis-server

# Verify installations
node --version
python --version
redis-cli ping
```

### 2. Clone Repository

```bash
git clone <repository-url>
cd voice-email-system
```

### 3. Google Cloud Setup

#### Create Project and Enable APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: `Voice Email Dev`
3. Enable APIs:
   - Gmail API
   - Google Cloud Speech-to-Text API (optional)
   - Google Cloud Text-to-Speech API (optional)

#### Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Configure OAuth consent screen:
   - User Type: External (for testing)
   - App name: Voice Email System
   - Support email: Your email
   - Authorized domains: localhost
4. Create OAuth client:
   - Application type: Web application
   - Name: Voice Email Dev Client
   - Authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback`
     - `http://localhost:3001/api/auth/google/callback`
5. Download JSON credentials

#### Create Service Account (Optional, for Cloud APIs)

1. Navigate to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name: `voice-email-dev`
4. Grant roles:
   - Cloud Speech-to-Text API User
   - Cloud Text-to-Speech API User
5. Create and download JSON key
6. Save as `credentials/google-credentials.json`

### 4. Setup Node.js Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Edit `.env`:
```env
# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Google OAuth 2.0 - Use your credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Generate secure secrets
SESSION_SECRET=dev_session_secret_change_in_production
JWT_SECRET=dev_jwt_secret_change_in_production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Python AI Service
PYTHON_AI_SERVICE_URL=http://localhost:5000

# Rate Limiting (relaxed for dev)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# CORS
CORS_ORIGIN=http://localhost:3000

# Cookies
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# Gmail API Scopes
GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.modify
```

Generate secrets:
```bash
# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Create logs directory:
```bash
mkdir -p logs
```

### 5. Setup Python AI Backend

```bash
cd ../python-ai-backend

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env
nano .env
```

Edit `.env`:
```env
# Server
FLASK_APP=app.py
FLASK_ENV=development
PORT=5000
HOST=0.0.0.0

# Google Cloud (optional, for Cloud TTS/STT)
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-credentials.json

# Whisper Model
WHISPER_MODEL=base
# Options: tiny (39M), base (74M), small (244M), medium (769M), large (1550M)

# Models Cache
MODELS_CACHE_DIR=./models_cache

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Hugging Face Models
INTENT_CLASSIFIER_MODEL=facebook/bart-large-mnli
SPAM_CLASSIFIER_MODEL=mrm8488/bert-tiny-finetuned-sms-spam-detection

# Processing Limits
MAX_AUDIO_LENGTH_SECONDS=300
MAX_TEXT_LENGTH=5000

# Logging
LOG_LEVEL=DEBUG
LOG_FILE=./logs/ai-backend.log

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
```

Create necessary directories:
```bash
mkdir -p logs models_cache credentials
```

Copy Google credentials (if using Cloud APIs):
```bash
cp /path/to/downloaded/google-credentials.json credentials/
```

Download NLTK data:
```bash
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
```

Pre-download Whisper model:
```bash
python -c "import whisper; whisper.load_model('base')"
```

### 6. Verify Setup

#### Check Redis
```bash
redis-cli ping
# Should return: PONG
```

#### Test Node.js Backend
```bash
cd backend
npm run dev
# Should start on port 3001
```

Open another terminal and test:
```bash
curl http://localhost:3001/health
# Should return: {"status":"healthy",...}
```

#### Test Python AI Backend
```bash
cd python-ai-backend
source venv/bin/activate
python app.py
# Should start on port 5000
```

Open another terminal and test:
```bash
curl http://localhost:5000/health
# Should return: {"status":"healthy",...}
```

#### Test Frontend
```bash
cd ..
# Simple HTTP server
python -m http.server 3000

# Or use Node http-server
npx http-server -p 3000
```

Open browser: http://localhost:3000

### 7. IDE Setup (VS Code)

#### Install Extensions

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension redhat.vscode-yaml
code --install-extension eamodio.gitlens
```

#### Configure Workspace Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": ["./backend"],
  "python.defaultInterpreterPath": "./python-ai-backend/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "**/node_modules": true
  }
}
```

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Node.js Backend",
      "program": "${workspaceFolder}/backend/src/server.js",
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/backend/.env"
    },
    {
      "type": "python",
      "request": "launch",
      "name": "Python AI Backend",
      "program": "${workspaceFolder}/python-ai-backend/app.py",
      "cwd": "${workspaceFolder}/python-ai-backend",
      "envFile": "${workspaceFolder}/python-ai-backend/.env",
      "python": "${workspaceFolder}/python-ai-backend/venv/bin/python"
    }
  ]
}
```

### 8. Development Workflow

#### Start All Services

Terminal 1 - Redis:
```bash
redis-server
```

Terminal 2 - Node.js Backend:
```bash
cd backend
npm run dev
```

Terminal 3 - Python AI Backend:
```bash
cd python-ai-backend
source venv/bin/activate
python app.py
```

Terminal 4 - Frontend:
```bash
python -m http.server 3000
```

#### Using Docker Compose (Alternative)

```bash
# Start all services
docker-compose up

# Or in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 9. Testing

#### API Testing with cURL

```bash
# Health checks
curl http://localhost:3001/health
curl http://localhost:5000/health

# Test OAuth (returns auth URL)
curl http://localhost:3001/api/auth/google

# Test text-to-speech (requires authentication)
curl -X POST http://localhost:5000/api/text-to-speech \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","language":"en-US"}' \
  --output test.mp3

# Test intent classification
curl -X POST http://localhost:5000/api/classify-intent \
  -H "Content-Type: application/json" \
  -d '{"text":"read my emails","language":"en-US"}'
```

#### Browser Testing

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Test voice commands:
   - Click microphone icon
   - Say "read inbox"
   - Verify response

#### Unit Tests

```bash
# Node.js tests
cd backend
npm test

# Python tests
cd python-ai-backend
pytest
```

### 10. Troubleshooting

#### Port Already in Use

```bash
# Find process using port
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

#### Redis Connection Error

```bash
# Check Redis is running
redis-cli ping

# If not running
brew services start redis  # macOS
sudo systemctl start redis  # Linux
redis-server  # Windows
```

#### Python Package Installation Issues

```bash
# Upgrade pip
pip install --upgrade pip

# Clear cache
pip cache purge

# Reinstall package
pip install --no-cache-dir package-name

# For macOS Apple Silicon issues
export ARCHFLAGS="-arch arm64"
pip install package-name
```

#### Google OAuth Not Working

- Verify redirect URI matches exactly (case-sensitive)
- Check credentials are not expired
- Ensure Gmail API is enabled
- Clear browser cookies
- Try incognito mode

#### Whisper Model Download Failed

```bash
# Manually download
python -c "import whisper; whisper.load_model('base', download_root='./models_cache')"

# Check disk space
df -h  # macOS/Linux
wmic logicaldisk get size,freespace,caption  # Windows

# Use smaller model
WHISPER_MODEL=tiny
```

### 11. Git Workflow

#### Initial Commit

```bash
git init
git add .
git commit -m "Initial commit: Voice-enabled email system"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

#### Feature Development

```bash
# Create feature branch
git checkout -b feature/new-voice-command

# Make changes
# ... edit files ...

# Commit
git add .
git commit -m "Add new voice command for archiving emails"

# Push
git push origin feature/new-voice-command

# Create pull request on GitHub
```

### 12. Environment Management

#### Multiple Environments

Create separate env files:
```bash
.env.development
.env.test
.env.production
```

Load appropriate env:
```bash
# Node.js
NODE_ENV=development node src/server.js

# Python
FLASK_ENV=development python app.py
```

#### Secrets Management

Never commit:
- `.env` files
- `credentials/*.json`
- API keys
- Passwords

Use `.gitignore`:
```gitignore
.env
.env.*
!.env.example
credentials/
*.json
!package.json
```

### 13. Performance Tips

#### Speed Up Development

1. **Use nodemon** (auto-restart)
```bash
npm install -g nodemon
nodemon src/server.js
```

2. **Cache Python packages**
```bash
pip install --cache-dir ~/.pip_cache -r requirements.txt
```

3. **Use smaller AI models**
```env
WHISPER_MODEL=tiny  # Faster, less accurate
```

4. **Disable unnecessary features**
```env
LOG_LEVEL=WARN  # Less verbose logging
```

### 14. Next Steps

- [ ] Configure IDE for your preferences
- [ ] Read API documentation
- [ ] Explore voice commands
- [ ] Review code structure
- [ ] Add custom features
- [ ] Write tests
- [ ] Optimize performance
- [ ] Deploy to staging

## Getting Help

- **Documentation**: Check `/docs` folder
- **Issues**: Create GitHub issue
- **Logs**: Check `backend/logs` and `python-ai-backend/logs`
- **Community**: Join Discord/Slack (if available)

---

**Happy coding! 🚀**
