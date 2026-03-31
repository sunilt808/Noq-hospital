# backend/routes/appointments.py - Appointment Management Routes (MongoDB)

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Request
from database import mongodb
from services.auth_service import require_auth
from pydantic import BaseModel
from datetime import datetime
import uuid
from audit import AuditLogger

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
    appointment_type: Optional[str] = "regular"
    status: str
    notes: Optional[str] = None
    fee: Optional[float] = None
    token_number: Optional[Any] = None
    created_at: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: str


def _serialize_appointment(appt: dict) -> dict:
    appt["id"] = str(appt.get("_id", appt.get("id")))
    for field in ["created_at", "updated_at", "appointment_date"]:
        if field in appt and isinstance(appt[field], datetime):
            appt[field] = appt[field].isoformat()
    return appt


@router.get("/my")
async def get_my_appointments(auth_payload: dict = Depends(require_auth)):
    """Get appointments for the current authenticated user (patient or doctor) from MongoDB."""
    try:
        if mongodb is None: return {"appointments": [], "total": 0}
        user_id = auth_payload.get("sub")
        role = auth_payload.get("role", "")

        query = {}
        if role == "doctor":
            # In MongoDB, doctor records might be separate or merged with user
            # Assuming doctor_id in appointment refers to the doctor's user ID for simplicity
            # OR we find if there's a doctor profile
            query["doctor_id"] = user_id
        else:
            query["patient_id"] = user_id

        cursor = mongodb.appointments.find(query).sort("created_at", -1)
        appointments = await cursor.to_list(length=1000)

        return {
            "appointments": [_serialize_appointment(a) for a in appointments],
            "total": len(appointments)
        }
    except Exception as e:
        logger.error(f"Error fetching my appointments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=List[AppointmentResponse])
async def list_appointments(
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    hospital_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    auth_payload: dict = Depends(require_auth)
):
    """List appointments with filters from MongoDB."""
    try:
        if mongodb is None: return []
        query = {}
        if patient_id: query["patient_id"] = patient_id
        if hospital_id: query["hospital_id"] = hospital_id
        if doctor_id: query["doctor_id"] = doctor_id
        if status_filter: query["status"] = status_filter

        cursor = mongodb.appointments.find(query).sort("created_at", -1)
        appointments = await cursor.to_list(length=1000)
        return [_serialize_appointment(a) for a in appointments]
    except Exception as e:
        logger.error(f"Error listing appointments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: str, auth_payload: dict = Depends(require_auth)):
    """Get appointment by ID from MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        appointment = await mongodb.appointments.find_one({"_id": appointment_id})
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return _serialize_appointment(appointment)
    except Exception as e:
        logger.error(f"Error getting appointment: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{appointment_id}")
async def update_appointment_status(
    appointment_id: str,
    update: AppointmentStatusUpdate,
    request: Request,
    auth_payload: dict = Depends(require_auth)
):
    """Update appointment status in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        
        result = await mongodb.appointments.update_one(
            {"_id": appointment_id},
            {"$set": {"status": update.status, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log(
            action="UPDATE",
            entity_type="Appointment",
            entity_id=appointment_id,
            new_values={"status": update.status},
            ip_address=client_ip,
        )
        
        updated_appt = await mongodb.appointments.find_one({"_id": appointment_id})
        return _serialize_appointment(updated_appt)
    except Exception as e:
        logger.error(f"Error updating appointment: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("")
async def create_appointment(
    payload: dict,
    request: Request,
    auth_payload: dict = Depends(require_auth)
):
    """Create a new appointment in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        
        # Fees normalization
        fees_obj = payload.get("fees", {})
        total_fee = float(fees_obj.get("total", payload.get("fee", 0.0)))
        
        # Date normalization
        appt_date_str = payload.get("appointmentDate") or payload.get("appointment_date")
        appt_date = datetime.utcnow()
        if appt_date_str:
            try:
                appt_date = datetime.fromisoformat(appt_date_str.replace("Z", "+00:00"))
            except:
                pass

        # Token normalization
        token_obj = payload.get("token", {})
        token_number = token_obj.get("tokenNumber") or payload.get("tokenNumber") or token_obj.get("id") or str(token_obj)
        
        appt_id = payload.get("id") or f"APT-{uuid.uuid4().hex[:8].upper()}"

        appt_doc = {
            "_id": appt_id,
            "hospital_id": payload.get("hospitalId") or payload.get("hospital_id", ""),
            "doctor_id": payload.get("doctorId") or payload.get("doctor_id", ""),
            "patient_id": payload.get("patientId") or payload.get("patient_id", ""),
            "appointment_date": appt_date,
            "appointment_time": payload.get("appointmentTime") or payload.get("appointment_time", ""),
            "appointment_type": payload.get("appointment_type", "regular"),
            "doctor_name": payload.get("doctorName") or payload.get("doctor_name", ""),
            "department": payload.get("departmentName") or payload.get("department", ""),
            "disease": payload.get("diseaseName") or payload.get("diseaseId") or payload.get("disease", ""),
            "fee": total_fee,
            "token_number": token_number,
            "status": payload.get("status", "confirmed"),
            "notes": payload.get("notes", ""),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        await mongodb.appointments.insert_one(appt_doc)
        
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log(
            action="CREATE",
            entity_type="Appointment",
            entity_id=appt_id,
            new_values={"status": appt_doc["status"], "patient_id": appt_doc["patient_id"]},
            ip_address=client_ip,
        )
        
        return {"success": True, "message": "Appointment created", "data": _serialize_appointment(appt_doc)}
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
