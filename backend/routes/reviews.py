# backend/routes/reviews.py - Reviews Routes (MongoDB)

from fastapi import APIRouter
from pydantic import BaseModel
from database import mongodb
from datetime import datetime

router = APIRouter(prefix="/reviews", tags=["Reviews"])

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}

@router.get("", response_model=StandardResponse)
async def get_reviews(hospital_id: str = None):
    """Get reviews from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=True, message="Success", data={"reviews": []})
        query = {}
        if hospital_id:
            query["hospital_id"] = hospital_id
        
        cursor = mongodb.reviews.find(query).sort("created_at", -1)
        reviews = await cursor.to_list(length=1000)
        for r in reviews:
            r["id"] = str(r.get("_id", r.get("id")))
            if "created_at" in r and isinstance(r["created_at"], datetime):
                r["created_at"] = r["created_at"].isoformat()
        
        return StandardResponse(success=True, message="Reviews fetched.", data={"reviews": reviews})
    except Exception as e:
        return StandardResponse(success=False, message=str(e), data={"reviews": []})