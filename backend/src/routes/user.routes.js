/**
 * User Routes
 * User preferences and settings endpoints
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  getUserProfile,
  updateUserSettings,
  getUserSettings,
} from '../controllers/user.controller.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Get user profile
router.get('/profile', asyncHandler(getUserProfile));

// Get user settings
router.get('/settings', asyncHandler(getUserSettings));

// Update user settings
router.put('/settings', asyncHandler(updateUserSettings));

export default router;
