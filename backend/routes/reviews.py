from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
import datetime
from fastapi import APIRouter
from pydantic import BaseModel

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(String, index=True)
    rating = Column(Integer)
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

router = APIRouter(prefix="/reviews", tags=["Reviews"])

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}

@router.get("", response_model=StandardResponse)
def get_reviews():
    return StandardResponse(success=True, message="Reviews fetched.", data={"reviews": []})