from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class AdvancedBookingStatus(str, Enum):
    ALLOCATED = "allocated"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AdvancedBookingCreate(BaseModel):
    case_type: str
    case_label: str
    patient_id: str
    patient_name: str
    patient_age: Optional[int] = 0
    patient_gender: Optional[str] = ""
    hospital_id: str
    hospital_name: Optional[str] = ""
    doctor_id: str
    doctor_name: Optional[str] = ""
    doctor_specialization: Optional[str] = ""
    room: str
    room_id: Optional[str] = ""
    room_type: Optional[str] = ""
    reason: Optional[str] = ""
    appointment_date: str
    priority: Optional[str] = "high"
    status: Optional[AdvancedBookingStatus] = AdvancedBookingStatus.ALLOCATED
    allocation_method: Optional[str] = ""
    source: Optional[str] = "advanced-booking"


class AdvancedBookingStatusUpdate(BaseModel):
    status: AdvancedBookingStatus


class AdvancedBookingAssignDoctor(BaseModel):
    doctor_id: str
    doctor_name: Optional[str] = ""
    doctor_specialization: Optional[str] = ""
    allocation_method: Optional[str] = "hm-manual-assignment"


class AdvancedBookingResponse(BaseModel):
    id: str
    case_type: str
    case_label: str
    patient_id: str
    patient_name: str
    hospital_id: str
    doctor_id: str
    room: str
    appointment_date: str
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
