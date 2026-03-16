# backend/routes/appointments.py - Appointment management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional
from firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime
import uuid

router = APIRouter(prefix="/appointments", tags=["Appointments"])


class AppointmentCreate(BaseModel):
    patient_id: str
    hospital_id: str
    doctor_id: Optional[str] = None
    department_id: Optional[str] = None
    appointment_date: Optional[str] = None
    notes: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("/my", response_model=StandardResponse)
def get_my_appointments(payload: dict = Depends(auth_service.require_auth)):
    """Get appointments for current user."""
    user_id = payload.get("sub")
    ref = db.collection("appointments").where(filter=FieldFilter("patient_id", "==", user_id))
    appointments = []
    for doc in ref.stream():
        appointments.append({"id": doc.id, **doc.to_dict()})
    
    appointments.sort(key=lambda x: x.get("appointment_date", ""), reverse=True)
    return StandardResponse(
        success=True,
        message="Appointments fetched.",
        data={"appointments": appointments, "count": len(appointments)},
    )


@router.post("/create", response_model=StandardResponse, status_code=201)
def create_appointment(appt: AppointmentCreate):
    """Create a new appointment."""
    try:
        appt_id = f"APT-{uuid.uuid4().hex[:12].upper()}"
        appt_doc = {
            "id": appt_id,
            "patient_id": appt.patient_id,
            "hospital_id": appt.hospital_id,
            "doctor_id": appt.doctor_id or "",
            "department_id": appt.department_id or "",
            "appointment_date": appt.appointment_date or "",
            "notes": appt.notes or "",
            "status": "confirmed",
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        
        db.collection("appointments").document(appt_id).set(appt_doc)
        return StandardResponse(
            success=True,
            message="Appointment created.",
            data={"appointment": {"id": appt_id, **appt_doc}},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating appointment: {str(e)}")


@router.post("", response_model=StandardResponse, status_code=201)
def create_appointment_alt(appt: AppointmentCreate):
    """Create appointment (alternate endpoint)."""
    return create_appointment(appt)
