# backend/routes/bills.py - Billing Routes (derived from Appointments MongoDB)

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from database import mongodb
from services.auth_service import require_auth
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bills", tags=["Bills"])


def _appointment_to_bill(appt: dict) -> dict:
    """Convert an appointment document into a billing record."""
    fee = float(appt.get("fee", 0) or 0)
    appt_id = str(appt.get("_id", appt.get("id")))

    # Map appointment status → bill status
    appt_status = str(appt.get("status", "")).lower()
    if appt_status == "completed":
        bill_status = "paid"
    elif appt_status == "cancelled":
        bill_status = "cancelled"
    else:
        bill_status = "pending"

    return {
        "id": f"BILL-{appt_id}",
        "appointment_id": appt_id,
        "patient_id": appt.get("patient_id"),
        "hospital_id": appt.get("hospital_id"),
        "doctor_id": appt.get("doctor_id"),
        "hospital_name": appt.get("hospital_name") or appt.get("hospital_id"),
        "doctor_name": appt.get("doctor_name") or "Doctor",
        "description": appt.get("disease") or appt.get("department") or "Consultation",
        "amount": fee,
        "tax": 0,
        "discount": 0,
        "total": fee,
        "status": bill_status,
        "due_date": appt.get("appointment_date").isoformat() if isinstance(appt.get("appointment_date"), datetime) else appt.get("appointment_date"),
        "created_at": appt.get("created_at").isoformat() if isinstance(appt.get("created_at"), datetime) else appt.get("created_at"),
        "updated_at": appt.get("updated_at").isoformat() if isinstance(appt.get("updated_at"), datetime) else appt.get("updated_at"),
    }


@router.get("/")
async def list_bills(
    status_filter: Optional[str] = None,
    auth_payload: dict = Depends(require_auth),
):
    """
    Return bills for the currently authenticated patient from MongoDB.
    Bills are derived from the patient's appointment records.
    """
    try:
        if mongodb is None: return {"success": False, "data": {"bills": []}}
        user_id = auth_payload.get("sub")
        role = str(auth_payload.get("role", "")).lower()

        query = {}
        if role == "patient":
            query["patient_id"] = user_id

        cursor = mongodb.appointments.find(query).sort("created_at", -1)
        appointments = await cursor.to_list(length=1000)
        bills = [_appointment_to_bill(a) for a in appointments]

        # Optional status filter
        if status_filter:
            bills = [b for b in bills if b["status"] == status_filter.lower()]

        return {
            "success": True,
            "data": {"bills": bills},
            "total": len(bills),
        }

    except Exception as e:
        logger.error(f"Error fetching bills: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{bill_id}")
async def get_bill(
    bill_id: str,
    auth_payload: dict = Depends(require_auth),
):
    """Get a single bill by ID (format: BILL-<appointment_id>) from MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        
        # Strip BILL- prefix to get appointment id
        appointment_id = bill_id.replace("BILL-", "", 1)
        appointment = await mongodb.appointments.find_one({"_id": appointment_id})

        if not appointment:
            raise HTTPException(status_code=404, detail=f"Bill not found: {bill_id}")

        # Patients can only view their own bills
        user_id = auth_payload.get("sub")
        role = str(auth_payload.get("role", "")).lower()
        if role == "patient" and appointment.get("patient_id") != user_id:
            # Check by patient_id precisely
            if appointment.get("patient_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to view this bill")

        return {"success": True, "data": _appointment_to_bill(appointment)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bill {bill_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
