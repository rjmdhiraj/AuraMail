# Voice Email System - Development Log

## Overview
This document tracks all the problems encountered during development and their solutions.

---

## Problem 1: Sent/Spam/Drafts Folders Showing Empty

### Issue
- Only inbox emails were displaying
- Sent, spam, and drafts folders showed 0 emails
- Gmail API was only fetching INBOX by default

### Root Cause
- The `switchFolder()` function only filtered existing emails array
- No API calls were made to fetch emails from specific Gmail labels
- Backend supported `labelIds` parameter but frontend wasn't using it

### Solution
1. Modified `switchFolder()` to be async and fetch emails on-demand
2. Added label mapping: `inbox→INBOX`, `sent→SENT`, `spam→SPAM`, `drafts→DRAFT`, `trash→TRASH`
3. Made API call with specific labelId: `GET /api/emails?labelIds=SENT&limit=50`
4. Cached fetched emails to avoid re-fetching on subsequent visits
5. Show loading overlay during fetch

**Files Changed:**
- `app.js` - Lines 1137-1145 (switchFolder function)

---

## Problem 2: Email List Showing "From" Instead of "To" for Sent/Drafts

### Issue
- Sent and draft emails showed the sender's email (you) instead of recipient
- Confusing to see your own email in the "from" field for sent items

### Root Cause
- Email list always displayed `email.from` field
- No logic to differentiate between inbox and sent folders

### Solution
1. Added conditional display logic in `createEmailListItem()`
2. Check if folder is 'sent' or 'drafts'
3. Display `To: ${email.to}` for sent/drafts, `From: ${email.from}` for others
4. Updated ARIA labels for accessibility
5. Added `to` field to email mapping in both `fetchRealEmails()` and `switchFolder()`

**Files Changed:**
- `app.js` - Lines 1284-1294 (createEmailListItem), Lines 1323-1335 (getEmailAriaLabel)
- `app.js` - Lines 994-1006 (fetchRealEmails mapping), Lines 1175-1187 (switchFolder mapping)

---

## Problem 3: No Attachment Support

### Issue
- Emails with attachments showed generic badge but no download functionality
- No way to view or download email attachments
- HTML emails not rendering properly

### Root Cause
- Backend wasn't extracting attachment metadata
- No download endpoint for attachments
- Frontend had no attachment rendering logic

### Solution

#### Backend Changes:
1. **emailParser.js**: Added `extractAttachments()` function
   - Extracts filename, mimeType, size, attachmentId from email parts
   - Recursively searches through nested parts

2. **emailParser.js**: Updated `formatEmailMessage()`
   - Added `attachments` array
   - Added `htmlBody` and `textBody` fields separately
   - Changed `hasAttachments` to check actual array length

3. **email.controller.js**: Added `getAttachment()` endpoint
   - Downloads attachment using Gmail API
   - Returns binary data with proper headers
   - Route: `GET /api/emails/:messageId/attachments/:attachmentId`

#### Frontend Changes:
1. Added `renderAttachments()` function
   - Displays list of attachments with filename and size
   - Creates download buttons for each attachment
   - Shows size in KB/MB format

2. Added `downloadAttachment()` function
   - Fetches attachment from backend
   - Creates blob and triggers download
   - Shows loading overlay and success message

3. Updated email mapping to include `attachments`, `htmlBody`, `textBody`

**Files Changed:**
- `backend/src/utils/emailParser.js` - Lines 65-93, 95-123
- `backend/src/controllers/email.controller.js` - Lines 425-458
- `backend/src/routes/email.routes.js` - Added attachment route
- `app.js` - Lines 2074-2152 (renderAttachments, downloadAttachment)
- `style.css` - Lines 1175-1234 (attachment styles)

---

## Problem 4: HTML Emails Not Rendering Properly

### Issue
- Marketing emails (PicsArt, Replit, Croma) showed as raw HTML with inline styles
- Links showed as `<https://example.com>` instead of clickable links
- Complex HTML with CSS not displaying correctly

### Root Cause
1. Backend was setting `body` to plain text first: `body: body.text || body.html`
2. Frontend had weak HTML detection (only checked if htmlBody exists)
3. No HTML sanitization or secure rendering
4. Plain text emails had URLs but they weren't clickable

### Solution

#### Backend Fix:
1. Changed `formatEmailMessage()` to prioritize HTML: `body: body.html || body.text`
2. Improved `extractEmailBody()` to handle complex nested structures
3. Added fallback checks for payload.body.data directly
4. Better plain text extraction from HTML (removes style/script tags)

#### Frontend Fix:
1. **HTML Email Rendering**:
   - Created iframe for isolated HTML rendering with `sandbox="allow-same-origin"`
   - Prevents CSS conflicts with main app
   - Auto-resizes iframe to content height
   - Supports dark mode with dynamic colors

2. **HTML Sanitization**:
   - Enhanced `sanitizeHTML()` function
   - Removes `<script>` tags and event handlers (onclick, onload, etc.)
   - Removes forms, inputs, buttons
   - Blocks javascript: and data:text/html URLs
   - Keeps inline styles and `<style>` tags for proper rendering
   - Makes all links open in new tab with security attributes
   - Limits image and table widths to 100%

3. **Plain Text Enhancement**:
   - Added `linkifyText()` function
   - Converts URLs to clickable links with regex
   - Converts email addresses to mailto: links
   - Preserves formatting and line breaks
   - HTML escapes text first for security

4. **Improved Detection**:
   - Check if htmlBody contains `<` tags
   - Compare htmlBody length vs textBody length
   - Console logging for debugging

**Files Changed:**
- `backend/src/utils/emailParser.js` - Lines 65-102 (extractEmailBody), Line 114 (formatEmailMessage)
- `app.js` - Lines 1407-1511 (openEmail with iframe rendering)
- `app.js` - Lines 2030-2104 (sanitizeHTML with security)
- `app.js` - Lines 2028-2058 (linkifyText function)
- `style.css` - Lines 1175-1194 (email-body styles with iframe support)

---

## Problem 5: Console Debugging Showed htmlBody Empty

### Issue
- Console showed: `Email htmlBody length: 0`
- Console showed: `Email textBody length: 1005`
- Email rendering as plain text instead of HTML

### Root Cause
- Gmail API was returning text/plain version only for some emails
- Backend extraction wasn't checking all possible MIME part locations
- Some emails genuinely don't have HTML versions

### Solution
1. Improved backend extraction with better recursion
2. Added fallback to check `payload.body.data` directly
3. Better plain text to HTML stripping (removes style/script tags)
4. Frontend now makes plain text emails with URLs clickable using `linkifyText()`

**Result:**
- HTML emails (with actual HTML) render in iframe
- Plain text emails with URLs show clickable links
- Both types display properly based on content

---

## Technical Stack Summary

### Frontend
- Vanilla JavaScript
- Web Speech API (voice recognition and synthesis)
- Python HTTP Server (port 3000)
- Bootstrap 5 for UI components
- Custom CSS with dark mode support

### Backend
- Node.js with Express (port 3001)
- Google OAuth 2.0 authentication
- Gmail API (googleapis library)
- JWT tokens + Express sessions
- Environment variables for secrets

### Key Features Implemented
✅ Real Gmail integration with OAuth 2.0
✅ Fetch emails from all folders (inbox, sent, spam, drafts, trash)
✅ Send emails via Gmail API
✅ Delete emails (moves to trash)
✅ Download attachments with size display
✅ Render HTML emails in secure iframe
✅ Clickable links in plain text emails
✅ Dark mode support for email content
✅ Voice commands and screen reader support
✅ Responsive design

---

## Environment Configuration

### Required Environment Variables (.env)
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
PORT=3001
```

### Google Cloud Console Setup
1. Enable Gmail API
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
4. Add authorized JavaScript origin: `http://localhost:3000`
5. Required scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`

---

## Running the Application

### Start Backend
```bash
cd backend
node src/server.js
```

### Start Frontend
```bash
python3 -m http.server 3000
```

### Access
Open browser: `http://localhost:3000`

---

## Future Improvements

### Potential Enhancements
- [ ] Add email composition with rich text editor
- [ ] Implement email search functionality
- [ ] Add folder management (create/delete custom labels)
- [ ] Support for email threads/conversations
- [ ] Draft auto-save functionality
- [ ] Email templates for common responses
- [ ] Calendar integration for meeting emails
- [ ] Attachment preview (PDF, images)
- [ ] Bulk operations (mark all as read, delete multiple)
- [ ] Email filtering and rules
- [ ] Offline support with service workers

### Performance Optimizations
- [ ] Implement pagination for large email lists
- [ ] Cache email content in localStorage
- [ ] Lazy load images in HTML emails
- [ ] Virtual scrolling for email list
- [ ] Debounce voice recognition events

### Security Enhancements
- [ ] Content Security Policy headers
- [ ] Rate limiting on API endpoints
- [ ] Input validation middleware
- [ ] XSS protection for user-generated content
- [ ] CSRF token implementation

---

## Debugging Tips

### Check if Backend is Running
```bash
curl http://localhost:3001/health
```

### Check Gmail API Response
```bash
# View backend logs for email structure
tail -f backend/logs/app.log
```

### Frontend Console Debugging
- Open browser DevTools (F12)
- Check Network tab for API calls
- Look for console.log messages showing email structure
- Verify htmlBody and textBody lengths

### Common Issues
1. **401 Unauthorized**: Re-authenticate with Google OAuth
2. **Empty folders**: Check labelIds parameter in API call
3. **HTML not rendering**: Check console for htmlBody content
4. **Attachments not downloading**: Verify attachment route in backend

---

## Lessons Learned

1. **Gmail API Structure**: Emails can have deeply nested MIME parts, requiring recursive extraction
2. **Security First**: Always sanitize HTML content, use iframes with sandbox attribute
3. **User Experience**: Show loading states, provide clear error messages, support both HTML and plain text
4. **Testing**: Use console.log debugging to understand actual data structure from API
5. **Accessibility**: Proper ARIA labels, voice command support, screen reader compatibility

---

Last Updated: November 22, 2025
