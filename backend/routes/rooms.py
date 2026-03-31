# backend/routes/rooms.py - Room Management Routes (MongoDB)

import logging
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from database import mongodb
from audit import AuditLogger

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rooms", tags=["Rooms"])


class RoomCreate(BaseModel):
    hospital_id: str
    department_id: str
    department_name: Optional[str] = None
    room_number: str
    floor: Optional[str] = "1"
    capacity: Optional[int] = 2
    status: Optional[str] = "available"
    type: Optional[str] = "doctor"
    assigned_doctor_id: Optional[str] = None
    assigned_doctor_name: Optional[str] = None


class RoomUpdate(BaseModel):
    hospital_id: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    room_number: Optional[str] = None
    floor: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None
    type: Optional[str] = None
    assigned_doctor_id: Optional[str] = None
    assigned_doctor_name: Optional[str] = None


def _serialize_room(room: dict) -> dict:
    room["id"] = str(room.get("_id", room.get("id")))
    room["hospitalId"] = room.get("hospital_id")
    room["departmentId"] = room.get("department_id")
    room["deptName"] = room.get("department_name")
    room["number"] = room.get("room_number")
    room["assignedDoctorId"] = room.get("assigned_doctor_id")
    room["assignedDoctorName"] = room.get("assigned_doctor_name")
    for field in ["created_at", "updated_at"]:
        if field in room and isinstance(room[field], datetime):
            room[field] = room[field].isoformat()
    return room


@router.get("")
async def list_rooms(
    hospital_id: str = None,
    department_id: str = None
):
    """List rooms from MongoDB."""
    try:
        if mongodb is None: return {"success": False, "data": {"rooms": [], "count": 0}}
        query = {}
        if hospital_id:
            query["hospital_id"] = hospital_id
        if department_id:
            query["department_id"] = department_id
        
        cursor = mongodb.rooms.find(query)
        rooms = await cursor.to_list(length=1000)
        
        return {
            "success": True,
            "data": {
                "rooms": [_serialize_room(r) for r in rooms if r.get("status") != "inactive"],
                "count": len(rooms)
            }
        }
    except Exception as e:
        logger.error(f"Error listing rooms: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("")
async def create_room(payload: RoomCreate, request: Request):
    """Create a new room in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        
        room_id = str(uuid4())
        room_doc = {
            "_id": room_id,
            "hospital_id": payload.hospital_id,
            "department_id": payload.department_id,
            "department_name": payload.department_name,
            "room_number": payload.room_number.strip(),
            "floor": payload.floor or "1",
            "capacity": payload.capacity if payload.capacity is not None else 2,
            "status": (payload.status or "available").lower(),
            "type": (payload.type or "doctor").lower(),
            "assigned_doctor_id": payload.assigned_doctor_id,
            "assigned_doctor_name": payload.assigned_doctor_name,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        await mongodb.rooms.insert_one(room_doc)
        
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log(
            action="CREATE",
            entity_type="Room",
            entity_id=room_id,
            new_values={"room_number": room_doc["room_number"], "department_id": room_doc["department_id"]},
            ip_address=client_ip,
        )
        
        return {
            "success": True,
            "data": {"room": _serialize_room(room_doc)}
        }
    except Exception as e:
        logger.error(f"Error creating room: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{room_id}")
async def patch_room(room_id: str, payload: RoomUpdate, request: Request):
    """Patch a room in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        
        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            room = await mongodb.rooms.find_one({"_id": room_id})
            return {"success": True, "data": {"room": _serialize_room(room)}}

        updates["updated_at"] = datetime.utcnow()
        result = await mongodb.rooms.update_one({"_id": room_id}, {"$set": updates})
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Room not found")
        
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log(
            action="UPDATE",
            entity_type="Room",
            entity_id=room_id,
            new_values=updates,
            ip_address=client_ip,
        )
        
        updated_room = await mongodb.rooms.find_one({"_id": room_id})
        return {
            "success": True,
            "data": {"room": _serialize_room(updated_room)}
        }
    except Exception as e:
        logger.error(f"Error updating room: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{room_id}")
async def delete_room(room_id: str, request: Request):
    """Delete a room in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        
        result = await mongodb.rooms.delete_one({"_id": room_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Room not found")
        
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log(
            action="DELETE",
            entity_type="Room",
            entity_id=room_id,
            ip_address=client_ip,
        )
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting room: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")
