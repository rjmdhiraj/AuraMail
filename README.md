# Voice-Enabled Email System

Production-ready, voice-controlled email system designed for visually impaired and partially sighted users. Built with enterprise-grade architecture, full accessibility compliance, and real Gmail integration.

## 🌟 Features

### ♿ Accessibility First
- **WCAG 2.1 AAA Compliant** - Full screen reader support
- **Dark Mode** - Persistent theme with CSS variables
- **Keyboard Navigation** - Complete keyboard-only operation
- **ARIA Live Regions** - Real-time voice feedback
- **High Contrast Mode** - Enhanced visibility
- **Adjustable Font Sizes** - Customizable text scaling

### 🎤 Voice Control
- **Speech Recognition** - Web Speech API for voice commands
- **Text-to-Speech** - Web Speech Synthesis API for audio feedback
- **Natural Language Commands** - Context-aware command understanding
- **Real-time Feedback** - Instant voice responses
- **Dictation Mode** - Voice-to-text email composition

### 📧 Email Management
- **Gmail Integration** - Full Gmail API support via OAuth 2.0
- **Real-time Email Sync** - Fetch emails from all folders (inbox, sent, spam, drafts, trash)
- **Send & Delete** - Full email management synced with Gmail
- **HTML Email Rendering** - Secure iframe rendering with sanitization
- **Attachment Support** - Download email attachments with size display
- **Smart Folder Navigation** - On-demand folder loading with label-based filtering

### 🏗️ Architecture
- **Node.js Backend** - Express server with Gmail API integration
- **Frontend** - Vanilla JavaScript with Web Speech API
- **JWT Authentication** - Secure token-based auth
- **Session Management** - Express sessions with OAuth tokens
- **Responsive Design** - Bootstrap 5 UI framework

## 📁 Project Structure

```
voice-email-system/
├── index.html                 # Frontend HTML with ARIA
├── style.css                  # Accessible CSS with dark mode
├── app.js                     # Frontend JavaScript with voice controls
├── DEVELOPMENT_LOG.md         # Detailed development history
│
└── backend/                   # Node.js Backend
    ├── src/
    │   ├── server.js         # Express server entry point
    │   ├── config/           # Configuration files
    │   │   ├── security.js   # CORS & Helmet setup
    │   │   ├── session.js    # Session config
    │   │   └── google.js     # Google OAuth config
    │   ├── controllers/      # Request handlers
    │   │   ├── auth.controller.js
    │   │   └── email.controller.js
    │   ├── routes/           # API routes
    │   │   ├── auth.routes.js
    │   │   └── email.routes.js
    │   ├── middleware/       # Express middleware
    │   │   ├── auth.js
    │   │   ├── errorHandler.js
    │   │   └── validation.js
    │   └── utils/            # Utility functions
    │       ├── logger.js
    │       ├── jwt.js
    │       └── emailParser.js
    ├── package.json
    ├── .env.example
    └── .gitignore
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.x (for running frontend server)
- Google Cloud Platform account
- Gmail API credentials

### 1. Clone Repository

```bash
git clone <repository-url>
cd voice-email-system
```

### 2. Setup Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
6. Add authorized JavaScript origin: `http://localhost:3000`
7. Required scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`

### 3. Setup Node.js Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Secrets (generate with: openssl rand -base64 32)
SESSION_SECRET=your_generated_session_secret
JWT_SECRET=your_generated_jwt_secret

# Server
PORT=3001
NODE_ENV=development
```

### 4. Run the Application

Terminal 1 - Node.js Backend:
```bash
cd backend
node src/server.js
```

Terminal 2 - Frontend:
```bash
cd ..
python3 -m http.server 3000
```

### 5. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

Sign in with your Google account to start managing emails!

## 📖 API Documentation

### Authentication Endpoints

#### `GET /api/auth/google`
Initiate Google OAuth flow
```json
Response: {
  "success": true,
  "authUrl": "https://accounts.google.com/..."
}
```

#### `GET /api/auth/google/callback`
OAuth callback (redirects to frontend)

#### `GET /api/auth/me`
Get current user
```json
Response: {
  "success": true,
  "user": {
    "id": "123",
    "email": "user@gmail.com",
    "name": "User Name"
  }
}
```

#### `POST /api/auth/logout`
Logout user

### Email Endpoints

#### `GET /api/emails`
List emails from specific folder
```
Query params: 
  - page: Page number (default: 1)
  - limit: Emails per page (default: 50, max: 100)
  - labelIds: Gmail label (INBOX, SENT, SPAM, DRAFT, TRASH)

Response: { 
  success: true,
  emails: [...],
  nextPageToken: "token",
  total: 100
}
```

#### `GET /api/emails/:id`
Get single email with full content

#### `POST /api/emails/send`
Send email via Gmail API
```json
Request: {
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "body": "Email body text"
}
Response: {
  "success": true,
  "message": "Email sent successfully",
  "messageId": "abc123"
}
```

#### `DELETE /api/emails/:id`
Delete email (moves to trash)
```json
Response: {
  "success": true,
  "message": "Email moved to trash"
}
```

#### `GET /api/emails/:messageId/attachments/:attachmentId`
Download email attachment
```
Returns: Binary file data with appropriate headers
```

#### `GET /api/emails/search?q=query`
Search emails using Gmail search syntax

#### `PATCH /api/emails/:id/labels`
Modify email labels (star, mark read, etc.)
```json
Request: {
  "addLabelIds": ["STARRED"],
  "removeLabelIds": ["UNREAD"]
}
```

#### `GET /api/emails/labels`
Get all Gmail labels for the user

### Authentication Endpoints

#### `GET /api/auth/google`
Initiates Google OAuth 2.0 flow

#### `GET /api/auth/google/callback`
OAuth callback handler

#### `POST /api/auth/logout`
Logs out user and clears session

#### `GET /api/auth/user`
Returns current authenticated user info

## 🎙️ Voice Commands

The application uses the Web Speech API for voice recognition and synthesis. All voice commands are processed in the browser.

### Navigation Commands
- "read inbox" - Switch to inbox folder
- "show sent" - Switch to sent folder
- "show drafts" - Switch to drafts folder
- "show spam" - Switch to spam folder
- "show trash" - Switch to trash folder
- "compose email" - Start new email composition
- "go back" - Return to previous screen
- "help" - Show help guide

### Email Operations
- "read email" - Read current email aloud using text-to-speech
- "reply" - Open reply form
- "forward" - Open forward form
- "delete" - Move email to trash
- "mark as spam" - Move email to spam folder
- "next email" / "previous email" - Navigate email list
- "open email [number]" - Open specific email by list number

### Email Composition
- "start dictating" - Begin voice input (activates speech recognition)
- "stop dictating" - End voice input
- "send email" - Send composed email
- "cancel message" - Discard draft and return to inbox
- "add recipient [email]" - Add email address to recipient field

### System Commands
- "repeat" - Repeat last voice announcement

## 🔐 Security Best Practices

### Production Checklist

1. **Environment Variables**
   - Generate strong secrets: `openssl rand -base64 32`
   - Never commit `.env` files
   - Use environment-specific configs

2. **HTTPS/TLS**
   - Enable HTTPS in production
   - Use Let's Encrypt certificates
   - Set `COOKIE_SECURE=true`

3. **CORS Configuration**
   - Set specific `CORS_ORIGIN`
   - Remove wildcard origins
   - Validate redirect URIs

4. **Session Security**
   - Use secure session secrets
   - Set secure cookie flags
   - Implement session expiration

5. **API Security**
   - Validate all inputs
   - Sanitize HTML email content (using sanitizeHTML function)
   - Use Gmail API rate limiting
   - Implement request throttling

6. **Email Content Security**
   - HTML emails rendered in sandboxed iframes (`sandbox="allow-same-origin"`)
   - JavaScript and event handlers stripped from HTML content
   - External resources (scripts, forms) removed
   - URLs validated and forced to open in new tabs with security attributes

### Implemented Security Features

- **HTML Sanitization**: Removes `<script>` tags, event handlers, forms, and dangerous URLs
- **Iframe Sandboxing**: Isolates HTML email content from main application
- **XSS Protection**: HTML escaping for user input and plain text emails
- **OAuth 2.0**: Secure authentication with Google
- **CSRF Protection**: Express session with secure cookie settings

## 🚢 Deployment

### Frontend (Static Hosting)

Deploy to any static hosting service:
- **Vercel**: Connect repo, deploy root directory
- **Netlify**: Connect repo, publish directory: `/`
- **GitHub Pages**: Push to `gh-pages` branch

### Backend (Node.js)

**Render**:
1. Connect GitHub repository
2. Create new Web Service
3. Settings:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node src/server.js`
   - Add environment variables from `.env.example`
   - Set `FRONTEND_URL` to your frontend domain

**Google Cloud Run**:
```bash
cd backend
gcloud builds submit --tag gcr.io/PROJECT_ID/voice-email-backend
gcloud run deploy voice-email-backend \
  --image gcr.io/PROJECT_ID/voice-email-backend \
  --platform managed
```

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
cd python-ai-backend
fly launch

# Deploy
fly deploy
```

`fly.toml`:
```toml
app = "voice-email-ai"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "5000"

[[services]]
  internal_port = 5000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
  
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/voice-email-backend
gcloud builds submit --tag gcr.io/PROJECT_ID/voice-email-ai

# Deploy
gcloud run deploy voice-email-backend \
  --image gcr.io/PROJECT_ID/voice-email-backend \

## 🧪 Testing

### Manual Testing

1. **Authentication Flow**
   - Open `http://localhost:3000`
   - Click "Sign in with Google"
   - Verify successful redirect and email loading

2. **Email Operations**
   - Navigate folders (inbox, sent, drafts, spam, trash)
   - Open emails and verify HTML/plain text rendering
   - Test attachments download
   - Send, reply, forward emails
   - Delete emails

3. **Voice Commands**
   - Enable microphone permissions
   - Test voice recognition: "read inbox", "compose email"
   - Test voice synthesis: "read email" command
   - Verify voice feedback for actions

### API Testing

```bash
# Health check
curl http://localhost:3001/health

# Test authentication (requires valid session)
curl http://localhost:3001/api/auth/user \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Test email list
curl http://localhost:3001/api/emails \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

## 🐛 Troubleshooting

### OAuth Errors
- Verify redirect URI matches: `http://localhost:3001/api/auth/google/callback`
- Check Google Cloud Console > APIs & Services > Credentials
- Ensure Gmail API is enabled

### Voice Recognition Not Working
- Check microphone permissions in browser settings
- Verify HTTPS (required for Web Speech API in production)
- Try Chrome/Edge (best Web Speech API support)

### Emails Not Loading
- Check browser console for errors
- Verify backend is running on port 3001
- Check authentication token in localStorage
- Review Gmail API quota limits in Google Cloud Console

### HTML Emails Not Rendering
- Check browser console for iframe errors
- Verify `htmlBody` field is populated in API response
- Check Content Security Policy settings

For more detailed troubleshooting, see [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md).

## 📝 Implementation Details

### Email Rendering Pipeline

**HTML Emails**:
1. Backend extracts HTML from `text/html` MIME parts via `extractEmailBody()`
2. Frontend receives `htmlBody` field in email object
3. `sanitizeHTML()` function removes dangerous content (scripts, event handlers, forms)
4. Content rendered in sandboxed iframe with `sandbox="allow-same-origin"`
5. Dynamic dark mode styles injected based on user preference
6. Iframe auto-resizes to content height

**Plain Text Emails**:
1. Backend extracts text from `text/plain` MIME parts
2. Frontend receives `textBody` field
3. `linkifyText()` function converts URLs and email addresses to clickable links
4. HTML escaping prevents XSS attacks
5. Text displayed in styled `<pre>` element

### Attachment Handling

1. Backend `extractAttachments()` finds parts with `filename` or `Content-Disposition: attachment`
2. Metadata stored: filename, mimeType, size, attachmentId
3. Frontend displays attachment list with formatted sizes (KB/MB)
4. Download triggered via `GET /api/emails/:messageId/attachments/:attachmentId`
5. Backend uses Gmail API `attachments.get()` to fetch binary data
6. Frontend creates blob and triggers browser download

### Voice Command Processing

1. Web Speech API `SpeechRecognition` captures user voice
2. Transcript parsed for command keywords (inbox, sent, compose, delete, etc.)
3. Commands mapped to functions: `switchFolder()`, `composeEmail()`, `deleteEmail()`, etc.
4. Actions executed immediately
5. Feedback provided via `SpeechSynthesis` text-to-speech
6. All processing happens client-side (no backend AI required)

### Folder Navigation

1. User clicks folder or uses voice command
2. `switchFolder()` checks cache for existing emails
3. If empty, fetches from Gmail API with labelIds parameter (INBOX, SENT, DRAFT, SPAM, TRASH)
4. Results cached in memory to avoid redundant API calls
5. Email list updated with proper sender/recipient display logic

## 📝 License

MIT License - feel free to use for any purpose

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📧 Support

For issues or questions:
- Create a GitHub issue
- Check [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) for known issues
- Review troubleshooting guide above

## 🙏 Acknowledgments

- **Google Gmail API** - Email operations and OAuth 2.0 authentication
- **Web Speech API** - Browser-native voice recognition and synthesis
- **Express.js** - Backend server framework
- **googleapis** - Node.js library for Gmail API integration

---

**Built with ♿ accessibility in mind**
