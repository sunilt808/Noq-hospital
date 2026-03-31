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
    return await get_advanced_bookings(payload)
