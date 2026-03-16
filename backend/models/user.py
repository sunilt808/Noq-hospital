# backend/models/user.py - Pydantic models for users
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    HM = "hm"
    DOCTOR = "doctor"
    PATIENT = "patient"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    BLOCKED = "blocked"
    SUSPENDED = "suspended"


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: UserRole
    phone: Optional[str] = None
    password: Optional[str] = None
    hospital_id: Optional[str] = None
    specialization: Optional[str] = None
    hospital_name: Optional[str] = None
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


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    status: Optional[UserStatus] = None
    hospital_name: Optional[str] = None
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


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    phone: Optional[str] = None
    hospital_id: Optional[str] = None
    specialization: Optional[str] = None
    created_at: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    otp: Optional[str] = None
    role: UserRole
    hospital_id: Optional[str] = None


class LoginResponse(BaseModel):
    success: bool
    message: str
    data: dict
