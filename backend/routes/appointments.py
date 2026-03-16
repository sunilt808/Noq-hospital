# backend/routes/appointments.py - Appointment Management Routes

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db, Appointment
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/appointments", tags=["Appointments"])


class AppointmentResponse(BaseModel):
    """Appointment response model."""
    id: str
    hospital_id: str
    doctor_id: str
    patient_id: str
    appointment_date: datetime
    status: str
    notes: str = None

    class Config:
        from_attributes = True


@router.get("/", response_model=list[AppointmentResponse])
def list_appointments(
    patient_id: str = None,
    db: Session = Depends(get_db)
):
    """List appointments."""
    try:
        query = db.query(Appointment)
        
        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)
        
        appointments = query.all()
        return appointments
    except Exception as e:
        logger.error(f"Error listing appointments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: str, db: Session = Depends(get_db)):
    """Get appointment by ID."""
    try:
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment not found: {appointment_id}"
            )
        return appointment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appointment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
