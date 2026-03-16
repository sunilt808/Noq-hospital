# backend/models/queue.py - Pydantic models for queues & tokens
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class QueueStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    IDLE = "idle"


class TokenStatus(str, Enum):
    WAITING = "waiting"
    CALLING = "calling"
    SERVING = "serving"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ABSENT = "absent"


class TokenPriority(str, Enum):
    NORMAL = "normal"
    HIGH = "high"
    EMERGENCY = "emergency"


class QueueCreate(BaseModel):
    hospital_id: str
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    department: Optional[str] = None
    room: Optional[str] = None
    date: Optional[str] = None
    max_capacity: Optional[int] = 50


class QueueUpdate(BaseModel):
    status: Optional[QueueStatus] = None
    doctor_id: Optional[str] = None
    room: Optional[str] = None
    max_capacity: Optional[int] = None


class QueueResponse(BaseModel):
    id: str
    hospital_id: str
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    department: Optional[str] = None
    room: Optional[str] = None
    status: str
    token_counter: int = 0
    current_token: Optional[str] = None
    waiting_count: int = 0
    created_at: Optional[str] = None


class TokenCreate(BaseModel):
    queue_id: str
    patient_id: Optional[str] = None
    patient_name: str
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    appointment_type: Optional[str] = "regular"
    priority: Optional[TokenPriority] = TokenPriority.NORMAL
    notes: Optional[str] = None


class TokenResponse(BaseModel):
    id: str
    queue_id: str
    token_number: int
    token_code: str
    patient_name: str
    patient_id: Optional[str] = None
    patient_phone: Optional[str] = None
    status: str
    priority: str
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    called_at: Optional[str] = None
    completed_at: Optional[str] = None
