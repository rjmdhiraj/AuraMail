/**
 * Email Controller
 * Handles Gmail API operations
 */

import { createOAuth2Client, getGmailClient } from '../config/google.js';
import {
  formatEmailMessage,
  formatEmailList,
  createRawEmail,
} from '../utils/emailParser.js';
import logger from '../utils/logger.js';

/**
 * Get Gmail client with user's credentials
 */
const getAuthenticatedGmailClient = (req) => {
  const oauth2Client = createOAuth2Client();
  // Use googleTokens (set by auth middleware) or fall back to session
  const tokens = req.googleTokens || (req.session && req.session.tokens);
  oauth2Client.setCredentials(tokens);
  return getGmailClient(oauth2Client);
};

/**
 * List emails from inbox
 */
export const listEmails = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { page = 1, limit = 50, labelIds = 'INBOX' } = req.query;

    const maxResults = Math.min(parseInt(limit), 100);
    const pageToken = page > 1 ? req.query.pageToken : undefined;

    // List messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: labelIds.split(','),
      maxResults,
      pageToken,
    });

    if (!response.data.messages) {
      return res.json({
        success: true,
        emails: [],
        nextPageToken: null,
        total: 0,
      });
    }

    // Fetch full message details
    const emailPromises = response.data.messages.map(async (message) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });
      return fullMessage.data;
    });

    const fullMessages = await Promise.all(emailPromises);
    const formattedEmails = formatEmailList(fullMessages);

    logger.info(`Listed ${formattedEmails.length} emails for ${req.user?.email || req.session?.userEmail}`);

    res.json({
      success: true,
      emails: formattedEmails,
      nextPageToken: response.data.nextPageToken || null,
      total: response.data.resultSizeEstimate || formattedEmails.length,
    });
  } catch (error) {
    logger.error('List emails error:', error);
    res.status(500).json({
      error: 'Failed to list emails',
      message: error.message,
    });
  }
};

/**
 * Get single email by ID
 */
export const getEmail = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { id } = req.params;

    const response = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });

    const formattedEmail = formatEmailMessage(response.data);

    logger.info(`Retrieved email ${id} for ${req.user?.email || req.session?.userEmail}`);

    res.json({
      success: true,
      email: formattedEmail,
    });
  } catch (error) {
    logger.error('Get email error:', error);
    res.status(error.code || 500).json({
      error: 'Failed to get email',
      message: error.message,
    });
  }
};

/**
 * Send email
 */
export const sendEmail = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { to, subject, body, from } = req.body;

    const rawEmail = createRawEmail({ to, subject, body, from });

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawEmail,
      },
    });

    logger.info(`Email sent by ${req.user?.email || req.session?.userEmail} to ${to}`);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: response.data.id,
    });
  } catch (error) {
    logger.error('Send email error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message,
    });
  }
};

/**
 * Delete email
 */
export const deleteEmail = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { id } = req.params;

    await gmail.users.messages.trash({
      userId: 'me',
      id,
    });

    logger.info(`Email ${id} deleted by ${req.user?.email || req.session?.userEmail}`);

    res.json({
      success: true,
      message: 'Email moved to trash',
    });
  } catch (error) {
    logger.error('Delete email error:', error);
    res.status(500).json({
      error: 'Failed to delete email',
      message: error.message,
    });
  }
};

/**
 * Modify email labels
 */
export const modifyLabels = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { id } = req.params;
    const { addLabelIds = [], removeLabelIds = [] } = req.body;

    const response = await gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody: {
        addLabelIds,
        removeLabelIds,
      },
    });

    logger.info(`Labels modified for email ${id} by ${req.user?.email || req.session?.userEmail}`);

    res.json({
      success: true,
      message: 'Labels updated successfully',
      labelIds: response.data.labelIds,
    });
  } catch (error) {
    logger.error('Modify labels error:', error);
    res.status(500).json({
      error: 'Failed to modify labels',
      message: error.message,
    });
  }
};

/**
 * Search emails
 */
export const searchEmails = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { q, maxResults = 20 } = req.query;

    const response = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: Math.min(parseInt(maxResults), 100),
    });

    if (!response.data.messages) {
      return res.json({
        success: true,
        emails: [],
        total: 0,
      });
    }

    // Fetch full message details
    const emailPromises = response.data.messages.map(async (message) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });
      return fullMessage.data;
    });

    const fullMessages = await Promise.all(emailPromises);
    const formattedEmails = formatEmailList(fullMessages);

    logger.info(`Search results: ${formattedEmails.length} emails for query "${q}"`);

    res.json({
      success: true,
      emails: formattedEmails,
      total: formattedEmails.length,
      query: q,
    });
  } catch (error) {
    logger.error('Search emails error:', error);
    res.status(500).json({
      error: 'Failed to search emails',
      message: error.message,
    });
  }
};

/**
 * Get user's labels
 */
export const getLabels = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);

    const response = await gmail.users.labels.list({
      userId: 'me',
    });

    res.json({
      success: true,
      labels: response.data.labels || [],
    });
  } catch (error) {
    logger.error('Get labels error:', error);
    res.status(500).json({
      error: 'Failed to get labels',
      message: error.message,
    });
  }
};

/**
 * Get drafts
 */
export const getDraft = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);

    const response = await gmail.users.drafts.list({
      userId: 'me',
    });

    res.json({
      success: true,
      drafts: response.data.drafts || [],
    });
  } catch (error) {
    logger.error('Get drafts error:', error);
    res.status(500).json({
      error: 'Failed to get drafts',
      message: error.message,
    });
  }
};

/**
 * Create draft
 */
export const createDraft = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { to, subject, body, from } = req.body;

    const rawEmail = createRawEmail({ to, subject, body, from });

    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: rawEmail,
        },
      },
    });

    logger.info(`Draft created by ${req.user?.email || req.session?.userEmail}`);

    res.json({
      success: true,
      message: 'Draft created successfully',
      draftId: response.data.id,
    });
  } catch (error) {
    logger.error('Create draft error:', error);
    res.status(500).json({
      error: 'Failed to create draft',
      message: error.message,
    });
  }
};

/**
 * Update draft
 */
export const updateDraft = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { id } = req.params;
    const { to, subject, body, from } = req.body;

    const rawEmail = createRawEmail({ to, subject, body, from });

    const response = await gmail.users.drafts.update({
      userId: 'me',
      id,
      requestBody: {
        message: {
          raw: rawEmail,
        },
      },
    });

    logger.info(`Draft ${id} updated by ${req.user?.email || req.session?.userEmail}`);

    res.json({
      success: true,
      message: 'Draft updated successfully',
      draftId: response.data.id,
    });
  } catch (error) {
    logger.error('Update draft error:', error);
    res.status(500).json({
      error: 'Failed to update draft',
      message: error.message,
    });
  }
};

/**
 * Delete draft
 */
export const deleteDraft = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { id } = req.params;

    await gmail.users.drafts.delete({
      userId: 'me',
      id,
    });

    logger.info(`Draft ${id} deleted by ${req.user?.email || req.session?.userEmail}`);

    res.json({
      success: true,
      message: 'Draft deleted successfully',
    });
  } catch (error) {
    logger.error('Delete draft error:', error);
    res.status(500).json({
      error: 'Failed to delete draft',
      message: error.message,
    });
  }
};

/**
 * Send draft
 */
export const sendDraft = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { id } = req.params;

    const response = await gmail.users.drafts.send({
      userId: 'me',
      requestBody: {
        id,
      },
    });

    logger.info(`Draft ${id} sent by ${req.user?.email || req.session?.userEmail}`);

    res.json({
      success: true,
      message: 'Draft sent successfully',
      messageId: response.data.id,
    });
  } catch (error) {
    logger.error('Send draft error:', error);
    res.status(500).json({
      error: 'Failed to send draft',
      message: error.message,
    });
  }
};

/**
 * Get attachment
 */
export const getAttachment = async (req, res) => {
  try {
    const gmail = getAuthenticatedGmailClient(req);
    const { messageId, attachmentId } = req.params;

    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    const attachmentData = Buffer.from(response.data.data, 'base64url');

    logger.info(`Attachment ${attachmentId} downloaded from message ${messageId} by ${req.user?.email || req.session?.userEmail}`);

    // Set headers for file download
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': attachmentData.length,
    });

    res.send(attachmentData);
  } catch (error) {
    logger.error('Get attachment error:', error);
    res.status(500).json({
      error: 'Failed to get attachment',
      message: error.message,
    });
  }
};

export default {
  listEmails,
  getEmail,
  sendEmail,
  deleteEmail,
  modifyLabels,
  searchEmails,
  getLabels,
  getDraft,
  createDraft,
  updateDraft,
  deleteDraft,
  sendDraft,
  getAttachment,
};
