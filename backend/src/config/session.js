/**
 * Session Configuration
 * Express session with Redis store for scalability
 */

import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import logger from '../utils/logger.js';

let redisClient;
let redisStore;

// Initialize Redis client with error handling
async function initRedis() {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 5000,
      },
      password: process.env.REDIS_PASSWORD || undefined,
      legacyMode: false,
    });

    redisClient.on('error', () => {
      // Silently ignore errors when Redis is not available
    });

    redisClient.on('connect', () => {
      logger.info('✓ Redis client connected');
    });

    await redisClient.connect();

    // Initialize Redis store
    redisStore = new RedisStore({
      client: redisClient,
      prefix: 'voice-email:sess:',
      ttl: 86400 * 7, // 7 days
    });
  } catch (error) {
    logger.warn('Redis not available, using memory store (not recommended for production)');
    redisStore = undefined;
  }
}

// Try to initialize Redis (non-blocking)
initRedis().catch(() => {
  logger.warn('Failed to connect to Redis, continuing with memory store');
});

// Session configuration
export const sessionMiddleware = session({
  store: redisStore,
  name: 'voice-email.sid',
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  },
});

export { redisClient };

export default {
  sessionMiddleware,
  redisClient,
};
