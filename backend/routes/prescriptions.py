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
    patient_name: Optional[str] = ""
    doctor_id: str
    doctor_name: Optional[str] = ""
    hospital_name: Optional[str] = ""
    appointment_id: Optional[str] = None
    medicines: Optional[list] = None
    medicine: Optional[str] = None
    instructions: Optional[str] = None
    prescription: Optional[str] = None
    status: Optional[str] = "active"


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


async def _serialize_presc(p: dict) -> dict:
    p["id"] = str(p.get("_id", p.get("id")))
    # Add date aliases for frontend compatibility
    presc_date = p.get("date")
    if presc_date:
        p["createdAt"] = presc_date
        p["created_at"] = presc_date
    
    # Enrich names if missing
    if not p.get("doctor_name") and p.get("doctor_id"):
        doc = await mongodb.users.find_one({"_id": p["doctor_id"]})
        if doc:
            p["doctor_name"] = doc.get("full_name") or doc.get("name") or "Doctor"
    
    if not p.get("hospital_name") and p.get("doctor_id"):
        # Fetch doctor's hospital
        doc = await mongodb.users.find_one({"_id": p["doctor_id"]})
        if doc and doc.get("hospital_id"):
            hosp = await mongodb.hospitals.find_one({"_id": doc["hospital_id"]})
            if hosp:
                p["hospital_name"] = hosp.get("hospital_name") or hosp.get("name") or "Hospital"

    # Compatibility mapping for medicine and instructions
    if p.get("medicine"):
        p["medicines"] = [p.get("medicine")]
    if p.get("prescription"):
        p["instructions"] = p.get("prescription")
    return p


@router.get("/my", response_model=StandardResponse)
async def get_my_prescriptions(payload: dict = Depends(auth_service.require_auth)):
    """Get prescriptions for current user (patient) from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        user_id = payload.get("sub")
        cursor = mongodb.prescriptions.find({"patient_id": user_id}).sort("created_at", -1)
        prescriptions = await cursor.to_list(length=1000)
        
        serialized = []
        for p in prescriptions:
            serialized.append(await _serialize_presc(p))

        return StandardResponse(
            success=True,
            message="Prescriptions fetched.",
            data={"prescriptions": serialized, "count": len(serialized)},
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
        
        serialized = []
        for p in prescriptions:
            serialized.append(await _serialize_presc(p))

        return StandardResponse(
            success=True,
            message="Prescriptions fetched.",
            data={"prescriptions": serialized, "count": len(serialized)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=StandardResponse, status_code=201)
async def create_prescription(presc: PrescriptionCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a new prescription in MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        prescription_id = f"RX-{uuid.uuid4().hex[:12].upper()}"
        
        # Flexibly handle medicines/medicine
        medicines = presc.medicines or ([presc.medicine] if presc.medicine else [])
        # Flexibly handle instructions/prescription
        instructions = presc.instructions or presc.prescription or ""
        
        prescription_doc = {
            "_id": prescription_id,
            "id": prescription_id,
            "patient_id": presc.patient_id,
            "patient_name": presc.patient_name or "",
            "doctor_id": presc.doctor_id,
            "doctor_name": presc.doctor_name or "",
            "hospital_name": presc.hospital_name or "",
            "appointment_id": presc.appointment_id or "",
            "medicines": medicines,
            "medicine": presc.medicine or (medicines[0] if medicines else ""),
            "instructions": instructions,
            "prescription": instructions,
            "status": presc.status or "active",
            "created_at": datetime.utcnow(),
            "date": datetime.utcnow().isoformat(),
        }
        
        await mongodb.prescriptions.insert_one(prescription_doc)
        serialized = await _serialize_presc(prescription_doc)
        return StandardResponse(
            success=True,
            message="Prescription created.",
            data={"prescription": serialized},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
