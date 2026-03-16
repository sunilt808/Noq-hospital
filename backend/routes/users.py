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
    password: Optional[str] = None
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    specialization: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    room_no: Optional[str] = None
    floor: Optional[str] = None
    room_id: Optional[str] = None
    license: Optional[str] = None
    advanced_booking_category: Optional[str] = None
    fee: Optional[float] = None
    experience: Optional[int] = None
    qualifications: Optional[str] = None
    category: Optional[str] = None
    promotion_label: Optional[str] = None
    status: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    specialization: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    room_no: Optional[str] = None
    floor: Optional[str] = None
    room_id: Optional[str] = None
    license: Optional[str] = None
    advanced_booking_category: Optional[str] = None
    fee: Optional[float] = None
    experience: Optional[int] = None
    qualifications: Optional[str] = None
    category: Optional[str] = None
    promotion_label: Optional[str] = None
    status: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.post("", response_model=StandardResponse, status_code=201)
def create_user(user: UserCreate):
    """Create a new user."""
    try:
        existing = user_service.get_user_by_email(user.email)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    if existing:
        raise HTTPException(status_code=409, detail="User already exists.")
    
    new_user = user_service.create_user(user.model_dump())
    return StandardResponse(
        success=True,
        message="User created.",
        data={"id": new_user.get("id"), "user": new_user},
    )


@router.post("/create", response_model=StandardResponse, status_code=201)
def create_user_alias(user: UserCreate):
    """Create user alias endpoint used by HM pages."""
    return create_user(user)


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
    try:
        doctors = user_service.get_all_users(role="doctor")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    active_doctors = [d for d in doctors if d.get("status", "active").lower() in ["active", "approved"]]
    return StandardResponse(
        success=True,
        message="Doctors fetched.",
        data={"doctors": active_doctors, "count": len(active_doctors)},
    )


@router.get("", response_model=StandardResponse)
def list_users(role: Optional[str] = None, hospital_id: Optional[str] = None, payload: dict = Depends(auth_service.require_auth)):
    """List users by role (authenticated)."""
    try:
        users = user_service.get_all_users(role=role, hospital_id=hospital_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
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


@router.patch("/{user_id}", response_model=StandardResponse)
def update_user(user_id: str, updates: UserUpdate, payload: dict = Depends(auth_service.require_auth)):
    """Update a user by ID."""
    updated = user_service.update_user(user_id, updates.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found.")
    return StandardResponse(success=True, message="User updated.", data={"user": updated})


@router.delete("/{user_id}", response_model=StandardResponse)
def delete_user(user_id: str, payload: dict = Depends(auth_service.require_auth)):
    """Delete a user by ID."""
    deleted = user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found.")
    return StandardResponse(success=True, message="User deleted.", data={"id": user_id})


