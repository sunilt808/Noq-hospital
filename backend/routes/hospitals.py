# backend/routes/hospitals.py - Hospital Management Routes

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db, Hospital
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


class HospitalResponse(BaseModel):
    """Hospital response model."""
    id: str
    name: str
    address: str = None
    phone: str = None
    email: str = None
    city: str = None
    state: str = None
    pincode: str = None
    status: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[HospitalResponse])
def list_hospitals(db: Session = Depends(get_db)):
    """List all hospitals."""
    try:
        hospitals = db.query(Hospital).filter(Hospital.status == "active").all()
        return hospitals
    except Exception as e:
        logger.error(f"Error listing hospitals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital(hospital_id: str, db: Session = Depends(get_db)):
    """Get hospital by ID."""
    try:
        hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hospital not found: {hospital_id}"
            )
        return hospital
    except Exception as e:
        logger.error(f"Error getting hospital: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
