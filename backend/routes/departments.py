# backend/routes/departments.py - Department management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional
from database import db
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime
import uuid

router = APIRouter(prefix="/departments", tags=["Departments"])


class DepartmentCreate(BaseModel):
    name: str
    hospital_id: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "active"


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("", response_model=StandardResponse)
def get_departments(hospital_id: Optional[str] = None):
    """Get departments - PUBLIC endpoint for patient booking."""
    from services import user_service
    
    try:
        departments = user_service.get_all_departments(hospital_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    
    # Filter by status
    departments = [d for d in departments if d.get("status", "active").lower() in ["active", "approved"]]
    
    return StandardResponse(
        success=True,
        message="Departments fetched.",
        data={"departments": departments, "count": len(departments)}
    )


@router.get("/{hospital_id}", response_model=StandardResponse)
def get_hospital_departments(hospital_id: str):
    """Get departments for a specific hospital."""
    from services import user_service
    
    try:
        departments = user_service.get_all_departments(hospital_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    
    return StandardResponse(
        success=True,
        message="Departments fetched.",
        data={"departments": departments, "count": len(departments)}
    )


@router.post("", response_model=StandardResponse, status_code=201)
def create_department(dept: DepartmentCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a department."""
    department_id = f"DEPT-{uuid.uuid4().hex[:12].upper()}"
    department_doc = {
        "id": department_id,
        "name": dept.name,
        "hospital_id": dept.hospital_id or payload.get("hospital_id") or "",
        "description": dept.description or "",
        "status": (dept.status or "active").lower(),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    db.collection("departments").document(department_id).set(department_doc)
    return StandardResponse(success=True, message="Department created.", data={"department": department_doc})


@router.put("/{department_id}", response_model=StandardResponse)
def update_department(department_id: str, updates: DepartmentUpdate, payload: dict = Depends(auth_service.require_auth)):
    """Update a department."""
    ref = db.collection("departments").document(department_id)
    snapshot = ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Department not found.")

    update_doc = {
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    if updates.name is not None:
        update_doc["name"] = updates.name
    if updates.description is not None:
        update_doc["description"] = updates.description
    if updates.status is not None:
        update_doc["status"] = updates.status.lower()

    ref.update(update_doc)
    fresh = ref.get().to_dict() or {}
    return StandardResponse(success=True, message="Department updated.", data={"department": {"id": department_id, **fresh}})


@router.patch("/{department_id}", response_model=StandardResponse)
def patch_department(department_id: str, updates: DepartmentUpdate, payload: dict = Depends(auth_service.require_auth)):
    """Patch a department (alias for update)."""
    return update_department(department_id, updates, payload)


@router.delete("/{department_id}", response_model=StandardResponse)
def delete_department(department_id: str, payload: dict = Depends(auth_service.require_auth)):
    """Delete a department."""
    ref = db.collection("departments").document(department_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Department not found.")
    ref.delete()
    return StandardResponse(success=True, message="Department deleted.", data={"id": department_id})
