# backend/routes/diseases.py - Disease management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional
from firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter

router = APIRouter(prefix="/diseases", tags=["Diseases"])


class DiseaseCreate(BaseModel):
    name: str
    department_id: str
    hospital_id: Optional[str] = None
    icon: Optional[str] = None
    severity: Optional[str] = "standard"


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("", response_model=StandardResponse)
def get_diseases(hospital_id: Optional[str] = None, department_id: Optional[str] = None):
    """Get diseases/specialties - PUBLIC endpoint for patient booking."""
    ref = db.collection("diseases")
    
    if hospital_id:
        ref = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
    if department_id:
        ref = ref.where(filter=FieldFilter("department_id", "==", department_id))
    
    diseases = []
    for doc in ref.stream():
        diseases.append({"id": doc.id, **doc.to_dict()})
    
    diseases.sort(key=lambda x: x.get("name", ""))
    return StandardResponse(
        success=True,
        message="Diseases fetched.",
        data={"diseases": diseases, "count": len(diseases)},
    )


@router.post("", response_model=StandardResponse, status_code=201)
def create_disease(disease: DiseaseCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a disease/specialty mapping."""
    from datetime import datetime
    import uuid
    
    disease_id = f"DIS-{uuid.uuid4().hex[:12].upper()}"
    disease_doc = {
        "id": disease_id,
        "name": disease.name,
        "department_id": disease.department_id,
        "hospital_id": disease.hospital_id or "",
        "icon": disease.icon or "",
        "severity": disease.severity,
        "status": "active",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    
    db.collection("diseases").document(disease_id).set(disease_doc)
    return StandardResponse(
        success=True,
        message="Disease created.",
        data={"disease": disease_doc},
    )


@router.patch("/{disease_id}", response_model=StandardResponse)
def update_disease(disease_id: str, updates: dict, payload: dict = Depends(auth_service.require_auth)):
    """Update a disease."""
    ref = db.collection("diseases").document(disease_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Disease not found.")
    
    allowed_updates = {"name", "department_id", "icon", "severity", "status"}
    safe_updates = {k: v for k, v in updates.items() if k in allowed_updates}
    
    ref.update(safe_updates)
    updated_doc = ref.get().to_dict() or {}
    return StandardResponse(
        success=True,
        message="Disease updated.",
        data={"disease": {"id": disease_id, **updated_doc}},
    )


@router.delete("/{disease_id}", response_model=StandardResponse)
def delete_disease(disease_id: str, payload: dict = Depends(auth_service.require_auth)):
    """Delete a disease."""
    ref = db.collection("diseases").document(disease_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Disease not found.")
    
    ref.delete()
    return StandardResponse(success=True, message="Disease deleted.", data={})
