# backend/routes/auth.py - Authentication Routes

import logging
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db
from services.auth_service import AuthService, UserService
from audit import AuditLogger

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: str
    role: str = None  # For role-based access logging


class LoginResponse(BaseModel):
    """Login response model."""
    success: bool
    message: str
    data: dict = {}


class SignupRequest(BaseModel):
    """Signup request model."""
    email: EmailStr
    password: str
    full_name: str
    phone: str = None
    role: str = "patient"


@router.post("/login", response_model=LoginResponse)
def login(
    req: LoginRequest, 
    request: Request,
    db: Session = Depends(get_db)
):
    """Authenticate user with email and password."""
    try:
        # Get client IP
        client_ip = request.client.host if request.client else None
        
        # Authenticate user
        user_data = AuthService.authenticate_user(
            db=db,
            email=req.email,
            password=req.password,
            ip_address=client_ip
        )
        
        return LoginResponse(
            success=True,
            message="Login successful",
            data=user_data
        )
        
    except ValueError as e:
        logger.warning(f"Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/signup", response_model=LoginResponse)
def signup(
    req: SignupRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    try:
        # Get client IP
        client_ip = request.client.host if request.client else None
        
        # Create user
        user = UserService.create_user(
            db=db,
            email=req.email,
            password=req.password,
            full_name=req.full_name,
            phone=req.phone,
            role=req.role or "patient"
        )
        
        # Create token
        token = AuthService.create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
        })
        
        # Log signup
        AuditLogger.log(
            db=db,
            action="SIGNUP",
            entity_type="User",
            entity_id=user.id,
            user_id=user.id,
            new_values={"email": user.email, "role": user.role},
            ip_address=client_ip,
        )
        
        return LoginResponse(
            success=True,
            message="Signup successful",
            data={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "token": token,
            }
        )
        
    except ValueError as e:
        logger.warning(f"Signup failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Signup error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
