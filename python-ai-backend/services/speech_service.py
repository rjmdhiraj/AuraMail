"""
Speech-to-Text Service using OpenAI Whisper
"""
import os
import base64
import tempfile
import logging
import whisper
import numpy as np
import soundfile as sf
from io import BytesIO

logger = logging.getLogger(__name__)

class SpeechService:
    """Service for converting speech to text using Whisper"""
    
    def __init__(self):
        """Initialize Whisper model"""
        model_name = os.getenv('WHISPER_MODEL', 'base')
        logger.info(f"Loading Whisper model: {model_name}")
        
        try:
            self.model = whisper.load_model(model_name)
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            raise
    
    def transcribe(self, audio_data, language='en'):
        """
        Transcribe audio to text
        
        Args:
            audio_data: Base64 encoded audio or file path
            language: Language code (default: 'en')
        
        Returns:
            dict: {'text': transcribed_text, 'confidence': confidence_score}
        """
        try:
            # Decode base64 audio if needed
            if isinstance(audio_data, str) and audio_data.startswith('data:audio'):
                # Extract base64 part from data URL
                audio_data = audio_data.split(',')[1]
            
            if isinstance(audio_data, str):
                audio_bytes = base64.b64decode(audio_data)
            else:
                audio_bytes = audio_data
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name
            
            try:
                # Transcribe using Whisper
                result = self.model.transcribe(
                    temp_path,
                    language=language,
                    fp16=False
                )
                
                return {
                    'text': result['text'].strip(),
                    'confidence': 1.0  # Whisper doesn't provide confidence scores
                }
            
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
        
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")
    
    def transcribe_file(self, file_path, language='en'):
        """
        Transcribe audio file to text
        
        Args:
            file_path: Path to audio file
            language: Language code
        
        Returns:
            dict: Transcription result
        """
        try:
            result = self.model.transcribe(file_path, language=language, fp16=False)
            
            return {
                'text': result['text'].strip(),
                'confidence': 1.0
            }
        
        except Exception as e:
            logger.error(f"File transcription error: {str(e)}")
            raise Exception(f"Failed to transcribe file: {str(e)}")
