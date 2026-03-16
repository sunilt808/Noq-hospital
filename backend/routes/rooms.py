# backend/routes/rooms.py - Room management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from database import db
from google.cloud.firestore_v1.base_query import FieldFilter

router = APIRouter(prefix="/rooms", tags=["Rooms"])


class RoomCreate(BaseModel):
    hospital_id: Optional[str] = None
    hospitalId: Optional[str] = None
    department_id: Optional[str] = None
    deptId: Optional[str] = None
    room_number: Optional[str] = None
    number: Optional[str] = None
    floor: Optional[str] = "1"
    capacity: Optional[int] = 2
    status: Optional[str] = "available"
    deptName: Optional[str] = None
    assignedDoctorId: Optional[str] = None
    assignedDoctorName: Optional[str] = None
    type: Optional[str] = None


class RoomUpdate(BaseModel):
    hospital_id: Optional[str] = None
    hospitalId: Optional[str] = None
    department_id: Optional[str] = None
    deptId: Optional[str] = None
    room_number: Optional[str] = None
    number: Optional[str] = None
    floor: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None
    deptName: Optional[str] = None
    assignedDoctorId: Optional[str] = None
    assignedDoctorName: Optional[str] = None
    type: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("", response_model=StandardResponse)
def get_rooms(hospital_id: Optional[str] = None, payload: dict = Depends(auth_service.require_auth)):
    """Get rooms."""
    try:
        ref = db.collection("rooms")
        if hospital_id:
            ref = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
        rooms = []
        for doc in ref.stream():
            rooms.append({"id": doc.id, **doc.to_dict()})
        return StandardResponse(success=True, message="Rooms fetched.", data={"rooms": rooms, "count": len(rooms)})
    except Exception as e:
        msg = str(e)
        if "quota" in msg.lower() or "429" in msg.lower() or "RESOURCE_EXHAUSTED" in msg:
            return StandardResponse(success=True, message="Rooms fetched (fallback).", data={"rooms": [], "count": 0})
        raise HTTPException(status_code=503, detail=f"Unable to fetch rooms from server: {msg}")


@router.post("", response_model=StandardResponse, status_code=201)
def create_room(room: RoomCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a room."""
    room_id = f"ROOM-{uuid.uuid4().hex[:12].upper()}"
    room_doc = {
        "id": room_id,
        "hospital_id": room.hospital_id or room.hospitalId or payload.get("hospital_id") or "",
        "department_id": room.department_id or room.deptId or "",
        "deptId": room.department_id or room.deptId or "",
        "room_number": room.room_number or room.number or "",
        "number": room.room_number or room.number or "",
        "floor": str(room.floor or "1"),
        "capacity": int(room.capacity or 2),
        "status": (room.status or "available").lower(),
        "deptName": room.deptName or "",
        "assignedDoctorId": room.assignedDoctorId,
        "assignedDoctorName": room.assignedDoctorName,
        "type": room.type or "doctor",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    db.collection("rooms").document(room_id).set(room_doc)
    return StandardResponse(success=True, message="Room created.", data={"room": room_doc})


@router.put("/{room_id}", response_model=StandardResponse)
def update_room(room_id: str, updates: RoomUpdate, payload: dict = Depends(auth_service.require_auth)):
    """Update a room."""
    ref = db.collection("rooms").document(room_id)
    snapshot = ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Room not found.")

    update_doc = {
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    if updates.hospital_id is not None or updates.hospitalId is not None:
        update_doc["hospital_id"] = updates.hospital_id or updates.hospitalId
    if updates.department_id is not None or updates.deptId is not None:
        did = updates.department_id or updates.deptId
        update_doc["department_id"] = did
        update_doc["deptId"] = did
    if updates.room_number is not None or updates.number is not None:
        rnum = updates.room_number or updates.number
        update_doc["room_number"] = rnum
        update_doc["number"] = rnum
    if updates.floor is not None:
        update_doc["floor"] = str(updates.floor)
    if updates.capacity is not None:
        update_doc["capacity"] = int(updates.capacity)
    if updates.status is not None:
        update_doc["status"] = updates.status.lower()
    if updates.deptName is not None:
        update_doc["deptName"] = updates.deptName
    if updates.assignedDoctorId is not None:
        update_doc["assignedDoctorId"] = updates.assignedDoctorId
    if updates.assignedDoctorName is not None:
        update_doc["assignedDoctorName"] = updates.assignedDoctorName
    if updates.type is not None:
        update_doc["type"] = updates.type

    ref.update(update_doc)
    fresh = ref.get().to_dict() or {}
    return StandardResponse(success=True, message="Room updated.", data={"room": {"id": room_id, **fresh}})


@router.patch("/{room_id}", response_model=StandardResponse)
def patch_room(room_id: str, updates: RoomUpdate, payload: dict = Depends(auth_service.require_auth)):
    """Patch a room (alias for update)."""
    return update_room(room_id, updates, payload)


@router.delete("/{room_id}", response_model=StandardResponse)
def delete_room(room_id: str, payload: dict = Depends(auth_service.require_auth)):
    """Delete a room."""
    ref = db.collection("rooms").document(room_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Room not found.")
    ref.delete()
    return StandardResponse(success=True, message="Room deleted.", data={"id": room_id})
