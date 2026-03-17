# backend/routes/appointments.py - Appointment Management Routes

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db, Appointment, Doctor, User
from services.auth_service import require_auth
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/appointments", tags=["Appointments"])


class AppointmentResponse(BaseModel):
    """Appointment response model."""
    id: str
    hospital_id: str
    doctor_id: Optional[str] = None
    patient_id: str
    doctor_name: Optional[str] = None
    department: Optional[str] = None
    disease: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    appointment_type: Optional[str] = None
    status: str
    notes: Optional[str] = None
    fee: Optional[float] = None
    token_number: Optional[int] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


def _serialize_appointment(appt: Appointment) -> dict:
    return {
        "id": appt.id,
        "hospital_id": appt.hospital_id,
        "doctor_id": appt.doctor_id,
        "patient_id": appt.patient_id,
        "doctor_name": getattr(appt, 'doctor_name', None),
        "department": getattr(appt, 'department', None),
        "disease": getattr(appt, 'disease', None),
        "appointment_date": appt.appointment_date.isoformat() if appt.appointment_date else None,
        "appointment_time": getattr(appt, 'appointment_time', None),
        "appointment_type": getattr(appt, 'appointment_type', 'regular'),
        "status": appt.status,
        "notes": appt.notes,
        "fee": getattr(appt, 'fee', None),
        "token_number": getattr(appt, 'token_number', None),
        "created_at": appt.created_at.isoformat() if appt.created_at else None,
    }


@router.get("/")
def list_appointments(
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    doctor_user_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(require_auth)
):
    """List appointments with filters."""
    try:
        query = db.query(Appointment)

        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)

        if hospital_id:
            query = query.filter(Appointment.hospital_id == hospital_id)

        # Filter by doctor's doctors.id directly
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)

        # Filter by doctor's users.id (resolve to doctors.id via Doctor table)
        if doctor_user_id:
            doctor_record = db.query(Doctor).filter(Doctor.user_id == doctor_user_id).first()
            if doctor_record:
                query = query.filter(Appointment.doctor_id == doctor_record.id)
            else:
                # No doctor record found → return empty
                return []

        if status_filter:
            query = query.filter(Appointment.status == status_filter)

        appointments = query.order_by(Appointment.created_at.desc()).all()
        return [_serialize_appointment(a) for a in appointments]
    except Exception as e:
        logger.error(f"Error listing appointments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/{appointment_id}")
def get_appointment(
    appointment_id: str,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(require_auth)
):
    """Get appointment by ID."""
    try:
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment not found: {appointment_id}"
            )
        return _serialize_appointment(appointment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appointment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


class AppointmentStatusUpdate(BaseModel):
    status: str


@router.patch("/{appointment_id}")
def update_appointment_status(
    appointment_id: str,
    update: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(require_auth)
):
    """Update appointment status."""
    try:
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment not found: {appointment_id}"
            )
        appointment.status = update.status
        db.commit()
        db.refresh(appointment)
        return _serialize_appointment(appointment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating appointment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
