/**
 * Google OAuth 2.0 Configuration
 * Gmail API integration setup
 */

import { google } from 'googleapis';

const SCOPES = (process.env.GMAIL_SCOPES || '').split(',').filter(Boolean);

if (SCOPES.length === 0) {
  SCOPES.push(
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  );
}

/**
 * Create OAuth2 client
 */
export const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

/**
 * Generate authorization URL
 */
export const getAuthUrl = (oauth2Client) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  });
};

/**
 * Get Gmail API client
 */
export const getGmailClient = (auth) => {
  return google.gmail({ version: 'v1', auth });
};

/**
 * Get user info
 */
export const getUserInfo = async (auth) => {
  const oauth2 = google.oauth2({ version: 'v2', auth });
  const { data } = await oauth2.userinfo.get();
  return data;
};

export default {
  SCOPES,
  createOAuth2Client,
  getAuthUrl,
  getGmailClient,
  getUserInfo,
};
