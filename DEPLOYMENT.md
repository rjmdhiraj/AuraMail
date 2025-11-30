# Voice Email System - Deployment Guide

## Architecture Overview

- **Frontend**: Static HTML/CSS/JS hosted on Vercel (free tier)
- **Backend**: Node.js API hosted on Render (free tier)

---

## 1. Backend Deployment (Render)

### Step 1: Prepare Repository
Make sure your code is pushed to GitHub.

### Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 3: Create Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `voice-email-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Step 4: Environment Variables
Add these in Render dashboard:

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-url.vercel.app

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-backend-url.onrender.com/auth/google/callback

# Secrets (generate strong random strings)
SESSION_SECRET=generate_a_64_char_random_string
JWT_SECRET=generate_another_64_char_random_string
JWT_EXPIRES_IN=7d

# Security
CORS_ORIGIN=https://your-frontend-url.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

# Gmail Scopes
GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.modify
```

### Step 5: Update Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client
4. Add to Authorized redirect URIs:
   - `https://your-backend-url.onrender.com/auth/google/callback`
5. Add to Authorized JavaScript origins:
   - `https://your-frontend-url.vercel.app`

---

## 2. Frontend Deployment (Vercel)

### Step 1: Update API URL
Edit `app.js` and update the API_BASE_URL:

```javascript
// Change this line in the constructor:
this.API_BASE_URL = 'https://your-backend-url.onrender.com';
```

### Step 2: Deploy to Vercel
Option A - Via Vercel CLI:
```bash
npm install -g vercel
cd /path/to/voice-email-system
vercel
```

Option B - Via GitHub:
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your repository
5. Set Root Directory to `.` (root)
6. Deploy

---

## 3. Post-Deployment Checklist

### Update URLs
After both services are deployed, update:

1. **Backend `.env`**: Set `FRONTEND_URL` and `CORS_ORIGIN` to your Vercel URL
2. **Frontend `app.js`**: Set `API_BASE_URL` to your Render URL
3. **Google Cloud Console**: Add production URLs to OAuth settings

### Test the Application
1. Visit your Vercel URL
2. Click "Login with Google"
3. Authorize the application
4. Test voice commands

### Generate Strong Secrets
Use this command to generate secure secrets:
```bash
openssl rand -hex 32
```

---

## 4. Free Tier Limitations

### Render Free Tier
- Service spins down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- 750 hours/month

### Vercel Free Tier
- 100GB bandwidth/month
- Unlimited static deployments
- No sleep/spin-down issues

---

## 5. Environment Variables Summary

### Backend (Render)
| Variable | Example Value |
|----------|---------------|
| NODE_ENV | production |
| PORT | 3001 |
| FRONTEND_URL | https://voice-email.vercel.app |
| GOOGLE_CLIENT_ID | xxx.apps.googleusercontent.com |
| GOOGLE_CLIENT_SECRET | GOCSPX-xxx |
| GOOGLE_REDIRECT_URI | https://voice-email-api.onrender.com/auth/google/callback |
| SESSION_SECRET | (64 char random string) |
| JWT_SECRET | (64 char random string) |
| CORS_ORIGIN | https://voice-email.vercel.app |
| COOKIE_SECURE | true |
| COOKIE_SAME_SITE | none |

### Frontend
Update `API_BASE_URL` in `app.js` to your Render backend URL.

---

## 6. Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` matches your frontend URL exactly
- Check `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`

### OAuth Redirect Issues
- Verify `GOOGLE_REDIRECT_URI` matches exactly in both Render env and Google Console
- Ensure your app is in "production" mode in Google Console (not testing)

### Voice Not Working
- Ensure site is served over HTTPS (both Vercel and Render provide this)
- Check browser microphone permissions

### Backend Slow on First Request
- This is normal for Render free tier (cold start)
- Consider upgrading to paid tier for always-on service
