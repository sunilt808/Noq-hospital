# backend/routes/revenue.py - Revenue & analytics endpoints for admin/HM

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional
from database import db
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timedelta

router = APIRouter(prefix="/revenue", tags=["Revenue"])


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("/dashboard", response_model=StandardResponse)
def get_revenue_dashboard(hospital_id: Optional[str] = None, payload: dict = Depends(auth_service.require_auth)):
    """Get revenue dashboard for hospital admin."""
    # Get all appointments for this hospital
    ref = db.collection("appointments")
    if hospital_id:
        ref = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
    
    appointments = []
    for doc in ref.stream():
        appointments.append({"id": doc.id, **doc.to_dict()})
    
    # Calculate totals
    total_appointments = len(appointments)
    completed_appointments = len([a for a in appointments if a.get("status") == "completed"])
    
    # Calculate revenue (assuming fee field per appointment)
    total_revenue = sum(float(a.get("fee", 0) or 0) for a in appointments)
    completed_revenue = sum(
        float(a.get("fee", 0) or 0) 
        for a in appointments 
        if a.get("status") == "completed"
    )
    
    # Last 7 days
    today = datetime.utcnow()
    week_ago = today - timedelta(days=7)
    week_revenue = sum(
        float(a.get("fee", 0) or 0) 
        for a in appointments 
        if a.get("status") == "completed" 
        and datetime.fromisoformat(a.get("appointment_date", today.isoformat()).replace("Z", "+00:00")) >= week_ago
    )
    
    # Doctor count
    doctors_ref = db.collection("users").where(filter=FieldFilter("role", "==", "doctor"))
    if hospital_id:
        doctors_ref = doctors_ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
    doctor_count = sum(1 for _ in doctors_ref.stream())
    
    # Patient count
    patients_ref = db.collection("users").where(filter=FieldFilter("role", "==", "patient"))
    if hospital_id:
        patients_ref = patients_ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
    patient_count = sum(1 for _ in patients_ref.stream())
    
    return StandardResponse(
        success=True,
        message="Revenue dashboard fetched.",
        data={
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "total_revenue": total_revenue,
            "completed_revenue": completed_revenue,
            "week_revenue": week_revenue,
            "doctor_count": doctor_count,
            "patient_count": patient_count,
            "appointments": appointments,
        },
    )


@router.get("/by-doctor", response_model=StandardResponse)
def get_revenue_by_doctor(hospital_id: Optional[str] = None, payload: dict = Depends(auth_service.require_auth)):
    """Get revenue breakdown by doctor."""
    ref = db.collection("appointments")
    if hospital_id:
        ref = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
    
    revenue_by_doctor = {}
    for doc in ref.stream():
        appt = {"id": doc.id, **doc.to_dict()}
        if appt.get("status") != "completed":
            continue
        
        doctor_id = appt.get("doctor_id", "unknown")
        doctor_name = appt.get("doctor_name", "Unknown Doctor")
        fee = float(appt.get("fee", 0) or 0)
        
        if doctor_id not in revenue_by_doctor:
            revenue_by_doctor[doctor_id] = {
                "doctor_id": doctor_id,
                "doctor_name": doctor_name,
                "total_revenue": 0,
                "appointment_count": 0,
            }
        
        revenue_by_doctor[doctor_id]["total_revenue"] += fee
        revenue_by_doctor[doctor_id]["appointment_count"] += 1
    
    doctors_revenue = list(revenue_by_doctor.values())
    doctors_revenue.sort(key=lambda x: x["total_revenue"], reverse=True)
    
    return StandardResponse(
        success=True,
        message="Revenue by doctor fetched.",
        data={
            "doctors": doctors_revenue,
            "count": len(doctors_revenue),
        },
    )
