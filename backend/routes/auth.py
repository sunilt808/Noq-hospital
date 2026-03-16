# backend/routes/auth.py - Authentication endpoints

import logging
from fastapi import APIRouter, HTTPException, status
from services import auth_service, user_service
from pydantic import BaseModel
from typing import Optional
from response_models import StandardResponse, success_response, error_response
from api_utils import (
    ValidationError, UnauthorizedError, DatabaseError,
    validate_email, validate_required_fields
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str
    role: str
    hospital_id: Optional[str] = None
    otp: Optional[str] = None
    _generatedOtp: Optional[str] = None


class FirebaseLoginRequest(BaseModel):
    id_token: str
    role: str
    hospital_id: Optional[str] = None


@router.post("/login", response_model=StandardResponse)
def login(req: LoginRequest):
    """Authenticate user and return token."""
    try:
        # Validate required fields
        if not req.email or not req.password:
            raise ValidationError("Email and password are required")
        
        # Validate email format
        if not validate_email(req.email):
            raise ValidationError("Invalid email format")
        
        # Authenticate user
        user = user_service.authenticate_user(req.email, req.password, req.role)
        
        if not user:
            logger.warning(f"Login failed for {req.email} with role {req.role}")
            raise UnauthorizedError("Invalid credentials")
        
        # Generate token
        token = auth_service.create_access_token({
            "sub": user.get("id"),
            "email": user.get("email"),
            "role": user.get("role")
        })
        
        logger.info(f"User {req.email} logged in successfully with role {req.role}")
        
        return success_response(
            message="Login successful",
            data={"user": user, "token": token},
            status_code=200
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except UnauthorizedError as e:
        logger.warning(f"Authentication error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except DatabaseError as e:
        logger.error(f"Database error during login: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database error")
    except RuntimeError as e:
        logger.error(f"Runtime error during login: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post("/firebase-login", response_model=StandardResponse)
def firebase_login(req: FirebaseLoginRequest):
    """Authenticate via Firebase ID token."""
    decoded = user_service.verify_firebase_token(req.id_token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid Firebase token.")
    
    email = decoded.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Firebase token missing email.")
    
    try:
        user = user_service.get_user_by_email(email)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    if not user:
        user = user_service.create_user({
            "name": decoded.get("name", email.split("@")[0]),
            "email": email,
            "role": req.role or "patient",
            "status": "active",
            "firebase_uid": decoded.get("uid"),
            "hospital_id": req.hospital_id or "",
        })
    
    token = auth_service.create_access_token({"sub": user.get("id"), "email": user.get("email"), "role": user.get("role")})
    return StandardResponse(
        success=True,
        message="Firebase login successful.",
        data={"user": user, "token": token},
    )


@router.post("/verify-token", response_model=StandardResponse)
def verify_token(token: str = None):
    """Verify ID token."""
    if not token:
        raise HTTPException(status_code=400, detail="Token required.")
    
    decoded = user_service.verify_firebase_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token.")
    
    return StandardResponse(
        success=True,
        message="Token valid.",
        data={"decoded": decoded},
    )
