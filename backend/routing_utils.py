"""
routing_utils.py - authentication utility for routes
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Security dependency
security = HTTPBearer()

def check_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dummy token check for authentication.
    Replace this logic with your actual JWT/auth logic.
    """
    token = credentials.credentials

    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    # Example: only a test token for now
    if token != "valid_token_example":
        raise HTTPException(status_code=401, detail="Invalid token")

    # Return dummy user info for testing
    return {
        "id": "user_123",
        "hospital_id": "hospital_456",
        "role": "patient"
    }