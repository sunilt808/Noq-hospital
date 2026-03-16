# backend/models/hospital.py - Hospital & appointment models
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum


class HospitalStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


class HospitalCreate(BaseModel):
    hospital_name: str
    hm_name: str
    hm_gender: str
    hm_dob: str
    email: EmailStr
    phone: str
    password: str
    category: str  # private / government
    address: Optional[str] = None
    emergency_contact: Optional[str] = None


class HospitalUpdate(BaseModel):
    hospital_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None


class HospitalResponse(BaseModel):
    id: str
    hospital_name: str
    hm_name: str
    email: str
    phone: str
    category: str
    address: Optional[str] = None
    status: str
    created_at: Optional[str] = None


class HospitalStatusUpdate(BaseModel):
    status: HospitalStatus
    message: Optional[str] = None


class AppointmentCreate(BaseModel):
    patient_id: str
    hospital_id: str
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    department: Optional[str] = None
    disease: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    appointment_type: Optional[str] = "regular"
    notes: Optional[str] = None
    fee: Optional[float] = None


class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    hospital_id: str
    doctor_name: Optional[str] = None
    department: Optional[str] = None
    appointment_date: Optional[str] = None
    status: str
    token_number: Optional[int] = None
    fee: Optional[float] = None
    created_at: Optional[str] = None


class NotificationCreate(BaseModel):
    title: str
    message: str
    target_user_id: Optional[str] = None  # None = broadcast
    target_role: Optional[str] = None
    hospital_id: Optional[str] = None
    type: Optional[str] = "info"  # info / warning / success / error
