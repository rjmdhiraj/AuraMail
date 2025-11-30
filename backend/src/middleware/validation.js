/**
 * Request Validation Middleware
 * Input validation using express-validator
 */

import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation result checker
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

/**
 * Email composition validation
 */
export const validateEmailCompose = [
  body('to')
    .isEmail()
    .withMessage('Invalid email address'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 998 })
    .withMessage('Subject must be between 1 and 998 characters'),
  body('body')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Email body cannot be empty'),
  validate,
];

/**
 * Email search validation
 */
export const validateEmailSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Search query must be between 1 and 500 characters'),
  query('maxResults')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('maxResults must be between 1 and 100'),
  validate,
];

/**
 * Email ID validation
 */
export const validateEmailId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Email ID is required'),
  validate,
];

/**
 * Voice command validation
 */
export const validateVoiceCommand = [
  body('audio')
    .custom((value, { req }) => {
      if (!value && !req.body.text) {
        throw new Error('Either audio or text must be provided');
      }
      return true;
    }),
  body('language')
    .optional()
    .isIn(['en-US', 'en-GB', 'es-ES', 'fr-FR'])
    .withMessage('Invalid language code'),
  validate,
];

/**
 * Label validation
 */
export const validateLabel = [
  body('labelIds')
    .isArray({ min: 1 })
    .withMessage('labelIds must be a non-empty array'),
  body('labelIds.*')
    .isString()
    .withMessage('Each label ID must be a string'),
  validate,
];

/**
 * Pagination validation
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate,
];

export default {
  validate,
  validateEmailCompose,
  validateEmailSearch,
  validateEmailId,
  validateVoiceCommand,
  validateLabel,
  validatePagination,
};
