# backend/routes/revenue.py - Revenue & analytics endpoints for admin/HM

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from database import get_db, Appointment, User
from services.auth_service import require_auth
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/revenue", tags=["Revenue"])


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("/dashboard", response_model=StandardResponse)
def get_revenue_dashboard(
    hospital_id: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(require_auth)
):
    """Get revenue dashboard for hospital admin using SQLite."""
    try:
        # Query appointments from SQLite
        query = db.query(Appointment)
        if hospital_id:
            query = query.filter(Appointment.hospital_id == hospital_id)
        
        appointments = query.all()
        
        # Calculate totals
        total_appointments = len(appointments)
        completed_appointments = len([a for a in appointments if a.status == "completed"])
        
        # Calculate revenue
        total_revenue = sum(float(a.fee or 0) for a in appointments)
        completed_revenue = sum(
            float(a.fee or 0) 
            for a in appointments 
            if a.status == "completed"
        )
        
        # Last 7 days revenue
        today = datetime.utcnow()
        week_ago = today - timedelta(days=7)
        week_revenue = sum(
            float(a.fee or 0) 
            for a in appointments 
            if a.status == "completed" 
            and a.appointment_date 
            and a.appointment_date >= week_ago
        )
        
        # Doctor count
        doctor_count = db.query(User).filter(
            User.role == "doctor"
        ).count()
        if hospital_id:
            doctor_count = db.query(User).filter(
                User.role == "doctor",
                User.hospital_id == hospital_id
            ).count()
        
        # Patient count
        patient_count = db.query(User).filter(
            User.role == "patient"
        ).count()
        if hospital_id:
            patient_count = db.query(User).filter(
                User.role == "patient",
                User.hospital_id == hospital_id
            ).count()
        
        return StandardResponse(
            success=True,
            message="Revenue dashboard fetched.",
            data={
                "total_appointments": total_appointments,
                "completed_appointments": completed_appointments,
                "total_revenue": float(total_revenue),
                "completed_revenue": float(completed_revenue),
                "week_revenue": float(week_revenue),
                "doctor_count": doctor_count,
                "patient_count": patient_count,
            },
        )
    except Exception as e:
        logger.error(f"Error fetching revenue dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch revenue dashboard"
        )


@router.get("/by-doctor", response_model=StandardResponse)
def get_revenue_by_doctor(
    hospital_id: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(require_auth)
):
    """Get revenue breakdown by doctor using SQLite."""
    try:
        # Query completed appointments from SQLite
        query = db.query(Appointment).filter(Appointment.status == "completed")
        if hospital_id:
            query = query.filter(Appointment.hospital_id == hospital_id)
        
        completed_appointments = query.all()
        
        # Group by doctor and sum revenue
        revenue_by_doctor = {}
        for appt in completed_appointments:
            if not appt.doctor_id:
                continue
            
            doctor_id = appt.doctor_id
            doctor_name = appt.doctor_name or "Unknown"
            fee = float(appt.fee or 0)
            
            if doctor_id not in revenue_by_doctor:
                revenue_by_doctor[doctor_id] = {
                    "doctor_id": doctor_id,
                    "doctor_name": doctor_name,
                    "total_revenue": 0,
                    "appointment_count": 0,
                }
            
            revenue_by_doctor[doctor_id]["total_revenue"] += fee
            revenue_by_doctor[doctor_id]["appointment_count"] += 1
        
        # Sort by revenue descending
        doctors_revenue = sorted(
            revenue_by_doctor.values(),
            key=lambda x: x["total_revenue"],
            reverse=True
        )
        
        return StandardResponse(
            success=True,
            message="Revenue by doctor fetched.",
            data={
                "doctors": doctors_revenue,
                "count": len(doctors_revenue),
            },
        )
    except Exception as e:
        logger.error(f"Error fetching revenue by doctor: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch revenue by doctor"
        )
