# backend/routes/departments.py - Department management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/departments", tags=["Departments"])


class DepartmentCreate(BaseModel):
    name: str
    hospital_id: Optional[str] = None
    description: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("", response_model=StandardResponse)
def get_departments(hospital_id: Optional[str] = None):
    """Get departments - PUBLIC endpoint for patient booking."""
    from services import user_service
    
    departments = user_service.get_all_departments(hospital_id)
    
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
    
    departments = user_service.get_all_departments(hospital_id)
    
    return StandardResponse(
        success=True,
        message="Departments fetched.",
        data={"departments": departments, "count": len(departments)}
    )


@router.post("", response_model=StandardResponse, status_code=201)
def create_department(dept: DepartmentCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a department."""
    return StandardResponse(success=True, message="Department created.", data={"department": dept.model_dump()})
