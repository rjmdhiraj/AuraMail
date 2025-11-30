"""
Text-to-Speech Service using gTTS
"""
import os
import logging
import tempfile
from gtts import gTTS
from io import BytesIO

logger = logging.getLogger(__name__)

class TTSService:
    """Service for converting text to speech"""
    
    def __init__(self):
        """Initialize TTS service"""
        self.cache = {}  # Simple in-memory cache for common phrases
        logger.info("TTS Service initialized with caching")
    
    def synthesize(self, text, language='en'):
        """
        Convert text to speech audio (optimized with caching)
        
        Args:
            text: Text to convert to speech
            language: Language code (default: 'en')
        
        Returns:
            BytesIO: Audio data as MP3
        """
        try:
            # Check cache first (for common phrases)
            cache_key = f"{language}:{text[:100]}"
            if cache_key in self.cache:
                logger.info("Returning cached TTS audio")
                cached_audio = self.cache[cache_key]
                audio_data = BytesIO(cached_audio)
                audio_data.seek(0)
                return audio_data
            
            # Generate speech directly to BytesIO (faster than file I/O)
            logger.info(f"Generating TTS for: {text[:50]}...")
            tts = gTTS(text=text, lang=language, slow=False)
            audio_data = BytesIO()
            tts.write_to_fp(audio_data)
            audio_data.seek(0)
            
            # Cache small responses (< 200 chars) for faster subsequent access
            if len(text) < 200:
                audio_bytes = audio_data.read()
                self.cache[cache_key] = audio_bytes
                audio_data = BytesIO(audio_bytes)
                audio_data.seek(0)
                logger.info(f"Cached TTS audio (cache size: {len(self.cache)})")
            
            return audio_data
        
        except Exception as e:
            logger.error(f"TTS synthesis error: {str(e)}", exc_info=True)
            raise Exception(f"Failed to synthesize speech: {str(e)}")
    
    def synthesize_to_file(self, text, output_path, language='en'):
        """
        Convert text to speech and save to file
        
        Args:
            text: Text to convert
            output_path: Path to save audio file
            language: Language code
        """
        try:
            tts = gTTS(text=text, lang=language, slow=False)
            tts.save(output_path)
            logger.info(f"Audio saved to {output_path}")
        
        except Exception as e:
            logger.error(f"TTS file synthesis error: {str(e)}")
            raise Exception(f"Failed to save speech file: {str(e)}")
