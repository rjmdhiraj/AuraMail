/**
 * JWT Token Utilities
 * Token generation and verification
 */

import jwt from 'jsonwebtoken';

/**
 * Get JWT secret dynamically
 */
const getJWTSecret = () => process.env.JWT_SECRET || 'change-this-secret';
const getJWTExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: getJWTExpiresIn(),
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJWTSecret());
  } catch (error) {
    return null;
  }
};

/**
 * Decode JWT token without verification
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate refresh token (longer expiration)
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d',
  });
};

export default {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
};
