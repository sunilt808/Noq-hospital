# backend/routes/reviews.py - Review endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class ReviewCreate(BaseModel):
    hospital_id: str
    rating: int
    comment: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("", response_model=StandardResponse)
def get_reviews(hospital_id: Optional[str] = None, payload: dict = Depends(auth_service.require_auth)):
    """Get reviews."""
    return StandardResponse(success=True, message="Reviews fetched.", data={"reviews": []})


@router.post("", response_model=StandardResponse, status_code=201)
def create_review(review: ReviewCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a review."""
    return StandardResponse(success=True, message="Review created.", data={"review": review.model_dump()})
