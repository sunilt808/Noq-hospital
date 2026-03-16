# backend/routes/appointments.py - Appointment management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/appointments", tags=["Appointments"])


class AppointmentCreate(BaseModel):
    patient_id: str
    hospital_id: str
    doctor_id: Optional[str] = None
    appointment_date: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("/my", response_model=StandardResponse)
def get_my_appointments(payload: dict = Depends(auth_service.require_auth)):
    """Get appointments for current user."""
    return StandardResponse(
        success=True,
        message="Appointments fetched.",
        data={"appointments": []},
    )


@router.post("", response_model=StandardResponse, status_code=201)
def create_appointment(appt: AppointmentCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a new appointment."""
    return StandardResponse(
        success=True,
        message="Appointment created.",
        data={"appointment": {}},
    )
