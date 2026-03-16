# backend/routes/hospitals.py - Hospital Management Routes

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db, Hospital, User
from pydantic import BaseModel, EmailStr
from uuid import uuid4
from datetime import datetime
from typing import Optional

from services.auth_service import UserService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


class HospitalResponse(BaseModel):
    """Hospital response model."""
    id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class HospitalRegisterRequest(BaseModel):
    hospital_name: str
    hm_name: str
    hm_gender: str
    hm_dob: str
    email: EmailStr
    phone: str
    password: str
    category: str
    address: str = None


class HospitalStatusRequest(BaseModel):
    status: str
    message: str = None


class NotificationRequest(BaseModel):
    title: str
    message: str
    hospital_id: str = None
    target_role: str = None
    type: str = 'info'


@router.post('/register')
def register_hospital(
    req: HospitalRegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a hospital and linked HM account (pending approval)."""
    try:
        existing_hm = db.query(Hospital).filter(Hospital.email == req.email.lower().strip()).first()
        if existing_hm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='A hospital with this email already exists'
            )

        hospital_id = str(uuid4())
        hospital = Hospital(
            id=hospital_id,
            name=req.hospital_name.strip(),
            address=(req.address or '').strip() or None,
            phone=req.phone.strip(),
            email=req.email.lower().strip(),
            status='pending',
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(hospital)
        db.commit()
        db.refresh(hospital)

        hm_user = UserService.create_user(
            db=db,
            email=req.email.lower().strip(),
            password=req.password,
            full_name=req.hm_name.strip(),
            phone=req.phone.strip(),
            role='hm',
            hospital_id=hospital_id,
        )

        if hm_user.status == 'active':
            hm_user.status = 'pending'
            db.commit()

        return {
            'success': True,
            'message': 'Hospital registration submitted successfully',
            'data': {
                'hm_user_id': hm_user.id,
                'hospital': {
                    'id': hospital.id,
                    'hospital_name': hospital.name,
                    'hm_name': req.hm_name,
                    'email': hospital.email,
                    'phone': hospital.phone,
                    'category': req.category,
                    'address': hospital.address,
                    'status': hospital.status,
                    'created_at': hospital.created_at.isoformat() if hospital.created_at else None,
                }
            }
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error registering hospital: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Internal server error'
        )


@router.get("/", response_model=list[HospitalResponse])
def list_hospitals(
    status_filter: str = "active",
    db: Session = Depends(get_db)
):
    """List all hospitals."""
    try:
        query = db.query(Hospital)
        selected_status = (status_filter or "active").lower()
        if selected_status == "all":
            query = query.filter(Hospital.status != "deleted")
        else:
            query = query.filter(Hospital.status == (status_filter or "active").lower())
        hospitals = query.all()
        return hospitals
    except Exception as e:
        logger.error(f"Error listing hospitals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.patch("/{hospital_id}/status")
def update_hospital_status(
    hospital_id: str,
    payload: HospitalStatusRequest,
    db: Session = Depends(get_db)
):
    """Update hospital status and sync HM user status."""
    try:
        hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hospital not found: {hospital_id}"
            )

        requested = str(payload.status or '').strip().lower()
        status_map = {
            'approved': 'active',
            'active': 'active',
            'rejected': 'rejected',
            'blocked': 'rejected',
            'suspended': 'suspended',
            'pending': 'pending',
        }
        new_hospital_status = status_map.get(requested, requested)
        if new_hospital_status not in {'active', 'pending', 'rejected', 'suspended'}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invalid hospital status'
            )

        hospital.status = new_hospital_status
        hospital.updated_at = datetime.utcnow()

        hm_users = db.query(User).filter(
            User.hospital_id == hospital_id,
            User.role == 'hm'
        ).all()

        hm_status_map = {
            'active': 'active',
            'pending': 'pending',
            'rejected': 'blocked',
            'suspended': 'suspended',
        }
        new_hm_status = hm_status_map[new_hospital_status]
        for hm_user in hm_users:
            hm_user.status = new_hm_status
            hm_user.updated_at = datetime.utcnow()

        db.commit()

        return {
            'success': True,
            'message': 'Hospital status updated',
            'data': {
                'hospital_id': hospital.id,
                'status': hospital.status,
                'hm_count': len(hm_users),
                'hm_status': new_hm_status,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating hospital status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post('/notifications/send')
def send_hospital_notification(
    payload: NotificationRequest,
    db: Session = Depends(get_db)
):
    """Accept admin notification requests (placeholder implementation)."""
    return {
        'success': True,
        'message': 'Notification accepted',
        'data': {
            'title': payload.title,
            'type': payload.type,
            'hospital_id': payload.hospital_id,
            'target_role': payload.target_role,
        }
    }


@router.delete('/{hospital_id}')
def delete_hospital(
    hospital_id: str,
    db: Session = Depends(get_db)
):
    """Soft-delete hospital and deactivate associated HM users."""
    try:
        hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hospital not found: {hospital_id}"
            )

        hospital.status = 'deleted'
        hospital.updated_at = datetime.utcnow()

        hm_users = db.query(User).filter(
            User.hospital_id == hospital_id,
            User.role == 'hm'
        ).all()

        for hm_user in hm_users:
            hm_user.status = 'inactive'
            hm_user.updated_at = datetime.utcnow()

        db.commit()

        return {
            'success': True,
            'message': 'Hospital deleted successfully',
            'data': {
                'hospital_id': hospital_id,
                'hm_count': len(hm_users),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting hospital: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Internal server error'
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
