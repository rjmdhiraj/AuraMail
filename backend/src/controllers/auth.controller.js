/**
 * Authentication Controller
 * Handles Google OAuth 2.0 authentication flow
 */

import { createOAuth2Client, getAuthUrl, getUserInfo } from '../config/google.js';
import { generateToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

/**
 * Initiate Google OAuth authentication
 */
export const initiateGoogleAuth = async (req, res) => {
  const oauth2Client = createOAuth2Client();
  const authUrl = getAuthUrl(oauth2Client);

  logger.info('Initiating Google OAuth flow');

  res.json({
    success: true,
    authUrl,
    message: 'Redirect user to this URL for authentication',
  });
};

/**
 * Handle Google OAuth callback
 */
export const handleGoogleCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Authorization code is required',
    });
  }

  try {
    const oauth2Client = createOAuth2Client();
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user information
    const userInfo = await getUserInfo(oauth2Client);

    // Store tokens and user info in session
    req.session.tokens = tokens;
    req.session.userId = userInfo.id;
    req.session.userEmail = userInfo.email;
    req.session.userName = userInfo.name;
    
    // Save session explicitly and wait for it
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.info(`User authenticated: ${userInfo.email}`);

    // Generate JWT for stateless authentication (optional)
    const jwtToken = generateToken({
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
    });
    
    // Get session ID to pass to frontend
    const sessionId = req.sessionID;

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/?auth=success&token=${jwtToken}&sid=${sessionId}`);
  } catch (error) {
    logger.error('OAuth callback error:', error);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/?auth=failed&error=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);

    const userInfo = await getUserInfo(oauth2Client);

    res.json({
      success: true,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified: userInfo.verified_email,
      },
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user information',
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res) => {
  try {
    const { tokens } = req.session;

    if (!tokens || !tokens.refresh_token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No refresh token available',
      });
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update session
    req.session.tokens = credentials;

    logger.info(`Token refreshed for user: ${req.session.userEmail}`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: credentials.expiry_date,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token Refresh Failed',
      message: 'Failed to refresh access token',
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req, res) => {
  const userEmail = req.session.userEmail;

  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({
        error: 'Logout Failed',
        message: 'Failed to destroy session',
      });
    }

    res.clearCookie('voice-email.sid');
    logger.info(`User logged out: ${userEmail}`);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
};

export default {
  initiateGoogleAuth,
  handleGoogleCallback,
  getCurrentUser,
  refreshToken,
  logout,
};
