"""
Voice Email AI Backend
Provides AI-powered speech processing, intent classification, and spam detection
"""
import os
import logging
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import services
from services.speech_service import SpeechService
from services.tts_service import TTSService
from services.intent_classifier import IntentClassifier
from services.spam_detector import SpamDetector

# Import middleware
from middleware.error_handler import handle_error, APIError
from middleware.rate_limiter import rate_limiter

# Configure logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=os.getenv('CORS_ORIGIN', '*'))

# Initialize services (lazy loading)
speech_service = None
tts_service = None
intent_classifier = None
spam_detector = None

def get_speech_service():
    global speech_service
    if speech_service is None:
        speech_service = SpeechService()
    return speech_service

def get_tts_service():
    global tts_service
    if tts_service is None:
        tts_service = TTSService()
    return tts_service

def get_intent_classifier():
    global intent_classifier
    if intent_classifier is None:
        intent_classifier = IntentClassifier()
    return intent_classifier

def get_spam_detector():
    global spam_detector
    if spam_detector is None:
        spam_detector = SpamDetector()
    return spam_detector

# Health check
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'voice-email-ai-backend',
        'version': '1.0.0'
    })

# Speech-to-Text endpoint
@app.route('/api/speech-to-text', methods=['POST'])
@rate_limiter
def speech_to_text():
    """
    Convert speech audio to text
    Request: { "audio": "base64_audio_data", "language": "en-US" }
    Response: { "text": "transcribed text", "confidence": 0.95 }
    """
    try:
        data = request.get_json()
        
        if not data or 'audio' not in data:
            raise APIError('Missing audio data', 400)
        
        audio_data = data['audio']
        language = data.get('language', 'en')
        
        result = get_speech_service().transcribe(audio_data, language)
        
        return jsonify({
            'text': result['text'],
            'confidence': result.get('confidence', 1.0)
        })
    
    except APIError:
        raise
    except Exception as e:
        logger.error(f"Speech-to-text error: {str(e)}")
        raise APIError(f'Speech recognition failed: {str(e)}', 500)

# Text-to-Speech endpoint
@app.route('/api/text-to-speech', methods=['POST'])
@rate_limiter
def text_to_speech():
    """
    Convert text to speech audio
    Request: { "text": "Text to speak", "language": "en-US" }
    Response: audio/mpeg file
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            raise APIError('Missing text data', 400)
        
        text = data['text']
        language = data.get('language', 'en')
        
        audio_file = get_tts_service().synthesize(text, language)
        
        return send_file(
            audio_file,
            mimetype='audio/mpeg',
            as_attachment=True,
            download_name='speech.mp3'
        )
    
    except APIError:
        raise
    except Exception as e:
        logger.error(f"Text-to-speech error: {str(e)}")
        raise APIError(f'Speech synthesis failed: {str(e)}', 500)

# Voice Command endpoint
@app.route('/api/voice-command', methods=['POST'])
@rate_limiter
def voice_command():
    """
    Process voice command and extract intent
    Request: { "text": "read my emails", "language": "en-US" }
    Response: { "intent": "read_inbox", "confidence": 0.98, "entities": {} }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            raise APIError('Missing text data', 400)
        
        text = data['text']
        
        result = get_intent_classifier().classify(text)
        
        return jsonify({
            'intent': result['intent'],
            'confidence': result['confidence'],
            'entities': result.get('entities', {})
        })
    
    except APIError:
        raise
    except Exception as e:
        logger.error(f"Intent classification error: {str(e)}")
        raise APIError(f'Command processing failed: {str(e)}', 500)

# Spam Detection endpoint
@app.route('/api/spam-detection', methods=['POST'])
@rate_limiter
def spam_detection():
    """
    Detect if email is spam
    Request: { "subject": "Email subject", "body": "Email body" }
    Response: { "is_spam": true, "confidence": 0.87, "reason": "Multiple spam indicators" }
    """
    try:
        data = request.get_json()
        
        if not data or 'subject' not in data or 'body' not in data:
            raise APIError('Missing subject or body', 400)
        
        subject = data['subject']
        body = data['body']
        
        result = get_spam_detector().detect(subject, body)
        
        return jsonify({
            'is_spam': result['is_spam'],
            'confidence': result['confidence'],
            'reason': result.get('reason', 'No specific reason')
        })
    
    except APIError:
        raise
    except Exception as e:
        logger.error(f"Spam detection error: {str(e)}")
        raise APIError(f'Spam detection failed: {str(e)}', 500)

# Error handlers
@app.errorhandler(APIError)
def handle_api_error(error):
    return handle_error(error)

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Voice Email AI Backend on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
