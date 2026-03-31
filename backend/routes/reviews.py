# backend/routes/reviews.py - Reviews Routes (MongoDB)

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import mongodb
from datetime import datetime
from services.auth_service import require_auth
from typing import Optional

router = APIRouter(prefix="/reviews", tags=["Reviews"])

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}

class ReviewCreate(BaseModel):
    appointment_id: str
    doctor_rating: int
    hospital_rating: int
    comment: str

@router.get("", response_model=StandardResponse)
async def get_reviews(hospital_id: Optional[str] = None):
    """Get reviews from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=True, message="Success", data={"reviews": []})
        query = {}
        if hospital_id:
            query["hospital_id"] = hospital_id
        
        cursor = mongodb.reviews.find(query).sort("created_at", -1)
        reviews = await cursor.to_list(length=1000)
        
        serialized = []
        for r in reviews:
            r["id"] = str(r.get("_id", r.get("id")))
            if "created_at" in r and isinstance(r["created_at"], datetime):
                r["created_at"] = r["created_at"].isoformat()
            
            # Aliases for frontend compatibility
            r["hospital"] = r.get("hospital_name")
            r["doctor"] = r.get("doctor_name")
            r["patient"] = r.get("patient_name")
            serialized.append(r)
        
        return StandardResponse(success=True, message="Reviews fetched.", data={"reviews": serialized})
    except Exception as e:
        return StandardResponse(success=False, message=str(e), data={"reviews": []})

@router.post("", response_model=StandardResponse)
async def create_review(review: ReviewCreate, payload: dict = Depends(require_auth)):
    """Add a review for a completed appointment."""
    try:
        user_id = payload.get("sub")
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        # Enrich review with Names from appointment
        appointment = await mongodb.appointments.find_one({"_id": review.appointment_id})
        if not appointment:
            return StandardResponse(success=False, message="Appointment not found")
            
        review_doc = {
            "appointment_id": review.appointment_id,
            "user_id": user_id,
            "patient_name": appointment.get("patient_name") or "Patient",
            "hospital_id": appointment.get("hospital_id") or "",
            "hospital_name": appointment.get("hospital_name") or "Hospital",
            "doctor_id": appointment.get("doctor_id") or "",
            "doctor_name": appointment.get("doctor_name") or "Doctor",
            "doctorRating": review.doctor_rating,
            "hospitalRating": review.hospital_rating,
            "comment": review.comment,
            "rating": (review.doctor_rating + review.hospital_rating) / 2,
            "created_at": datetime.utcnow()
        }
        
        await mongodb.reviews.insert_one(review_doc)
        return StandardResponse(success=True, message="Review submitted successfully.")
    except Exception as e:
        return StandardResponse(success=False, message=str(e))

@router.get("/my", response_model=StandardResponse)
async def get_my_reviews(payload: dict = Depends(require_auth)):
    """Fetch reviews for the authenticated patient."""
    try:
        user_id = payload.get("sub")
        if mongodb is None:
            return StandardResponse(success=True, message="Success", data={"reviews": []})

        cursor = mongodb.reviews.find({"user_id": user_id}).sort("created_at", -1)
        reviews = await cursor.to_list(length=1000)
        
        serialized = []
        for r in reviews:
            r["id"] = str(r.get("_id", r.get("id")))
            if "created_at" in r and isinstance(r["created_at"], datetime):
                r["created_at"] = r["created_at"].isoformat()
            
            # Aliases for frontend compatibility
            r["hospital"] = r.get("hospital_name")
            r["doctor"] = r.get("doctor_name")
            r["patient"] = r.get("patient_name")
            serialized.append(r)

        return StandardResponse(
            success=True,
            message=f"Fetched {len(serialized)} reviews.",
            data={"reviews": serialized}
        )
    except Exception as e:
        return StandardResponse(success=False, message=str(e), data={"reviews": []})