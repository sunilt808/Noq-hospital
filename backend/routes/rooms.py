# backend/routes/rooms.py - Room Management Routes

import logging
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session
from database import get_db, Room
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


def _serialize_room(room: Room) -> dict:
    return {
        "id": room.id,
        "hospital_id": room.hospital_id,
        "hospitalId": room.hospital_id,
        "department_id": room.department_id,
        "departmentId": room.department_id,
        "department_name": room.department_name,
        "deptName": room.department_name,
        "room_number": room.room_number,
        "number": room.room_number,
        "floor": room.floor,
        "capacity": room.capacity,
        "status": room.status,
        "type": room.type,
        "assigned_doctor_id": room.assigned_doctor_id,
        "assignedDoctorId": room.assigned_doctor_id,
        "assigned_doctor_name": room.assigned_doctor_name,
        "assignedDoctorName": room.assigned_doctor_name,
        "created_at": room.created_at.isoformat() if room.created_at else None,
        "updated_at": room.updated_at.isoformat() if room.updated_at else None,
    }


@router.get("")
def list_rooms(
    hospital_id: str = None,
    department_id: str = None,
    db: Session = Depends(get_db)
):
    """List rooms with optional filters."""
    try:
        query = db.query(Room)
        
        if hospital_id:
            query = query.filter(Room.hospital_id == hospital_id)
        if department_id:
            query = query.filter(Room.department_id == department_id)
        
        rooms = query.filter(Room.status != "inactive").all()
        
        return {
            "success": True,
            "data": {
                "rooms": [_serialize_room(r) for r in rooms],
                "count": len(rooms)
            }
        }
    except Exception as e:
        logger.error(f"Error listing rooms: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("")
def create_room(
    payload: RoomCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new room."""
    try:
        if not payload.hospital_id or not payload.department_id or not payload.room_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="hospital_id, department_id, and room_number are required"
            )
        
        room = Room(
            id=str(uuid4()),
            hospital_id=payload.hospital_id,
            department_id=payload.department_id,
            department_name=payload.department_name,
            room_number=payload.room_number.strip(),
            floor=payload.floor or "1",
            capacity=int(payload.capacity) if payload.capacity else 2,
            status=(payload.status or "available").lower(),
            type=(payload.type or "doctor").lower(),
            assigned_doctor_id=payload.assigned_doctor_id,
            assigned_doctor_name=payload.assigned_doctor_name,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        db.add(room)
        db.commit()
        db.refresh(room)
        
        client_ip = request.client.host if request and request.client else None
        AuditLogger.log_entity_create(
            db,
            entity_type="Room",
            entity_id=room.id,
            data={"room_number": room.room_number, "department_id": room.department_id},
            ip_address=client_ip,
        )
        
        return {
            "success": True,
            "data": {"room": _serialize_room(room)}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating room: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/{room_id}")
def update_room(
    room_id: str,
    payload: RoomUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a room."""
    try:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        updates = {}
        if payload.hospital_id:
            room.hospital_id = payload.hospital_id
            updates["hospital_id"] = room.hospital_id
        if payload.department_id:
            room.department_id = payload.department_id
            updates["department_id"] = room.department_id
        if payload.department_name is not None:
            room.department_name = payload.department_name
            updates["department_name"] = room.department_name
        if payload.room_number:
            room.room_number = payload.room_number.strip()
            updates["room_number"] = room.room_number
        if payload.floor:
            room.floor = payload.floor
            updates["floor"] = room.floor
        if payload.capacity is not None:
            room.capacity = int(payload.capacity)
            updates["capacity"] = room.capacity
        if payload.status:
            room.status = payload.status.lower()
            updates["status"] = room.status
        if payload.type:
            room.type = payload.type.lower()
            updates["type"] = room.type
        if payload.assigned_doctor_id is not None:
            room.assigned_doctor_id = payload.assigned_doctor_id
            updates["assigned_doctor_id"] = room.assigned_doctor_id
        if payload.assigned_doctor_name is not None:
            room.assigned_doctor_name = payload.assigned_doctor_name
            updates["assigned_doctor_name"] = room.assigned_doctor_name
        
        room.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(room)
        
        client_ip = request.client.host if request and request.client else None
        AuditLogger.log_entity_update(
            db,
            entity_type="Room",
            entity_id=room_id,
            old_values={},
            new_values=updates,
            ip_address=client_ip,
        )
        
        return {
            "success": True,
            "data": {"room": _serialize_room(room)}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating room: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.patch("/{room_id}")
def patch_room(
    room_id: str,
    payload: RoomUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Patch a room."""
    return update_room(room_id, payload, request, db)


@router.delete("/{room_id}")
def delete_room(
    room_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Hard-delete a room."""
    try:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        client_ip = request.client.host if request and request.client else None
        
        # Hard delete room
        db.delete(room)
        db.commit()
        
        AuditLogger.log_entity_delete(
            db,
            entity_type="Room",
            entity_id=room_id,
            data={"room_number": room.room_number},
            ip_address=client_ip,
        )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting room: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
