/**
 * Email Routes
 * Gmail API operations endpoints
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  validateEmailCompose,
  validateEmailSearch,
  validateEmailId,
  validateLabel,
  validatePagination,
} from '../middleware/validation.js';
import {
  listEmails,
  getEmail,
  sendEmail,
  deleteEmail,
  modifyLabels,
  searchEmails,
  getDraft,
  createDraft,
  updateDraft,
  deleteDraft,
  sendDraft,
  getLabels,
  getAttachment,
} from '../controllers/email.controller.js';

const router = express.Router();

// All email routes require authentication
router.use(authenticate);

// List emails
router.get('/', validatePagination, asyncHandler(listEmails));

// Search emails
router.get('/search', validateEmailSearch, asyncHandler(searchEmails));

// Get email labels
router.get('/labels', asyncHandler(getLabels));

// Get specific email
router.get('/:id', validateEmailId, asyncHandler(getEmail));

// Send email
router.post('/send', validateEmailCompose, asyncHandler(sendEmail));

// Delete email
router.delete('/:id', validateEmailId, asyncHandler(deleteEmail));

// Modify email labels (star, archive, mark as read, etc.)
router.patch('/:id/labels', validateEmailId, validateLabel, asyncHandler(modifyLabels));

// Draft operations
router.get('/drafts/list', asyncHandler(getDraft));
router.post('/drafts', validateEmailCompose, asyncHandler(createDraft));
router.put('/drafts/:id', validateEmailId, validateEmailCompose, asyncHandler(updateDraft));
router.delete('/drafts/:id', validateEmailId, asyncHandler(deleteDraft));
router.post('/drafts/:id/send', validateEmailId, asyncHandler(sendDraft));

// Get attachment
router.get('/:messageId/attachments/:attachmentId', asyncHandler(getAttachment));

export default router;
