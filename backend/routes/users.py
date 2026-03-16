# backend/routes/users.py - User management endpoints

from fastapi import APIRouter, HTTPException, status, Depends
from services import user_service, auth_service
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/users", tags=["Users"])


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    phone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    password: str


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.post("", response_model=StandardResponse, status_code=201)
def create_user(user: UserCreate):
    """Create a new user."""
    existing = user_service.get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=409, detail="User already exists.")
    
    new_user = user_service.create_user(user.model_dump())
    return StandardResponse(
        success=True,
        message="User created.",
        data={"user": new_user},
    )


@router.get("/me", response_model=StandardResponse)
def get_current_user(payload: dict = Depends(auth_service.require_auth)):
    """Get current authenticated user."""
    user_id = payload.get("sub")
    user = user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    return StandardResponse(
        success=True,
        message="User fetched.",
        data={"user": user},
    )


@router.get("/doctors-directory", response_model=StandardResponse)
def get_doctors_directory():
    """Get all active doctors - PUBLIC endpoint for patient booking."""
    doctors = user_service.get_all_users(role="doctor")
    active_doctors = [d for d in doctors if d.get("status", "active").lower() in ["active", "approved"]]
    return StandardResponse(
        success=True,
        message="Doctors fetched.",
        data={"doctors": active_doctors, "count": len(active_doctors)},
    )


@router.get("", response_model=StandardResponse)
def list_users(role: Optional[str] = None, hospital_id: Optional[str] = None, payload: dict = Depends(auth_service.require_auth)):
    """List users by role (authenticated)."""
    users = user_service.get_all_users(role=role, hospital_id=hospital_id)
    return StandardResponse(
        success=True,
        message="Users fetched.",
        data={"users": users, "count": len(users)},
    )


@router.get("/{user_id}", response_model=StandardResponse)
def get_user(user_id: str, payload: dict = Depends(auth_service.require_auth)):
    """Get a user by ID."""
    user = user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    return StandardResponse(
        success=True,
        message="User fetched.",
        data={"user": user},
    )


