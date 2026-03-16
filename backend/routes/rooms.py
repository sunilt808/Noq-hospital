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
    from firebase import db
    from google.cloud.firestore_v1.base_query import FieldFilter
    
    ref = db.collection("rooms")
    if hospital_id:
        ref = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
    
    rooms = []
    for doc in ref.stream():
        rooms.append({"id": doc.id, **doc.to_dict()})
    
    return StandardResponse(success=True, message="Rooms fetched.", data={"rooms": rooms, "count": len(rooms)})


@router.post("", response_model=StandardResponse, status_code=201)
def create_room(room: RoomCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a room."""
    return StandardResponse(success=True, message="Room created.", data={"room": room.model_dump()})
