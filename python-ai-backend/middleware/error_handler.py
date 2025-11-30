"""
Custom error handler for API errors
"""
from flask import jsonify
import logging

logger = logging.getLogger(__name__)

class APIError(Exception):
    """Custom API Error class"""
    
    def __init__(self, message, status_code=400):
        super().__init__()
        self.message = message
        self.status_code = status_code
    
    def to_dict(self):
        return {'error': self.message}

def handle_error(error):
    """
    Handle API errors and return JSON response
    
    Args:
        error: APIError instance
    
    Returns:
        Flask JSON response with error details
    """
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    logger.error(f"API Error: {error.message} (Status: {error.status_code})")
    return response
