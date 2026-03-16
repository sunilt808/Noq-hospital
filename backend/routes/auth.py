# backend/routes/auth.py - Authentication endpoints

from fastapi import APIRouter, HTTPException, status, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str
    role: str


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.post("/login", response_model=StandardResponse)
def login(req: LoginRequest):
    """Authenticate user and return ID token."""
    user = auth_service.authenticate_user(req.email, req.password, req.role)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    
    return StandardResponse(
        success=True,
        message="Login successful.",
        data={"user": user},
    )


@router.post("/verify-token", response_model=StandardResponse)
def verify_token(token: str = None):
    """Verify ID token."""
    if not token:
        raise HTTPException(status_code=400, detail="Token required.")
    
    decoded = auth_service.verify_firebase_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token.")
    
    return StandardResponse(
        success=True,
        message="Token valid.",
        data={"decoded": decoded},
    )
