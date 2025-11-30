"""
Spam Detection Service using Hugging Face Transformers
"""
import logging
import re
from transformers import pipeline

logger = logging.getLogger(__name__)

class SpamDetector:
    """Service for detecting spam emails"""
    
    # Spam indicators
    SPAM_KEYWORDS = [
        'viagra', 'cialis', 'casino', 'lottery', 'winner', 'congratulations',
        'free money', 'click here', 'act now', 'limited time', 'urgent',
        'nigerian prince', 'inheritance', 'million dollars', 'wire transfer',
        'verify account', 'suspended account', 'confirm identity'
    ]
    
    def __init__(self):
        """Initialize spam detector"""
        logger.info("Initializing Spam Detector")
        
        try:
            # Use text classification for spam detection
            self.classifier = pipeline(
                "text-classification",
                model="mrm8488/bert-tiny-finetuned-sms-spam-detection"
            )
            logger.info("Spam detector loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load spam detection model: {str(e)}")
            self.classifier = None
    
    def detect(self, subject, body):
        """
        Detect if email is spam
        
        Args:
            subject: Email subject
            body: Email body
        
        Returns:
            dict: {'is_spam': bool, 'confidence': float, 'reason': str}
        """
        try:
            # Combine subject and body
            text = f"{subject} {body}"
            text_lower = text.lower()
            
            # Rule-based detection (fast)
            spam_indicators = []
            for keyword in self.SPAM_KEYWORDS:
                if keyword in text_lower:
                    spam_indicators.append(keyword)
            
            # If multiple spam keywords, likely spam
            if len(spam_indicators) >= 2:
                return {
                    'is_spam': True,
                    'confidence': 0.9,
                    'reason': f"Contains spam keywords: {', '.join(spam_indicators[:3])}"
                }
            
            # Check for excessive exclamation marks or capitals
            exclamation_count = text.count('!')
            caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
            
            if exclamation_count > 3 and caps_ratio > 0.3:
                return {
                    'is_spam': True,
                    'confidence': 0.75,
                    'reason': 'Excessive capitalization and exclamation marks'
                }
            
            # ML-based detection if available
            if self.classifier:
                # Truncate to avoid token limit
                truncated_text = text[:500]
                result = self.classifier(truncated_text)[0]
                
                is_spam = result['label'].upper() == 'SPAM'
                confidence = result['score']
                
                return {
                    'is_spam': is_spam,
                    'confidence': confidence,
                    'reason': 'ML model detection' if is_spam else 'Legitimate email'
                }
            
            # If single spam keyword found
            if spam_indicators:
                return {
                    'is_spam': True,
                    'confidence': 0.6,
                    'reason': f"Contains spam keyword: {spam_indicators[0]}"
                }
            
            # Default to not spam
            return {
                'is_spam': False,
                'confidence': 0.8,
                'reason': 'No spam indicators found'
            }
        
        except Exception as e:
            logger.error(f"Spam detection error: {str(e)}")
            # Default to not spam on error
            return {
                'is_spam': False,
                'confidence': 0.0,
                'reason': f'Detection failed: {str(e)}'
            }
