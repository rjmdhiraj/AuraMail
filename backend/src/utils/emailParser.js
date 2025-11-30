/**
 * Email Parsing Utilities
 * Parse and format Gmail API responses
 */

import { Buffer } from 'buffer';

/**
 * Decode base64url encoded string
 */
export const decodeBase64Url = (str) => {
  if (!str) return '';
  return Buffer.from(str, 'base64url').toString('utf-8');
};

/**
 * Encode string to base64url
 */
export const encodeBase64Url = (str) => {
  if (!str) return '';
  return Buffer.from(str, 'utf-8').toString('base64url');
};

/**
 * Parse email headers
 */
export const parseHeaders = (headers) => {
  const result = {};
  
  if (!headers) return result;
  
  headers.forEach((header) => {
    const key = header.name.toLowerCase();
    result[key] = header.value;
  });
  
  return result;
};

/**
 * Extract attachments from Gmail message parts
 */
export const extractAttachments = (payload) => {
  const attachments = [];

  const getAttachments = (part) => {
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId,
      });
    }

    if (part.parts) {
      part.parts.forEach(getAttachments);
    }
  };

  getAttachments(payload);
  return attachments;
};

/**
 * Extract email body from Gmail message parts
 */
export const extractEmailBody = (payload) => {
  let body = {
    text: '',
    html: '',
  };

  const getBody = (part) => {
    // Check if this part has body data directly
    if (part.body?.data) {
      if (part.mimeType === 'text/plain') {
        if (!body.text) { // Only set if not already set (prefer first occurrence)
          body.text = decodeBase64Url(part.body.data);
        }
      } else if (part.mimeType === 'text/html') {
        if (!body.html) { // Only set if not already set
          body.html = decodeBase64Url(part.body.data);
        }
      }
    }

    // Recursively check parts
    if (part.parts && part.parts.length > 0) {
      part.parts.forEach(getBody);
    }
  };

  // Start extraction
  getBody(payload);

  // Fallback: If no body found, check if payload itself has data
  if (!body.text && !body.html && payload.body?.data) {
    if (payload.mimeType === 'text/html') {
      body.html = decodeBase64Url(payload.body.data);
    } else if (payload.mimeType === 'text/plain') {
      body.text = decodeBase64Url(payload.body.data);
    }
  }

  // If no plain text, try to extract from HTML
  if (!body.text && body.html) {
    // Strip HTML tags to create plain text version
    body.text = body.html
      .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }

  return body;
};

/**
 * Format Gmail message to simplified structure
 */
export const formatEmailMessage = (message) => {
  const headers = parseHeaders(message.payload.headers);
  const body = extractEmailBody(message.payload);
  const attachments = extractAttachments(message.payload);

  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds || [],
    snippet: message.snippet,
    internalDate: message.internalDate,
    from: headers.from || '',
    to: headers.to || '',
    subject: headers.subject || '(No Subject)',
    date: headers.date || '',
    body: body.html || body.text || '',
    htmlBody: body.html || '',
    textBody: body.text || '',
    attachments: attachments,
    hasAttachments: attachments.length > 0,
    isUnread: message.labelIds?.includes('UNREAD') || false,
    isStarred: message.labelIds?.includes('STARRED') || false,
    isImportant: message.labelIds?.includes('IMPORTANT') || false,
    size: message.sizeEstimate || 0,
  };
};

/**
 * Format email list response
 */
export const formatEmailList = (messages) => {
  return messages.map(formatEmailMessage);
};

/**
 * Create RFC 2822 formatted email for sending
 */
export const createRawEmail = ({ to, subject, body, from }) => {
  // Build headers array (filter out empty from)
  const headers = [
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `To: ${to}`,
    from ? `From: ${from}` : null,
    `Subject: ${subject}`,
  ].filter(h => h !== null);
  
  // RFC 2822 requires empty line between headers and body
  const email = headers.join('\r\n') + '\r\n\r\n' + (body || '');

  return encodeBase64Url(email);
};

/**
 * Extract email address from "Name <email@domain.com>" format
 */
export const extractEmailAddress = (emailString) => {
  if (!emailString) return '';
  
  const match = emailString.match(/<(.+?)>/);
  return match ? match[1] : emailString.trim();
};

/**
 * Parse email address into name and email
 */
export const parseEmailAddress = (emailString) => {
  if (!emailString) return { name: '', email: '' };
  
  const match = emailString.match(/^(.+?)\s*<(.+?)>$/);
  
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      email: match[2].trim(),
    };
  }
  
  return {
    name: '',
    email: emailString.trim(),
  };
};

export default {
  decodeBase64Url,
  encodeBase64Url,
  parseHeaders,
  extractAttachments,
  extractEmailBody,
  formatEmailMessage,
  formatEmailList,
  createRawEmail,
  extractEmailAddress,
  parseEmailAddress,
};
