"""
Rate limiting middleware
"""
import os
import time
import logging
from functools import wraps
from flask import request
from middleware.error_handler import APIError

logger = logging.getLogger(__name__)

# Simple in-memory rate limiting (use Redis in production)
request_counts = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = int(os.getenv('RATE_LIMIT_PER_MINUTE', 60))

def rate_limiter(f):
    """
    Rate limiting decorator
    Limits requests per IP address
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get client IP
        client_ip = request.remote_addr
        current_time = time.time()
        
        # Clean up old entries
        expired_ips = [
            ip for ip, (count, timestamp) in request_counts.items()
            if current_time - timestamp > RATE_LIMIT_WINDOW
        ]
        for ip in expired_ips:
            del request_counts[ip]
        
        # Check rate limit
        if client_ip in request_counts:
            count, timestamp = request_counts[client_ip]
            if current_time - timestamp < RATE_LIMIT_WINDOW:
                if count >= RATE_LIMIT_MAX:
                    logger.warning(f"Rate limit exceeded for {client_ip}")
                    raise APIError('Rate limit exceeded. Please try again later.', 429)
                request_counts[client_ip] = (count + 1, timestamp)
            else:
                request_counts[client_ip] = (1, current_time)
        else:
            request_counts[client_ip] = (1, current_time)
        
        return f(*args, **kwargs)
    
    return decorated_function
