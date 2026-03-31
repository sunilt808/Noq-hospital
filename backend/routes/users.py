# backend/routes/users.py - User Management Routes (MongoDB)

import json
import logging
from datetime import datetime
from uuid import uuid4
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Request, Depends
from pydantic import BaseModel, EmailStr
from database import mongodb, Room
from services.auth_service import UserService, AuthService, require_auth
from audit import AuditLogger

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    status: str
    specialization: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    room_id: Optional[str] = None
    room_no: Optional[str] = None
    floor: Optional[str] = None
    license: Optional[str] = None
    shift: Optional[str] = None
    advanced_booking_category: Optional[str] = None
    fee: Optional[float] = None
    experience: Optional[int] = None
    qualifications: Optional[str] = None
    category: Optional[str] = None
    promotion_label: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


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


def _serialize_user(user: dict) -> dict:
    user["id"] = str(user.get("_id", user.get("id")))
    for field in ["created_at", "updated_at"]:
        if field in user and isinstance(user[field], datetime):
            user[field] = user[field].isoformat()
    return user


@router.get("")
async def list_users(
    role: str = None,
    hospital_id: str = None
):
    """List users from MongoDB."""
    try:
        if mongodb is None: return {"success": False, "data": {"users": []}}
        query = {}
        if role:
            query["role"] = role
            query["status"] = {"$ne": "inactive"}
        if hospital_id:
            query["hospital_id"] = hospital_id

        cursor = mongodb.users.find(query)
        users = await cursor.to_list(length=1000)

        return {
            "success": True,
            "data": {
                "users": [_serialize_user(user) for user in users]
            }
        }
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/me", response_model=UserResponse)
async def get_current_user(auth_payload: dict = Depends(require_auth)):
    """Get current user profile from MongoDB."""
    try:
        user_id = auth_payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await mongodb.users.find_one({"_id": user_id})
        if not user:
            user = await mongodb.users.find_one({"id": user_id})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(**_serialize_user(user))
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    req: UpdateUserRequest,
    auth_payload: dict = Depends(require_auth)
):
    """Update current user's profile in MongoDB."""
    try:
        user_id = auth_payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        updates = req.model_dump(exclude_unset=True)
        if "name" in updates:
            updates["full_name"] = updates.pop("name")
        
        updated_user = await UserService.update_user(user_id, **updates)
        return UserResponse(**_serialize_user(updated_user))
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get user by ID from MongoDB."""
    try:
        user = await UserService.get_user(user_id)
        return UserResponse(**_serialize_user(user))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/create")
async def create_user(
    payload: CreateUserRequest,
    request: Request
):
    """Create a user account in MongoDB."""
    try:
        if len(payload.password or "") < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

        user = await UserService.create_user(
            email=payload.email,
            password=payload.password,
            full_name=payload.name,
            role=payload.role,
            hospital_id=payload.hospital_id,
            phone=payload.phone,
        )

        profile_updates = payload.model_dump(exclude={"name", "email", "password", "role", "hospital_id", "phone"})
        profile_updates = {k: v for k, v in profile_updates.items() if v is not None}
        if "hospital_name" in profile_updates:
            profile_updates["hospital_name"] = payload.hospital_name

        if profile_updates:
            user = await UserService.update_user(user["id"], **profile_updates)

        # Room assignment logic
        if payload.role == "doctor" and payload.hospital_id and payload.room_no:
            room_no = str(payload.room_no).strip()
            floor = str(payload.floor or "1").strip()
            
            room = await mongodb.rooms.find_one({
                "hospital_id": payload.hospital_id,
                "room_number": room_no,
                "floor": floor
            })
            
            if room:
                await mongodb.rooms.update_one(
                    {"_id": room["_id"]},
                    {"$set": {
                        "department_id": payload.department_id,
                        "department_name": payload.department_name,
                        "status": "occupied",
                        "assigned_doctor_id": user["id"],
                        "assigned_doctor_name": user["full_name"],
                        "updated_at": datetime.utcnow()
                    }}
                )
                room_id = room["_id"]
            else:
                room_id = str(uuid4())
                await mongodb.rooms.insert_one({
                    "_id": room_id,
                    "hospital_id": payload.hospital_id,
                    "department_id": payload.department_id,
                    "department_name": payload.department_name,
                    "room_number": room_no,
                    "floor": floor,
                    "capacity": 1,
                    "status": "occupied",
                    "type": "doctor",
                    "assigned_doctor_id": user["id"],
                    "assigned_doctor_name": user["full_name"],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                })
            
            user = await UserService.update_user(user["id"], room_id=room_id, room_no=room_no, floor=floor)

        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log(
            action="CREDENTIAL_CREATED",
            entity_type="User",
            entity_id=user["id"],
            user_id=user["id"],
            ip_address=client_ip,
            new_values={"email": user["email"], "role": user["role"], "status": user["status"]},
        )

        return {"success": True, "id": user["id"], "user": _serialize_user(user)}
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    full_name: str = None,
    phone: str = None,
    request: Request = None
):
    """Update user details in MongoDB."""
    try:
        updates = {}
        if full_name: updates["full_name"] = full_name
        if phone: updates["phone"] = phone
        
        user = await UserService.update_user(user_id, **updates)
        
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log_entity_update("User", user_id, {}, updates, user_id, client_ip)
        
        return UserResponse(**_serialize_user(user))
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{user_id}")
async def patch_user(
    user_id: str,
    payload: UpdateUserRequest,
    request: Request
):
    """Patch user fields in MongoDB."""
    try:
        updates = payload.model_dump(exclude_unset=True)
        if "name" in updates: updates["full_name"] = updates.pop("name")
        
        if not updates:
            user = await UserService.get_user(user_id)
            return {"success": True, "user": _serialize_user(user)}

        user = await UserService.update_user(user_id, **updates)

        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log("CREDENTIAL_UPDATED", "User", user_id, user_id, None, updates, client_ip)

        return {"success": True, "user": _serialize_user(user)}
    except Exception as e:
        logger.error(f"Error patching user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{user_id}/credentials")
async def reset_user_credentials(
    user_id: str,
    payload: ResetCredentialsRequest,
    request: Request
):
    """Reset user password in MongoDB."""
    try:
        if len(payload.password or "") < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

        await mongodb.users.update_one(
            {"_id": user_id},
            {"$set": {"password_hash": AuthService.hash_password(payload.password), "updated_at": datetime.utcnow()}}
        )

        user = await UserService.get_user(user_id)
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log("CREDENTIAL_RESET", "User", user_id, user_id, None, {"email": user["email"]}, client_ip)

        return {"success": True, "message": "Credentials updated"}
    except Exception as e:
        logger.error(f"Error resetting credentials: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{user_id}")
async def delete_user(user_id: str):
    """Soft-delete user in MongoDB."""
    try:
        await UserService.delete_user(user_id)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/audit/credentials")
async def get_credential_audits(
    hospital_id: str = None,
    limit: int = 200
):
    """Get audit logs for HM audit page from MongoDB."""
    try:
        actions = ["CREDENTIAL_CREATED", "CREDENTIAL_UPDATED", "CREDENTIAL_RESET", "CREDENTIAL_DELETED", "CREATE", "UPDATE", "DELETE", "LOGIN", "FAILED_LOGIN", "SIGNUP"]
        
        query = {"action": {"$in": actions}}
        if hospital_id:
            # First find users for this hospital
            user_cursor = mongodb.users.find({"hospital_id": hospital_id}, {"_id": 1})
            user_ids = [str(u["_id"]) for u in await user_cursor.to_list(length=10000)]
            query["$or"] = [{"entity_id": {"$in": user_ids}}, {"user_id": {"$in": user_ids}}]

        cursor = mongodb.audit_logs.find(query).sort("timestamp", -1).limit(limit)
        rows = await cursor.to_list(length=limit)

        logs = []
        for row in rows:
            logs.append({
                "id": str(row["_id"]),
                "action": row["action"],
                "entity_type": row["entity_type"],
                "entity_id": row["entity_id"],
                "user_id": row["user_id"],
                "timestamp": row["timestamp"].isoformat() if row.get("timestamp") else None,
                "status": row["status"],
                "new_values": row.get("new_values", {}),
            })

        return {"success": True, "data": {"logs": logs}}
    except Exception as e:
        logger.error(f"Error getting credential audits: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")



