# backend/routes/users.py - User Management Routes

import json
import logging
from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db, User, AuditLog, Room
from services.auth_service import UserService, AuthService
from audit import AuditLogger

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    full_name: str
    phone: str = None
    role: str
    hospital_id: str = None
    status: str

    class Config:
        from_attributes = True


class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    phone: str = None
    hospital_id: str = None
    hospital_name: str = None
    specialization: str = None
    department_id: str = None
    department_name: str = None
    room_id: str = None
    room_no: str = None
    floor: str = None
    license: str = None
    shift: str = None
    advanced_booking_category: str = None
    fee: float = None
    experience: int = None
    qualifications: str = None
    category: str = None
    promotion_label: str = None
    status: str = "active"


class UpdateUserRequest(BaseModel):
    full_name: str = None
    name: str = None
    phone: str = None
    status: str = None
    hospital_name: str = None
    specialization: str = None
    department_id: str = None
    department_name: str = None
    room_id: str = None
    room_no: str = None
    floor: str = None
    license: str = None
    shift: str = None
    advanced_booking_category: str = None
    fee: float = None
    experience: int = None
    qualifications: str = None
    category: str = None
    promotion_label: str = None


class ResetCredentialsRequest(BaseModel):
    password: str


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "hospital_id": user.hospital_id,
        "hospital_name": user.hospital_name,
        "status": user.status,
        "specialization": user.specialization,
        "department_id": user.department_id,
        "department_name": user.department_name,
        "room_id": user.room_id,
        "room_no": user.room_no,
        "floor": user.floor,
        "license": user.license,
        "shift": user.shift,
        "advanced_booking_category": user.advanced_booking_category,
        "fee": user.fee,
        "experience": user.experience,
        "qualifications": user.qualifications,
        "category": user.category,
        "promotion_label": user.promotion_label,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }


@router.get("")
def list_users(
    role: str = None,
    hospital_id: str = None,
    db: Session = Depends(get_db)
):
    """List users with optional role and hospital filter."""
    try:
        query = db.query(User)

        if role:
            query = query.filter(User.role == role)
            # When filtering by role, exclude inactive (soft-deleted) users
            query = query.filter(User.status != "inactive")

        if hospital_id:
            query = query.filter(User.hospital_id == hospital_id)

        users = query.all()

        return {
            "success": True,
            "data": {
                "users": [_serialize_user(user) for user in users]
            }
        }
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user(
    db: Session = Depends(get_db),
):
    """Get current user profile."""
    try:
        # In a real app, extract user_id from JWT token
        # For now, this is a placeholder
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get user by ID."""
    try:
        user = UserService.get_user(db, user_id)
        return user
    except ValueError as e:
        logger.warning(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/create")
def create_user(
    payload: CreateUserRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a user account (used by HM for doctor credentials)."""
    try:
        if len(payload.password or "") < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters"
            )

        user = UserService.create_user(
            db=db,
            email=payload.email,
            password=payload.password,
            full_name=payload.name,
            role=payload.role,
            hospital_id=payload.hospital_id,
            phone=payload.phone,
        )

        if payload.status and payload.status != user.status:
            user = UserService.update_user(db, user.id, status=payload.status)

        profile_updates = {
            "hospital_name": payload.hospital_name,
            "specialization": payload.specialization,
            "department_id": payload.department_id,
            "department_name": payload.department_name,
            "room_id": payload.room_id,
            "room_no": payload.room_no,
            "floor": payload.floor,
            "license": payload.license,
            "shift": payload.shift,
            "advanced_booking_category": payload.advanced_booking_category,
            "fee": payload.fee,
            "experience": payload.experience,
            "qualifications": payload.qualifications,
            "category": payload.category,
            "promotion_label": payload.promotion_label,
        }
        profile_updates = {k: v for k, v in profile_updates.items() if v is not None}
        if profile_updates:
            user = UserService.update_user(db, user.id, **profile_updates)

        if payload.role == "doctor" and payload.hospital_id and payload.room_no:
            normalized_room_no = str(payload.room_no).strip()
            normalized_floor = str(payload.floor or "1").strip()

            room = db.query(Room).filter(
                Room.hospital_id == payload.hospital_id,
                Room.room_number == normalized_room_no,
                Room.floor == normalized_floor,
            ).first()

            if room:
                room.department_id = payload.department_id or room.department_id
                room.department_name = payload.department_name or room.department_name
                room.status = "occupied"
                room.type = room.type or "doctor"
                room.assigned_doctor_id = user.id
                room.assigned_doctor_name = user.full_name
                room.updated_at = datetime.utcnow()
            else:
                room = Room(
                    id=str(uuid4()),
                    hospital_id=payload.hospital_id,
                    department_id=payload.department_id,
                    department_name=payload.department_name,
                    room_number=normalized_room_no,
                    floor=normalized_floor,
                    capacity=1,
                    status="occupied",
                    type="doctor",
                    assigned_doctor_id=user.id,
                    assigned_doctor_name=user.full_name,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(room)

            db.commit()
            db.refresh(room)

            user = UserService.update_user(
                db,
                user.id,
                room_id=room.id,
                room_no=room.room_number,
                floor=room.floor,
            )

        client_ip = request.client.host if request and request.client else None
        AuditLogger.log(
            db=db,
            action="CREDENTIAL_CREATED",
            entity_type="User",
            entity_id=user.id,
            user_id=user.id,
            ip_address=client_ip,
            new_values={"email": user.email, "role": user.role, "status": user.status},
        )

        return {
            "success": True,
            "id": user.id,
            "user": _serialize_user(user),
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    full_name: str = None,
    phone: str = None,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Update user details."""
    try:
        updates = {}
        if full_name:
            updates["full_name"] = full_name
        if phone:
            updates["phone"] = phone
        
        user = UserService.update_user(db, user_id, **updates)
        
        # Log IP if available
        client_ip = request.client.host if request and request.client else None
        AuditLogger.log_entity_update(
            db,
            entity_type="User",
            entity_id=user_id,
            old_values={},
            new_values=updates,
            user_id=user_id,
            ip_address=client_ip,
        )
        
        return user
    except ValueError as e:
        logger.warning(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.patch("/{user_id}")
def patch_user(
    user_id: str,
    payload: UpdateUserRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Patch user fields from JSON body (frontend-friendly)."""
    try:
        updates = {
            key: value
            for key, value in {
                "full_name": payload.full_name or payload.name,
                "phone": payload.phone,
                "status": payload.status,
                "hospital_name": payload.hospital_name,
                "specialization": payload.specialization,
                "department_id": payload.department_id,
                "department_name": payload.department_name,
                "room_id": payload.room_id,
                "room_no": payload.room_no,
                "floor": payload.floor,
                "license": payload.license,
                "shift": payload.shift,
                "advanced_booking_category": payload.advanced_booking_category,
                "fee": payload.fee,
                "experience": payload.experience,
                "qualifications": payload.qualifications,
                "category": payload.category,
                "promotion_label": payload.promotion_label,
            }.items()
            if value is not None
        }

        if not updates:
            user = UserService.get_user(db, user_id)
            return {"success": True, "user": _serialize_user(user)}

        user = UserService.update_user(db, user_id, **updates)

        client_ip = request.client.host if request and request.client else None
        try:
            AuditLogger.log(
                db=db,
                action="CREDENTIAL_UPDATED",
                entity_type="User",
                entity_id=user_id,
                user_id=user_id,
                ip_address=client_ip,
                new_values=updates,
            )
        except Exception as audit_error:
            logger.warning(f"Credential update audit failed for {user_id}: {audit_error}")

        return {"success": True, "user": _serialize_user(user)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error patching user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.patch("/{user_id}/credentials")
def reset_user_credentials(
    user_id: str,
    payload: ResetCredentialsRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Reset user password and track credential change in audit logs."""
    try:
        if len(payload.password or "") < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters"
            )

        user = UserService.get_user(db, user_id)
        user.password_hash = AuthService.hash_password(payload.password)
        db.commit()
        db.refresh(user)

        client_ip = request.client.host if request and request.client else None
        AuditLogger.log(
            db=db,
            action="CREDENTIAL_RESET",
            entity_type="User",
            entity_id=user_id,
            user_id=user_id,
            ip_address=client_ip,
            status="success",
            new_values={"email": user.email, "role": user.role},
        )

        return {"success": True, "message": "Credentials updated"}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error resetting credentials: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Soft-delete user by marking account inactive."""
    try:
        UserService.delete_user(db, user_id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/audit/credentials")
def get_credential_audits(
    hospital_id: str = None,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    """Get credential-related audit logs for HM audit page."""
    try:
        query = db.query(AuditLog).filter(
            AuditLog.action.in_(["CREDENTIAL_CREATED", "CREDENTIAL_UPDATED", "CREDENTIAL_RESET"])
        )

        if hospital_id:
            query = query.join(User, User.id == AuditLog.entity_id).filter(User.hospital_id == hospital_id)

        rows = query.order_by(AuditLog.timestamp.desc()).limit(min(max(limit, 1), 500)).all()

        logs = []
        for row in rows:
            try:
                new_values = json.loads(row.new_values) if row.new_values else {}
            except Exception:
                new_values = {}

            logs.append({
                "id": row.id,
                "action": row.action,
                "entity_type": row.entity_type,
                "entity_id": row.entity_id,
                "user_id": row.user_id,
                "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                "status": row.status,
                "new_values": new_values,
            })

        return {"success": True, "data": {"logs": logs}}
    except Exception as e:
        logger.error(f"Error getting credential audits: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


