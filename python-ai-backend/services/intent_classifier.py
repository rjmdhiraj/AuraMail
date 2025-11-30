"""
Intent Classification Service using Hugging Face Transformers
"""
import os
import logging
import re
from transformers import pipeline

logger = logging.getLogger(__name__)

class IntentClassifier:
    """Service for classifying voice command intents"""
    
    # Intent mapping for common email commands
    INTENTS = {
        'read_inbox': ['read inbox', 'check inbox', 'show inbox', 'open inbox'],
        'read_sent': ['read sent', 'show sent', 'sent emails', 'sent folder'],
        'read_drafts': ['read drafts', 'show drafts', 'open drafts'],
        'compose_email': ['compose', 'new email', 'write email', 'send email'],
        'reply_email': ['reply', 'respond', 'reply to this'],
        'forward_email': ['forward', 'forward this', 'forward email'],
        'delete_email': ['delete', 'remove', 'trash', 'delete this'],
        'mark_spam': ['spam', 'mark spam', 'mark as spam'],
        'search': ['search', 'find', 'look for'],
        'read_email': ['read', 'read email', 'read this'],
        'next_email': ['next', 'next email'],
        'previous_email': ['previous', 'previous email', 'go back'],
    }
    
    def __init__(self):
        """Initialize intent classifier"""
        logger.info("Initializing Intent Classifier")
        
        try:
            # Use zero-shot classification for flexible intent detection
            self.classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli"
            )
            logger.info("Intent classifier loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load transformer model: {str(e)}")
            self.classifier = None
    
    def classify(self, text):
        """
        Classify user intent from text
        
        Args:
            text: User command text
        
        Returns:
            dict: {'intent': intent_name, 'confidence': score, 'entities': {}}
        """
        try:
            text_lower = text.lower().strip()
            
            # First try rule-based matching (faster)
            for intent, patterns in self.INTENTS.items():
                for pattern in patterns:
                    if pattern in text_lower:
                        return {
                            'intent': intent,
                            'confidence': 0.95,
                            'entities': self._extract_entities(text, intent)
                        }
            
            # Fall back to ML-based classification if available
            if self.classifier:
                candidate_labels = list(self.INTENTS.keys())
                result = self.classifier(text, candidate_labels)
                
                return {
                    'intent': result['labels'][0],
                    'confidence': result['scores'][0],
                    'entities': self._extract_entities(text, result['labels'][0])
                }
            
            # Default to unknown intent
            return {
                'intent': 'unknown',
                'confidence': 0.0,
                'entities': {}
            }
        
        except Exception as e:
            logger.error(f"Intent classification error: {str(e)}")
            return {
                'intent': 'unknown',
                'confidence': 0.0,
                'entities': {}
            }
    
    def _extract_entities(self, text, intent):
        """
        Extract entities from text based on intent
        
        Args:
            text: User command text
            intent: Classified intent
        
        Returns:
            dict: Extracted entities
        """
        entities = {}
        
        # Extract email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            entities['email'] = emails[0]
        
        # Extract search queries for search intent
        if intent == 'search':
            # Remove command words and extract remaining text as query
            query = re.sub(r'\b(search|find|look for)\b', '', text, flags=re.IGNORECASE).strip()
            if query:
                entities['query'] = query
        
        # Extract numbers (for email selection)
        numbers = re.findall(r'\b\d+\b', text)
        if numbers:
            entities['number'] = int(numbers[0])
        
        return entities
