/**
 * User Controller
 * Handles user profile and settings
 */

import { getUserInfo, createOAuth2Client } from '../config/google.js';
import logger from '../utils/logger.js';

/**
 * Get user profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);

    const userInfo = await getUserInfo(oauth2Client);

    res.json({
      success: true,
      profile: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified: userInfo.verified_email,
        locale: userInfo.locale,
      },
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      message: error.message,
    });
  }
};

/**
 * Get user settings
 */
export const getUserSettings = async (req, res) => {
  try {
    // In a real application, these would be stored in a database
    // For now, return default settings or from session
    const settings = req.session.userSettings || {
      fontSize: 16,
      speechRate: 1.0,
      speechVolume: 0.8,
      darkMode: false,
      highContrast: false,
      voiceLanguage: 'en-US',
      autoReadEmails: true,
      confirmActions: true,
      emailsPerPage: 50,
      notifications: {
        newEmail: true,
        mentions: true,
        replies: true,
      },
    };

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    logger.error('Get user settings error:', error);
    res.status(500).json({
      error: 'Failed to get user settings',
      message: error.message,
    });
  }
};

/**
 * Update user settings
 */
export const updateUserSettings = async (req, res) => {
  try {
    const newSettings = req.body;

    // Validate settings
    const validKeys = [
      'fontSize',
      'speechRate',
      'speechVolume',
      'darkMode',
      'highContrast',
      'voiceLanguage',
      'autoReadEmails',
      'confirmActions',
      'emailsPerPage',
      'notifications',
    ];

    const settings = {};
    Object.keys(newSettings).forEach(key => {
      if (validKeys.includes(key)) {
        settings[key] = newSettings[key];
      }
    });

    // Store in session (in production, save to database)
    req.session.userSettings = {
      ...req.session.userSettings,
      ...settings,
    };

    logger.info(`Settings updated for ${req.session.userEmail}`);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: req.session.userSettings,
    });
  } catch (error) {
    logger.error('Update user settings error:', error);
    res.status(500).json({
      error: 'Failed to update user settings',
      message: error.message,
    });
  }
};

export default {
  getUserProfile,
  getUserSettings,
  updateUserSettings,
};
