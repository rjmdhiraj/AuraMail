/**
 * Authentication Routes
 * Google OAuth 2.0 authentication endpoints
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import {
  initiateGoogleAuth,
  handleGoogleCallback,
  logout,
  getCurrentUser,
  refreshToken,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Initiate Google OAuth flow
router.get('/google', authRateLimiter, asyncHandler(initiateGoogleAuth));

// Google OAuth callback
router.get('/google/callback', authRateLimiter, asyncHandler(handleGoogleCallback));

// Get current authenticated user
router.get('/me', requireAuth, asyncHandler(getCurrentUser));

// Refresh access token
router.post('/refresh', requireAuth, asyncHandler(refreshToken));

// Logout
router.post('/logout', requireAuth, asyncHandler(logout));

export default router;
