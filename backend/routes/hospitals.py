# backend/routes/hospitals.py - Hospital Management Routes (MongoDB)

import logging
from fastapi import APIRouter, HTTPException, status
from database import mongodb
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

from services.auth_service import UserService
from hospital_id_utils import generate_hospital_id

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
    category: Optional[str] = None
    hospital_type: Optional[str] = None
    established_year: Optional[str] = None
    registration_number: Optional[str] = None
    website: Optional[str] = None
    emergency_contact: Optional[str] = None
    owner_name: Optional[str] = None
    director_name: Optional[str] = None
    total_beds: Optional[int] = 0
    total_icu_beds: Optional[int] = 0
    total_operation_theatres: Optional[int] = 0
    accreditation: Optional[List[str]] = None
    services: Optional[List[str]] = None
    last_updated: Optional[str] = None
    status: str


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


class HospitalUpdateRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    category: Optional[str] = None
    hospital_type: Optional[str] = None
    established_year: Optional[str] = None
    registration_number: Optional[str] = None
    website: Optional[str] = None
    emergency_contact: Optional[str] = None
    owner_name: Optional[str] = None
    director_name: Optional[str] = None
    total_beds: Optional[int] = None
    total_icu_beds: Optional[int] = None
    total_operation_theatres: Optional[int] = None
    accreditation: Optional[List[str]] = None
    services: Optional[List[str]] = None
    last_updated: Optional[str] = None


class NotificationRequest(BaseModel):
    title: str
    message: str
    hospital_id: str = None
    target_role: str = None
    type: str = 'info'


def _serialize_hospital(h: dict) -> dict:
    h["id"] = h.get("_id", h.get("id"))
    if "created_at" in h and isinstance(h["created_at"], datetime):
        h["created_at"] = h["created_at"].isoformat()
    if "updated_at" in h and isinstance(h["updated_at"], datetime):
        h["updated_at"] = h["updated_at"].isoformat()
    return h


@router.post('/register')
async def register_hospital(req: HospitalRegisterRequest):
    """Register a hospital and linked HM account in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")

        existing_h = await mongodb.hospitals.find_one({"email": req.email.lower().strip()})
        if existing_h:
            raise HTTPException(status_code=400, detail='A hospital with this email already exists')

        hospital_id = generate_hospital_id()
        while await mongodb.hospitals.find_one({"_id": hospital_id}):
            hospital_id = generate_hospital_id()

        hospital_doc = {
            "_id": hospital_id,
            "name": req.hospital_name.strip(),
            "address": (req.address or '').strip() or None,
            "phone": req.phone.strip(),
            "email": req.email.lower().strip(),
            "status": 'pending',
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await mongodb.hospitals.insert_one(hospital_doc)

        hm_user = await UserService.create_user(
            email=req.email.lower().strip(),
            password=req.password,
            full_name=req.hm_name.strip(),
            phone=req.phone.strip(),
            role='hm',
            hospital_id=hospital_id,
        )

        if hm_user.get("status") == 'active':
            await mongodb.users.update_one({"_id": hm_user["id"]}, {"$set": {"status": "pending"}})
            hm_user["status"] = "pending"

        return {
            'success': True,
            'message': 'Hospital registration submitted successfully',
            'data': {
                'hm_user_id': hm_user["id"],
                'hospital': {
                    'id': hospital_id,
                    'hospital_name': hospital_doc["name"],
                    'hm_name': req.hm_name,
                    'email': hospital_doc["email"],
                    'phone': hospital_doc["phone"],
                    'category': req.category,
                    'address': hospital_doc["address"],
                    'status': hospital_doc["status"],
                    'created_at': hospital_doc["created_at"].isoformat(),
                }
            }
        }
    except Exception as e:
        logger.error(f"Error registering hospital: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[HospitalResponse])
async def list_hospitals(status_filter: str = "active"):
    """List all hospitals from MongoDB."""
    try:
        if mongodb is None: return []
        query = {}
        selected_status = (status_filter or "active").lower()
        if selected_status == "all":
            query["status"] = {"$ne": "deleted"}
        else:
            query["status"] = selected_status
            
        cursor = mongodb.hospitals.find(query)
        hospitals = await cursor.to_list(length=1000)
        return [_serialize_hospital(h) for h in hospitals]
    except Exception as e:
        logger.error(f"Error listing hospitals: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/available", response_model=List[HospitalResponse])
async def list_available_hospitals():
    """List available hospitals from MongoDB."""
    try:
        if mongodb is None: return []
        cursor = mongodb.hospitals.find({"status": "active"})
        hospitals = await cursor.to_list(length=1000)
        return [_serialize_hospital(h) for h in hospitals]
    except Exception as e:
        logger.error(f"Error listing available hospitals: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{hospital_id}/status")
async def update_hospital_status(hospital_id: str, payload: HospitalStatusRequest):
    """Update hospital status and sync HM user status in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        hospital = await mongodb.hospitals.find_one({"_id": hospital_id})
        if not hospital:
            raise HTTPException(status_code=404, detail="Hospital not found")

        requested = str(payload.status or '').strip().lower()
        status_map = {
            'approved': 'active', 'active': 'active', 'rejected': 'rejected',
            'blocked': 'rejected', 'suspended': 'suspended', 'pending': 'pending',
        }
        new_hospital_status = status_map.get(requested, requested)
        
        await mongodb.hospitals.update_one(
            {"_id": hospital_id},
            {"$set": {"status": new_hospital_status, "updated_at": datetime.utcnow()}}
        )

        hm_status_map = {
            'active': 'active', 'pending': 'pending', 'rejected': 'blocked', 'suspended': 'suspended',
        }
        new_hm_status = hm_status_map.get(new_hospital_status, 'inactive')
        
        await mongodb.users.update_many(
            {"hospital_id": hospital_id, "role": "hm"},
            {"$set": {"status": new_hm_status, "updated_at": datetime.utcnow()}}
        )

        return {
            'success': True,
            'message': 'Hospital status updated',
            'data': {
                'hospital_id': hospital_id,
                'status': new_hospital_status,
                'hm_status': new_hm_status,
            }
        }
    except Exception as e:
        logger.error(f"Error updating hospital status: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{hospital_id}")
async def update_hospital(hospital_id: str, payload: HospitalUpdateRequest):
    """Update hospital profile in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        updates = payload.model_dump(exclude_unset=True)
        updates["updated_at"] = datetime.utcnow()

        result = await mongodb.hospitals.update_one({"_id": hospital_id}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Hospital not found")

        updated_hospital = await mongodb.hospitals.find_one({"_id": hospital_id})
        return {
            "success": True,
            "message": "Hospital profile updated",
            "data": _serialize_hospital(updated_hospital)
        }
    except Exception as e:
        logger.error(f"Error updating hospital {hospital_id}: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post('/notifications/send')
async def send_hospital_notification(payload: NotificationRequest):
    return {
        'success': True,
        'message': 'Notification accepted',
        'data': payload.model_dump()
    }


@router.delete('/{hospital_id}')
async def delete_hospital(hospital_id: str):
    """Soft-delete hospital in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        await mongodb.hospitals.update_one(
            {"_id": hospital_id},
            {"$set": {"status": 'deleted', "updated_at": datetime.utcnow()}}
        )
        await mongodb.users.update_many(
            {"hospital_id": hospital_id, "role": "hm"},
            {"$set": {"status": 'inactive', "updated_at": datetime.utcnow()}}
        )
        return {'success': True, 'message': 'Hospital deleted successfully'}
    except Exception as e:
        logger.error(f"Error deleting hospital: {e}")
        raise HTTPException(status_code=500, detail='Internal server error')


@router.get("/{hospital_id}", response_model=HospitalResponse)
async def get_hospital(hospital_id: str):
    """Get hospital by ID from MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        hospital = await mongodb.hospitals.find_one({"_id": hospital_id})
        if not hospital:
            raise HTTPException(status_code=404, detail="Hospital not found")
        return _serialize_hospital(hospital)
    except Exception as e:
        logger.error(f"Error getting hospital: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")

