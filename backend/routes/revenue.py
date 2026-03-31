# backend/routes/revenue.py - Revenue & analytics endpoints for admin/HM (MongoDB)

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List
from database import mongodb
from services.auth_service import require_auth
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/revenue", tags=["Revenue"])


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("/dashboard", response_model=StandardResponse)
async def get_revenue_dashboard(
    hospital_id: Optional[str] = None,
    auth_payload: dict = Depends(require_auth)
):
    """Get revenue dashboard for hospital admin from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        query = {}
        if hospital_id:
            query["hospital_id"] = hospital_id
        
        cursor = mongodb.appointments.find(query)
        appointments = await cursor.to_list(length=5000)
        
        # Calculate totals
        total_appointments = len(appointments)
        completed_appointments = len([a for a in appointments if a.get("status") == "completed"])
        
        # Calculate revenue
        total_revenue = sum(float(a.get("fee", 0) or 0) for a in appointments)
        completed_revenue = sum(
            float(a.get("fee", 0) or 0) 
            for a in appointments 
            if a.get("status") == "completed"
        )
        
        # Last 7 days revenue
        today = datetime.utcnow()
        week_ago = today - timedelta(days=7)
        week_revenue = sum(
            float(a.get("fee", 0) or 0) 
            for a in appointments 
            if a.get("status") == "completed" 
            and isinstance(a.get("appointment_date"), datetime)
            and a.get("appointment_date") >= week_ago
        )
        
        # Doctor count
        doc_query = {"role": "doctor"}
        if hospital_id: doc_query["hospital_id"] = hospital_id
        doctor_count = await mongodb.users.count_documents(doc_query)
        
        # Patient count
        pat_query = {"role": "patient"}
        if hospital_id: pat_query["hospital_id"] = hospital_id
        patient_count = await mongodb.users.count_documents(pat_query)
        
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
        raise HTTPException(status_code=500, detail="Failed to fetch revenue dashboard")


@router.get("/by-doctor", response_model=StandardResponse)
async def get_revenue_by_doctor(
    hospital_id: Optional[str] = None,
    auth_payload: dict = Depends(require_auth)
):
    """Get revenue breakdown by doctor from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        query = {"status": "completed"}
        if hospital_id:
            query["hospital_id"] = hospital_id
        
        cursor = mongodb.appointments.find(query)
        completed_appointments = await cursor.to_list(length=5000)
        
        # Group by doctor and sum revenue
        revenue_by_doctor = {}
        for appt in completed_appointments:
            doctor_id = appt.get("doctor_id")
            if not doctor_id:
                continue
            
            doctor_name = appt.get("doctor_name") or "Unknown"
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
        raise HTTPException(status_code=500, detail="Failed to fetch revenue by doctor")
