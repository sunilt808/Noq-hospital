# backend/routes/advanced_bookings.py - Advanced booking endpoints (MongoDB)

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional, List
from database import mongodb
from datetime import datetime

router = APIRouter(prefix="/advanced-bookings", tags=["Advanced Bookings"])


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}

class AdvancedBookingCreate(BaseModel):
    case_type: str
    case_label: Optional[str] = ""
    patient_id: str
    patient_name: Optional[str] = ""
    patient_age: Optional[int] = 0
    patient_gender: Optional[str] = ""
    hospital_id: str
    hospital_name: Optional[str] = ""
    doctor_id: str
    doctor_name: Optional[str] = ""
    doctor_specialization: Optional[str] = ""
    room: Optional[str] = ""
    room_id: Optional[str] = ""
    room_type: Optional[str] = ""
    reason: Optional[str] = ""
    appointment_date: str
    priority: Optional[str] = "high"
    status: Optional[str] = "allocated"
    allocation_method: Optional[str] = ""
    source: Optional[str] = "advanced-booking"


@router.get("", response_model=StandardResponse)
@router.get("/", response_model=StandardResponse)
async def get_advanced_bookings(
    doctorId: str = None,
    patientId: str = None,
    payload: dict = Depends(auth_service.require_auth)
):
    """Get advanced bookings from MongoDB."""
    try:
        user_id = payload.get("sub")
        role = payload.get("role")
        if mongodb is None: return StandardResponse(success=True, message="Success", data={"bookings": []})
        
        query = {}
        if patientId:
            query["patient_id"] = patientId
        elif role == 'patient':
            query["patient_id"] = user_id
            
        if doctorId:
            query["doctor_id"] = doctorId
        elif role == 'doctor':
             query["doctor_id"] = user_id
             
        cursor = mongodb.advanced_bookings.find(query).sort("created_at", -1)
        bookings = await cursor.to_list(length=1000)
        for b in bookings:
            b["id"] = str(b.get("_id", b.get("id")))
            if "created_at" in b and isinstance(b["created_at"], datetime):
                b["created_at"] = b["created_at"].isoformat()
        
        return StandardResponse(success=True, message="Advanced bookings fetched.", data={"bookings": bookings})
    except Exception as e:
        return StandardResponse(success=False, message=str(e), data={"bookings": []})

@router.get("/mine", response_model=StandardResponse)
async def get_my_advanced_bookings(payload: dict = Depends(auth_service.require_auth)):
    """Alias for get_advanced_bookings for frontend compatibility."""
    return await get_advanced_bookings(payload=payload)

@router.post("", response_model=StandardResponse)
@router.post("/", response_model=StandardResponse)
@router.post("/create", response_model=StandardResponse)
async def create_advanced_booking(booking: AdvancedBookingCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a new advanced booking in MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        booking_doc = booking.model_dump()
        booking_doc["created_at"] = datetime.utcnow()
        booking_doc["_id"] = f"AB-{int(datetime.utcnow().timestamp() * 1000)}"
        
        await mongodb.advanced_bookings.insert_one(booking_doc)
        
        booking_doc["id"] = booking_doc["_id"]
        if "created_at" in booking_doc: booking_doc["created_at"] = booking_doc["created_at"].isoformat()
        
        return StandardResponse(success=True, message="Advanced booking created.", data=booking_doc)
    except Exception as e:
        return StandardResponse(success=False, message=str(e))

@router.patch("/{booking_id}/status", response_model=StandardResponse)
async def update_booking_status(booking_id: str, payload: dict, auth: dict = Depends(auth_service.require_auth)):
    """Update advanced booking status."""
    try:
        new_status = payload.get("status")
        if not new_status:
            return StandardResponse(success=False, message="Status is required")
            
        await mongodb.advanced_bookings.update_one(
            {"_id": booking_id},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
        )
        
        updated = await mongodb.advanced_bookings.find_one({"_id": booking_id})
        if updated:
            updated["id"] = str(updated["_id"])
            if "created_at" in updated: updated["created_at"] = updated["created_at"].isoformat()
            if "updated_at" in updated: updated["updated_at"] = updated["updated_at"].isoformat()
            
        return StandardResponse(success=True, message="Status updated.", data=updated or {})
    except Exception as e:
        return StandardResponse(success=False, message=str(e))
