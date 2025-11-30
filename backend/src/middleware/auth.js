/**
 * Authentication Middleware
 * Verifies user session and Google OAuth tokens
 */

import jwt from 'jsonwebtoken';
import { createOAuth2Client } from '../config/google.js';
import logger from '../utils/logger.js';

/**
 * Verify user is authenticated via session
 */
export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    });
  }

  // Check if tokens exist
  if (!req.session.tokens) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication tokens',
    });
  }

  next();
};

/**
 * Verify JWT token (alternative to session)
 */
export const verifyJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('JWT verification error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Refresh expired Google access token
 */
export const refreshGoogleToken = async (req, res, next) => {
  try {
    // Get tokens from req.googleTokens (set by authenticate) or session
    const tokens = req.googleTokens || (req.session && req.session.tokens);
    
    if (!tokens || !tokens.refresh_token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No refresh token available. Please log in again.',
      });
    }

    // Check if access token is expired
    const expiryDate = tokens.expiry_date;
    const now = Date.now();

    if (expiryDate && now < expiryDate - 5 * 60 * 1000) {
      // Token still valid (with 5 minute buffer)
      req.googleTokens = tokens; // Ensure tokens are available for controllers
      return next();
    }

    // Refresh the token
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update tokens for this request
    req.googleTokens = credentials;
    
    // Also update session if available
    if (req.session) {
      req.session.tokens = credentials;
    }
    
    logger.info(`Access token refreshed for user: ${req.user?.email || req.session?.userId}`);
    next();
  } catch (error) {
    logger.error('Token refresh error:', error);
    
    // Clear invalid session if it exists
    if (req.session && typeof req.session.destroy === 'function') {
      req.session.destroy();
    }
    
    return res.status(401).json({
      error: 'Authentication Failed',
      message: 'Failed to refresh access token. Please log in again.',
    });
  }
};

/**
 * Combined authentication middleware
 * Checks JWT token or session and refreshes tokens if needed
 */
export const authenticate = async (req, res, next) => {
  // Try JWT authentication first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      
      // Check if JWT contains Google tokens (stateless mode)
      if (decoded.tokens) {
        // Use tokens from JWT directly - store in req.googleTokens
        req.googleTokens = decoded.tokens;
        return refreshGoogleToken(req, res, next);
      }
      
      // Check if we have tokens in session for this user (legacy mode)
      if (req.session && req.session.userId === decoded.id && req.session.tokens) {
        // Use tokens from session
        req.googleTokens = req.session.tokens;
        return refreshGoogleToken(req, res, next);
      } else {
        // No tokens available, user needs to re-authenticate
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session expired. Please sign in again.',
        });
      }
    } catch (error) {
      logger.error('JWT verification error:', error);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  }
  
  // Fall back to session-based auth
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    });
  }

  // Check if tokens exist
  if (!req.session.tokens) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication tokens',
    });
  }
  
  // Set googleTokens from session
  req.googleTokens = req.session.tokens;
  
  // Refresh tokens if needed
  return refreshGoogleToken(req, res, next);
};

export default {
  requireAuth,
  verifyJWT,
  refreshGoogleToken,
  authenticate,
};
