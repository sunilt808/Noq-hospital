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


async def record_revenue_distribution(appointment: dict):
    """Calculate and store revenue distribution for a completed appointment."""
    try:
        if mongodb is None: return
        
        fee = float(appointment.get("fee", 0) or 0)
        if fee <= 0: return

        # Distribution logic: 15% Doctor, 80% HM, 5% Admin
        doctor_amt = fee * 0.15
        hm_amt = fee * 0.80
        admin_amt = fee * 0.05

        distribution = {
            "appointment_id": str(appointment.get("_id", appointment.get("id"))),
            "hospital_id": appointment.get("hospital_id"),
            "doctor_id": appointment.get("doctor_id"),
            "patient_id": appointment.get("patient_id"),
            "total_fee": fee,
            "doctor_amt": doctor_amt,
            "hm_amt": hm_amt,
            "admin_amt": admin_amt,
            "status": "recorded",
            "created_at": datetime.utcnow()
        }

        await mongodb.revenue_distributions.update_one(
            {"appointment_id": distribution["appointment_id"]},
            {"$set": distribution},
            upsert=True
        )
        logger.info(f"Revenue distribution recorded for appointment {distribution['appointment_id']}")
    except Exception as e:
        logger.error(f"Error recording revenue distribution: {e}")


@router.get("/distribution", response_model=StandardResponse)
async def get_revenue_distribution(
    hospital_id: Optional[str] = None,
    auth_payload: dict = Depends(require_auth)
):
    """Get aggregated revenue distribution breakdown from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        query = {}
        if hospital_id:
            query["hospital_id"] = hospital_id
        
        cursor = mongodb.revenue_distributions.find(query)
        distributions = await cursor.to_list(length=5000)
        
        total_revenue = sum(d.get("total_fee", 0) for d in distributions)
        total_doctor = sum(d.get("doctor_amt", 0) for d in distributions)
        total_hm = sum(d.get("hm_amt", 0) for d in distributions)
        total_admin = sum(d.get("admin_amt", 0) for d in distributions)
        
        return StandardResponse(
            success=True,
            message="Revenue distribution breakdown fetched.",
            data={
                "total_revenue": float(total_revenue),
                "doctor_share": float(total_doctor),
                "hm_share": float(total_hm),
                "admin_share": float(total_admin),
                "count": len(distributions)
            },
        )
    except Exception as e:
        logger.error(f"Error fetching revenue distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch revenue distribution")


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
        
        # Distribution sums from appointments directly (fallback/live)
        # Using 70/20/10 logic
        doctor_share = completed_revenue * 0.70
        hm_share = completed_revenue * 0.20
        admin_share = completed_revenue * 0.10

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
                "doctor_share": float(doctor_share),
                "hm_share": float(hm_share),
                "admin_share": float(admin_share),
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
                    "doctor_share": 0,
                    "appointment_count": 0,
                }
            
            revenue_by_doctor[doctor_id]["total_revenue"] += fee
            revenue_by_doctor[doctor_id]["doctor_share"] += fee * 0.70
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
