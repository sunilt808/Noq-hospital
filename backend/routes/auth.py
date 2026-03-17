# backend/routes/auth.py - Authentication Routes

import logging
import re
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session
from database import get_db
from services.auth_service import AuthService, UserService
from audit import AuditLogger
from hospital_id_utils import is_valid_hospital_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


def validate_strong_password(password: str) -> bool:
    """Validate password meets strength requirements: 8+ chars, uppercase, lowercase, digit, special char."""
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):  # Uppercase
        return False
    if not re.search(r'[a-z]', password):  # Lowercase
        return False
    if not re.search(r'[0-9]', password):  # Digit
        return False
    if not re.search(r'[!@#$%^&*()_\-+=\[\]{};:\'",.<>?/\\|`~]', password):  # Special char
        return False
    return True


def validate_phone(phone: str) -> bool:
    """Validate phone is exactly 10 digits."""
    if not phone:
        return True  # Optional field
    return bool(re.match(r'^\d{10}$', phone))


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
    hospital_id: str = None  # Required for HM and doctor registration
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not validate_strong_password(v):
            raise ValueError("Password must be 8+ chars with uppercase, lowercase, digit, and special char")
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone_field(cls, v):
        if v and not validate_phone(v):
            raise ValueError("Phone must be exactly 10 digits")
        return v
    
    @field_validator('hospital_id')
    @classmethod
    def validate_hospital_id(cls, v, info):
        # Require hospital_id for HM and doctor roles
        role = info.data.get('role')
        if role in ['hm', 'doctor'] and not v:
            raise ValueError(f"hospital_id required for {role} registration")
        if v and not is_valid_hospital_id(v):
            raise ValueError("hospital_id must be in format Noq-######")
        return v


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
    """Register a new user (patient, doctor, hm)."""
    try:
        # Get client IP
        client_ip = request.client.host if request.client else None
        
        # Create user - pass hospital_id for HM and doctor roles
        user = UserService.create_user(
            db=db,
            email=req.email,
            password=req.password,
            full_name=req.full_name,
            phone=req.phone,
            role=req.role or "patient",
            hospital_id=req.hospital_id if req.role in ['hm', 'doctor'] else None
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
            new_values={"email": user.email, "role": user.role, "hospital_id": req.hospital_id or ""},
            ip_address=client_ip,
        )
        
        return LoginResponse(
            success=True,
            message=f"Signup successful as {req.role or 'patient'}",
            data={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "hospital_id": user.hospital_id,
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
