# backend/routes/diseases.py - Disease management endpoints (MongoDB)

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional, List
from database import mongodb
from datetime import datetime
import uuid

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


def _serialize_dis(d: dict) -> dict:
    d["id"] = str(d.get("_id", d.get("id")))
    for field in ["created_at"]:
        if field in d and isinstance(d[field], datetime):
            d[field] = d[field].isoformat()
    return d


@router.get("", response_model=StandardResponse)
async def get_diseases(hospital_id: Optional[str] = None, department_id: Optional[str] = None):
    """Get diseases/specialties from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=True, message="Success", data={"diseases": [], "count": 0})
        query = {}
        if hospital_id:
            query["hospital_id"] = hospital_id
        if department_id:
            query["department_id"] = department_id
        
        cursor = mongodb.diseases.find(query).sort("name", 1)
        diseases = await cursor.to_list(length=1000)
        return StandardResponse(
            success=True,
            message="Diseases fetched.",
            data={"diseases": [_serialize_dis(d) for d in diseases], "count": len(diseases)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=StandardResponse, status_code=201)
async def create_disease(disease: DiseaseCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a disease/specialty mapping in MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        disease_id = f"DIS-{uuid.uuid4().hex[:12].upper()}"
        disease_doc = {
            "_id": disease_id,
            "id": disease_id,
            "name": disease.name,
            "department_id": disease.department_id,
            "hospital_id": disease.hospital_id or "",
            "icon": disease.icon or "",
            "severity": disease.severity,
            "status": "active",
            "created_at": datetime.utcnow(),
        }
        
        await mongodb.diseases.insert_one(disease_doc)
        return StandardResponse(
            success=True,
            message="Disease created.",
            data={"disease": _serialize_dis(disease_doc)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{disease_id}", response_model=StandardResponse)
async def update_disease(disease_id: str, updates: dict, payload: dict = Depends(auth_service.require_auth)):
    """Update a disease in MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        allowed_updates = {"name", "department_id", "icon", "severity", "status"}
        safe_updates = {k: v for k, v in updates.items() if k in allowed_updates}
        
        result = await mongodb.diseases.update_one({"_id": disease_id}, {"$set": safe_updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Disease not found.")
        
        updated_doc = await mongodb.diseases.find_one({"_id": disease_id})
        return StandardResponse(
            success=True,
            message="Disease updated.",
            data={"disease": _serialize_dis(updated_doc)},
        )
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{disease_id}", response_model=StandardResponse)
async def delete_disease(disease_id: str, payload: dict = Depends(auth_service.require_auth)):
    """Delete a disease in MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        result = await mongodb.diseases.delete_one({"_id": disease_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Disease not found.")
        
        return StandardResponse(success=True, message="Disease deleted.", data={})
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
