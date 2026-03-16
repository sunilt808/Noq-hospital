# backend/routes/prescriptions.py - Prescription management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional
from database import db
from google.cloud.firestore_v1.base_query import FieldFilter

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


@router.get("/my", response_model=StandardResponse)
def get_my_prescriptions(payload: dict = Depends(auth_service.require_auth)):
    """Get prescriptions for current user (patient)."""
    try:
        user_id = payload.get("sub")
        ref = db.collection("prescriptions").where(filter=FieldFilter("patient_id", "==", user_id))
        prescriptions = []
        for doc in ref.stream():
            prescriptions.append({"id": doc.id, **doc.to_dict()})
        prescriptions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return StandardResponse(
            success=True,
            message="Prescriptions fetched.",
            data={"prescriptions": prescriptions, "count": len(prescriptions)},
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unable to fetch prescriptions from server: {str(e)}")


@router.get("/doctor/my", response_model=StandardResponse)
def get_doctor_prescriptions(payload: dict = Depends(auth_service.require_auth)):
    """Get prescriptions created by current doctor."""
    doctor_id = payload.get("sub")
    ref = db.collection("prescriptions").where(filter=FieldFilter("doctor_id", "==", doctor_id))
    prescriptions = []
    for doc in ref.stream():
        prescriptions.append({"id": doc.id, **doc.to_dict()})
    
    prescriptions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return StandardResponse(
        success=True,
        message="Prescriptions fetched.",
        data={"prescriptions": prescriptions, "count": len(prescriptions)},
    )


@router.post("", response_model=StandardResponse, status_code=201)
def create_prescription(presc: PrescriptionCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a new prescription."""
    from datetime import datetime
    import uuid
    
    prescription_id = f"RX-{uuid.uuid4().hex[:12].upper()}"
    prescription_doc = {
        "id": prescription_id,
        "patient_id": presc.patient_id,
        "doctor_id": presc.doctor_id,
        "appointment_id": presc.appointment_id,
        "medicines": presc.medicines,
        "instructions": presc.instructions or "",
        "status": "active",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    
    db.collection("prescriptions").document(prescription_id).set(prescription_doc)
    return StandardResponse(
        success=True,
        message="Prescription created.",
        data={"prescription": prescription_doc},
    )
