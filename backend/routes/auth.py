# backend/routes/auth.py - Authentication Routes (MongoDB)

import logging
import re
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, field_validator
from services.auth_service import AuthService, UserService
from audit import AuditLogger
from hospital_id_utils import is_valid_hospital_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


# ───────────────── VALIDATORS ───────────────── #

def validate_strong_password(password: str) -> bool:
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    if not re.search(r'[!@#$%^&*()_\-+=\[\]{};:\'",.<>?/\\|`~]', password):
        return False
    return True


def validate_phone(phone: str) -> bool:
    if not phone:
        return True
    return bool(re.match(r'^\d{10}$', phone))


# ───────────────── SCHEMAS ───────────────── #

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = None


class LoginResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str = None
    role: str = "patient"
    hospital_id: str = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not validate_strong_password(v):
            raise ValueError("Password must be strong")
        return v

    @field_validator('phone')
    @classmethod
    def validate_phone_field(cls, v):
        if v and not validate_phone(v):
            raise ValueError("Phone must be 10 digits")
        return v

    @field_validator('hospital_id')
    @classmethod
    def validate_hospital_id(cls, v, info):
        role = info.data.get('role')
        if role in ['hm', 'doctor'] and not v:
            raise ValueError(f"hospital_id required for {role}")
        if v and not is_valid_hospital_id(v):
            raise ValueError("Invalid hospital_id format")
        return v


# ───────────────── LOGIN ───────────────── #

@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    request: Request
):
    try:
        client_ip = request.client.host if request.client else None

        user = await AuthService.authenticate_user(
            email=req.email,
            password=req.password,
            ip_address=client_ip
        )

        return LoginResponse(
            success=True,
            message="Login successful",
            data=user
        )

    except ValueError as e:
        logger.warning(f"Login failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))

    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ───────────────── SIGNUP ───────────────── #

@router.post("/signup", response_model=LoginResponse)
async def signup(
    req: SignupRequest,
    request: Request
):
    try:
        client_ip = request.client.host if request.client else None

        user = await UserService.create_user(
            email=req.email,
            password=req.password,
            full_name=req.full_name,
            phone=req.phone,
            role=req.role or "patient",
            hospital_id=req.hospital_id if req.role in ['hm', 'doctor'] else None
        )

        token = AuthService.create_access_token({
            "sub": user["id"],
            "email": user["email"],
            "role": user["role"],
        })

        await AuditLogger.log(
            action="SIGNUP",
            entity_type="User",
            entity_id=user["id"],
            user_id=user["id"],
            new_values={
                "email": user["email"],
                "role": user["role"],
                "hospital_id": req.hospital_id or ""
            },
            ip_address=client_ip,
        )

        return LoginResponse(
            success=True,
            message=f"Signup successful as {req.role or 'patient'}",
            data={
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"],
                "hospital_id": user.get("hospital_id"),
                "token": token,
            }
        )

    except ValueError as e:
        logger.warning(f"Signup failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"Signup error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")