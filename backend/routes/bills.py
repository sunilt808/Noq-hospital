# backend/routes/bills.py - Billing Routes (derived from Appointments)

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db, Appointment, Hospital, User
from services.auth_service import require_auth

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bills", tags=["Bills"])


def _appointment_to_bill(appt: Appointment) -> dict:
    """Convert an appointment record into a billing record."""
    fee = float(getattr(appt, "fee", 0) or 0)

    # Map appointment status → bill status
    appt_status = str(appt.status or "").lower()
    if appt_status == "completed":
        bill_status = "paid"
    elif appt_status == "cancelled":
        bill_status = "cancelled"
    else:
        bill_status = "pending"

    return {
        "id": f"BILL-{appt.id}",
        "appointment_id": appt.id,
        "patient_id": appt.patient_id,
        "hospital_id": appt.hospital_id,
        "doctor_id": appt.doctor_id,
        "hospital_name": getattr(appt, "hospital_name", None) or appt.hospital_id,
        "doctor_name": getattr(appt, "doctor_name", None) or "Doctor",
        "description": getattr(appt, "disease", None) or getattr(appt, "department", None) or "Consultation",
        "amount": fee,
        "tax": 0,
        "discount": 0,
        "total": fee,
        "status": bill_status,
        "due_date": appt.appointment_date.isoformat() if appt.appointment_date else None,
        "created_at": appt.created_at.isoformat() if appt.created_at else None,
        "updated_at": appt.updated_at.isoformat() if appt.updated_at else None,
    }


@router.get("/")
def list_bills(
    status_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(require_auth),
):
    """
    Return bills for the currently authenticated patient.
    Bills are derived from the patient's appointment records.
    """
    try:
        user_id = auth_payload.get("sub")
        role = str(auth_payload.get("role", "")).lower()

        # Patients see only their own bills; HM/admin can optionally see all
        query = db.query(Appointment)
        if role == "patient":
            query = query.filter(Appointment.patient_id == user_id)

        appointments = query.order_by(Appointment.created_at.desc()).all()
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/{bill_id}")
def get_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(require_auth),
):
    """Get a single bill by ID (format: BILL-<appointment_id>)."""
    try:
        # Strip BILL- prefix to get appointment id
        appointment_id = bill_id.replace("BILL-", "", 1)
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()

        if not appointment:
            raise HTTPException(status_code=404, detail=f"Bill not found: {bill_id}")

        # Patients can only view their own bills
        user_id = auth_payload.get("sub")
        role = str(auth_payload.get("role", "")).lower()
        if role == "patient" and appointment.patient_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this bill")

        return {"success": True, "data": _appointment_to_bill(appointment)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bill {bill_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
