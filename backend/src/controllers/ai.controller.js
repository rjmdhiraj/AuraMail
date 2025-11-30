/**
 * AI Controller
 * Handles AI/NLP operations via Python backend
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000';

/**
 * Process speech-to-text
 */
export const processSpeechToText = async (req, res) => {
  try {
    const { audio, language = 'en-US' } = req.body;

    const response = await axios.post(`${AI_SERVICE_URL}/api/speech-to-text`, {
      audio,
      language,
    }, {
      timeout: 30000, // 30 second timeout for AI processing
    });

    logger.info(`Speech-to-text processed for ${req.session.userEmail}`);

    res.json({
      success: true,
      text: response.data.text,
      confidence: response.data.confidence,
      language: response.data.language,
    });
  } catch (error) {
    logger.error('Speech-to-text error:', error);
    res.status(500).json({
      error: 'Speech-to-text failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Process text-to-speech
 */
export const processTextToSpeech = async (req, res) => {
  try {
    const { text, language = 'en-US', voice = 'default' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required',
      });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/api/text-to-speech`, {
      text,
      language,
      voice,
    }, {
      timeout: 30000,
      responseType: 'arraybuffer',
    });

    logger.info(`Text-to-speech processed for ${req.session.userEmail}`);

    // Return audio file
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': response.data.length,
    });
    res.send(response.data);
  } catch (error) {
    logger.error('Text-to-speech error:', error);
    res.status(500).json({
      error: 'Text-to-speech failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Process voice command with intent classification
 */
export const processVoiceCommand = async (req, res) => {
  try {
    const { audio, text, language = 'en-US' } = req.body;

    // If audio is provided, convert to text first
    let commandText = text;
    if (audio && !text) {
      const sttResponse = await axios.post(`${AI_SERVICE_URL}/api/speech-to-text`, {
        audio,
        language,
      }, { timeout: 30000 });
      commandText = sttResponse.data.text;
    }

    if (!commandText) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either audio or text must be provided',
      });
    }

    // Classify intent
    const response = await axios.post(`${AI_SERVICE_URL}/api/classify-intent`, {
      text: commandText,
      language,
    }, { timeout: 10000 });

    logger.info(`Voice command processed: "${commandText}" for ${req.session.userEmail}`);

    res.json({
      success: true,
      text: commandText,
      intent: response.data.intent,
      confidence: response.data.confidence,
      entities: response.data.entities || {},
    });
  } catch (error) {
    logger.error('Voice command processing error:', error);
    res.status(500).json({
      error: 'Voice command processing failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Detect spam in email
 */
export const detectSpam = async (req, res) => {
  try {
    const { subject, body, from } = req.body;

    if (!subject && !body) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either subject or body must be provided',
      });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/api/spam-detection`, {
      subject,
      body,
      from,
    }, { timeout: 10000 });

    logger.info(`Spam detection performed for ${req.session.userEmail}`);

    res.json({
      success: true,
      isSpam: response.data.is_spam,
      confidence: response.data.confidence,
      reason: response.data.reason,
    });
  } catch (error) {
    logger.error('Spam detection error:', error);
    res.status(500).json({
      error: 'Spam detection failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Classify intent from text
 */
export const classifyIntent = async (req, res) => {
  try {
    const { text, language = 'en-US' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required',
      });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/api/classify-intent`, {
      text,
      language,
    }, { timeout: 10000 });

    logger.info(`Intent classified for ${req.session.userEmail}`);

    res.json({
      success: true,
      intent: response.data.intent,
      confidence: response.data.confidence,
      entities: response.data.entities || {},
    });
  } catch (error) {
    logger.error('Intent classification error:', error);
    res.status(500).json({
      error: 'Intent classification failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

export default {
  processSpeechToText,
  processTextToSpeech,
  processVoiceCommand,
  detectSpam,
  classifyIntent,
};
