# backend/routes/prescriptions.py - Prescription management endpoints (MongoDB)

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from database import mongodb

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


class PrescriptionCreate(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_id: str
    medicines: list
    instructions: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


def _serialize_presc(p: dict) -> dict:
    p["id"] = str(p.get("_id", p.get("id")))
    for field in ["created_at"]:
        if field in p and isinstance(p[field], datetime):
            p[field] = p[field].isoformat()
    return p


@router.get("/my", response_model=StandardResponse)
async def get_my_prescriptions(payload: dict = Depends(auth_service.require_auth)):
    """Get prescriptions for current user (patient) from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        user_id = payload.get("sub")
        cursor = mongodb.prescriptions.find({"patient_id": user_id}).sort("created_at", -1)
        prescriptions = await cursor.to_list(length=1000)
        return StandardResponse(
            success=True,
            message="Prescriptions fetched.",
            data={"prescriptions": [_serialize_presc(p) for p in prescriptions], "count": len(prescriptions)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/doctor/my", response_model=StandardResponse)
async def get_doctor_prescriptions(payload: dict = Depends(auth_service.require_auth)):
    """Get prescriptions created by current doctor from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        doctor_id = payload.get("sub")
        cursor = mongodb.prescriptions.find({"doctor_id": doctor_id}).sort("created_at", -1)
        prescriptions = await cursor.to_list(length=1000)
        return StandardResponse(
            success=True,
            message="Prescriptions fetched.",
            data={"prescriptions": [_serialize_presc(p) for p in prescriptions], "count": len(prescriptions)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=StandardResponse, status_code=201)
async def create_prescription(presc: PrescriptionCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a new prescription in MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        prescription_id = f"RX-{uuid.uuid4().hex[:12].upper()}"
        prescription_doc = {
            "_id": prescription_id,
            "id": prescription_id,
            "patient_id": presc.patient_id,
            "doctor_id": presc.doctor_id,
            "appointment_id": presc.appointment_id,
            "medicines": presc.medicines,
            "instructions": presc.instructions or "",
            "status": "active",
            "created_at": datetime.utcnow(),
        }
        
        await mongodb.prescriptions.insert_one(prescription_doc)
        return StandardResponse(
            success=True,
            message="Prescription created.",
            data={"prescription": _serialize_presc(prescription_doc)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
