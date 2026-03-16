# backend/routes/rooms.py - Room management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/rooms", tags=["Rooms"])


class RoomCreate(BaseModel):
    hospital_id: str
    department_id: str
    room_number: str
    floor: str = "1"
    capacity: int = 2


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("", response_model=StandardResponse)
def get_rooms(hospital_id: Optional[str] = None, payload: dict = Depends(auth_service.require_auth)):
    """Get rooms."""
    return StandardResponse(success=True, message="Rooms fetched.", data={"rooms": []})


@router.post("", response_model=StandardResponse, status_code=201)
def create_room(room: RoomCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a room."""
    return StandardResponse(success=True, message="Room created.", data={"room": room.model_dump()})
