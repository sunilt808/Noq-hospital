# backend/routes/hospitals.py - Hospital management endpoints

from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.hospital import HospitalCreate, HospitalUpdate, HospitalStatusUpdate
from services import user_service, auth_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.post("/register", response_model=StandardResponse, status_code=201)
def register_hospital(hospital: HospitalCreate):
    """Register a new hospital (HM self-registration)."""
    existing = user_service.get_user_by_email(hospital.email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    new_hospital = user_service.create_hospital(hospital.model_dump())
    hm_user = user_service.create_user({
        "name": hospital.hm_name,
        "email": hospital.email,
        "role": "hm",
        "phone": hospital.phone,
        "gender": hospital.hm_gender,
        "dob": hospital.hm_dob,
        "password": hospital.password,
        "hospital_id": new_hospital["id"],
        "status": "pending",
    })

    return StandardResponse(
        success=True,
        message="Hospital registration submitted. Pending admin approval.",
        data={"hospital": new_hospital, "hm_user_id": hm_user.get("id")},
    )


@router.get("", response_model=StandardResponse)
def get_hospitals(status_filter: Optional[str] = Query(None, alias="status"), payload: dict = Depends(auth_service.require_auth)):
    """Get all hospitals. Admin only."""
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")

    hospitals = user_service.get_all_hospitals(status=status_filter)
    return StandardResponse(
        success=True,
        message="Hospitals fetched.",
        data={"hospitals": hospitals, "count": len(hospitals)},
    )


@router.get("/available", response_model=StandardResponse)
def get_available_hospitals():
    """Get hospitals available for booking. Public endpoint - no auth required."""
    hospitals = user_service.get_all_hospitals()
    allowed_statuses = {"approved", "active"}
    
    filtered = [
        hospital for hospital in hospitals
        if str(hospital.get("status") or "").strip().lower() in allowed_statuses
    ]
    
    return StandardResponse(
        success=True,
        message="Available hospitals fetched.",
        data={"hospitals": filtered, "count": len(filtered)},
    )


@router.get("/{hospital_id}", response_model=StandardResponse)
def get_hospital(hospital_id: str, payload: dict = Depends(auth_service.require_auth)):
    """Get a hospital by ID."""
    caller_role = payload.get("role")
    caller_hospital_id = payload.get("hospital_id")
    
    if caller_role != "admin" and caller_hospital_id != hospital_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    
    hospital = user_service.get_hospital_by_id(hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    
    return StandardResponse(success=True, message="Hospital fetched.", data=hospital)


@router.patch("/{hospital_id}/status", response_model=StandardResponse)
def update_hospital_status(hospital_id: str, req: HospitalStatusUpdate, payload: dict = Depends(auth_service.require_auth)):
    """Update hospital status."""
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    
    hospital = user_service.update_hospital_status(hospital_id, req.status.value, req.message or "")
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    
    return StandardResponse(success=True, message=f"Hospital status updated.", data=hospital)
