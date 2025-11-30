/**
 * AI Routes
 * Voice processing and AI operations endpoints
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { validateVoiceCommand } from '../middleware/validation.js';
import {
  processSpeechToText,
  processTextToSpeech,
  processVoiceCommand,
  detectSpam,
  classifyIntent,
} from '../controllers/ai.controller.js';

const router = express.Router();

// All AI routes require authentication and have stricter rate limiting
router.use(authenticate);
router.use(aiRateLimiter);

// Speech-to-text
router.post('/speech-to-text', validateVoiceCommand, asyncHandler(processSpeechToText));

// Text-to-speech
router.post('/text-to-speech', asyncHandler(processTextToSpeech));

// Voice command processing (includes intent classification)
router.post('/voice-command', validateVoiceCommand, asyncHandler(processVoiceCommand));

// Spam detection
router.post('/spam-detection', asyncHandler(detectSpam));

// Intent classification
router.post('/intent-classification', asyncHandler(classifyIntent));

export default router;
