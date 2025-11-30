/**
 * Error Handling Middleware
 * Centralized error handling with logging
 */

import logger from '../utils/logger.js';

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values(err.errors).map(e => e.message);
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service Unavailable';
    details = 'Unable to connect to required service';
  }

  // Google API errors
  if (err.code && err.code >= 400 && err.code < 600) {
    statusCode = err.code;
    message = err.message || 'Google API Error';
  }

  // Don't leak error details in production
  const response = {
    error: message,
    timestamp: new Date().toISOString(),
    path: req.url,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = details;
  } else if (details) {
    response.details = details;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found handler
 */
export const notFound = (req, res, next) => {
  const error = new APIError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

export default {
  APIError,
  errorHandler,
  asyncHandler,
  notFound,
};
