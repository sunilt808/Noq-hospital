# backend/services/user_service.py - User, hospital, and auth logic (MongoDB)

import logging
from database import mongodb
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid
import hashlib
import os

logger = logging.getLogger(__name__)

from services.auth_service import AuthService

def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def _gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12].upper()}"

def _hash_password(password: str) -> str:
    """Use PBKDF2 from AuthService for consistency."""
    return AuthService.hash_password(password)

# ─────────────────────────────────────────────
#  USER CRUD
# ─────────────────────────────────────────────

async def create_user(data: dict) -> dict:
    if mongodb is None: return {}
    role = data.get("role", "user")
    role_prefix = {
        "hm": "HM-",
        "doctor": "DOC-",
        "patient": "PAT-",
        "admin": "ADM-",
    }.get(role, "USR-")
    user_id = _gen_id(role_prefix)
    password_raw = data.get("password")

    user_doc = {
        "_id": user_id,
        "id": user_id,
        "name": data.get("name"),
        "email": data.get("email", "").lower(),
        "role": data.get("role"),
        "phone": data.get("phone"),
        "gender": data.get("gender"),
        "dob": data.get("dob"),
        "hospital_id": data.get("hospital_id"),
        "hospital_name": data.get("hospital_name"),
        "specialization": data.get("specialization"),
        "department_id": data.get("department_id"),
        "department_name": data.get("department_name"),
        "room_no": data.get("room_no"),
        "floor": data.get("floor"),
        "room_id": data.get("room_id"),
        "license": data.get("license"),
        "advanced_booking_category": data.get("advanced_booking_category"),
        "fee": data.get("fee"),
        "experience": data.get("experience"),
        "qualifications": data.get("qualifications"),
        "category": data.get("category"),
        "promotion_label": data.get("promotion_label"),
        "status": data.get("status", "active"),
        "password_hash": _hash_password(password_raw) if password_raw else None,
        "created_at": datetime.utcnow(),
    }

    await mongodb.users.insert_one(user_doc)
    user_doc.pop("password_hash", None)
    return user_doc

async def get_all_users(role: Optional[str] = None, hospital_id: Optional[str] = None) -> List[dict]:
    if mongodb is None: return []
    query = {}
    if role:
        query["role"] = role
    if hospital_id:
        query["hospital_id"] = hospital_id
    
    cursor = mongodb.users.find(query)
    users = await cursor.to_list(length=5000)
    for u in users:
        u["id"] = str(u.get("_id", u.get("id")))
        u.pop("password_hash", None)
    return users

async def get_user_by_id(user_id: str) -> Optional[dict]:
    if mongodb is None: return None
    user = await mongodb.users.find_one({"_id": user_id})
    if user:
        user["id"] = str(user.get("_id", user.get("id")))
        user.pop("password_hash", None)
    return user

async def get_user_by_email(email: str) -> Optional[dict]:
    if mongodb is None: return None
    email_lower = email.lower()
    user = await mongodb.users.find_one({"email": email_lower})
    if user:
        user["id"] = str(user.get("_id", user.get("id")))
    return user

async def update_user(user_id: str, updates: dict) -> Optional[dict]:
    if mongodb is None: return None
    
    if "password" in updates:
        updates["password_hash"] = _hash_password(updates.pop("password"))
    
    if "email" in updates:
        updates["email"] = updates["email"].lower()

    await mongodb.users.update_one({"_id": user_id}, {"$set": updates})
    return await get_user_by_id(user_id)

async def delete_user(user_id: str) -> bool:
    if mongodb is None: return False
    result = await mongodb.users.delete_one({"_id": user_id})
    return result.deleted_count > 0

# ─────────────────────────────────────────────
#  HOSPITAL CRUD
# ─────────────────────────────────────────────

async def create_hospital(data: dict) -> dict:
    if mongodb is None: return {}
    hospital_id = f"NOQ-{'PRI' if data.get('category','').lower() == 'private' else 'GOV'}-{uuid.uuid4().hex[:5].upper()}"
    hospital_doc = {
        "_id": hospital_id,
        "id": hospital_id,
        "hospital_name": data.get("hospital_name"),
        "hm_name": data.get("hm_name"),
        "email": data.get("email", "").lower(),
        "phone": data.get("phone"),
        "category": data.get("category", "private"),
        "address": data.get("address"),
        "emergency_contact": data.get("emergency_contact"),
        "status": "PENDING_APPROVAL",
        "created_at": datetime.utcnow(),
    }
    await mongodb.hospitals.insert_one(hospital_doc)
    return hospital_doc

async def get_all_hospitals(status: Optional[str] = None) -> List[dict]:
    if mongodb is None: return []
    query = {}
    if status:
        query["status"] = status
    
    cursor = mongodb.hospitals.find(query)
    hospitals = await cursor.to_list(length=1000)
    for h in hospitals:
        h["id"] = str(h.get("_id", h.get("id")))
    return hospitals

async def get_hospital_by_id(hospital_id: str) -> Optional[dict]:
    if mongodb is None: return None
    hospital = await mongodb.hospitals.find_one({"_id": hospital_id})
    if hospital:
        hospital["id"] = str(hospital.get("_id", hospital.get("id")))
    return hospital

async def update_hospital_status(hospital_id: str, status: str, message: str = "") -> Optional[dict]:
    if mongodb is None: return None
    await mongodb.hospitals.update_one(
        {"_id": hospital_id}, 
        {"$set": {"status": status, "admin_message": message, "reviewed_at": datetime.utcnow()}}
    )
    return await get_hospital_by_id(hospital_id)

# ─────────────────────────────────────────────
#  DEPARTMENT CRUD
# ─────────────────────────────────────────────

async def get_all_departments(hospital_id: Optional[str] = None) -> List[dict]:
    if mongodb is None: return []
    query = {}
    if hospital_id:
        query["hospital_id"] = hospital_id
    
    cursor = mongodb.departments.find(query)
    departments = await cursor.to_list(length=1000)
    for d in departments:
        d["id"] = str(d.get("_id", d.get("id")))
    return departments

async def get_department_by_id(department_id: str) -> Optional[dict]:
    if mongodb is None: return None
    dept = await mongodb.departments.find_one({"_id": department_id})
    if dept:
        dept["id"] = str(dept.get("_id", dept.get("id")))
    return dept

# ─────────────────────────────────────────────
#  DOCTOR CRUD
# ─────────────────────────────────────────────

async def get_all_doctors(hospital_id: Optional[str] = None, department_id: Optional[str] = None) -> List[dict]:
    if mongodb is None: return []
    query = {"role": "doctor"}
    if hospital_id:
        query["hospital_id"] = hospital_id
    if department_id:
        query["department_id"] = department_id
    
    cursor = mongodb.users.find(query)
    doctors = await cursor.to_list(length=1000)
    for d in doctors:
        d["id"] = str(d.get("_id", d.get("id")))
        d.pop("password_hash", None)
    return doctors

async def get_doctor_by_id(doctor_id: str) -> Optional[dict]:
    return await get_user_by_id(doctor_id)

# ─────────────────────────────────────────────
#  AUTH HELPERS
# ─────────────────────────────────────────────

async def authenticate_user(email: str, password: str, role: str) -> Optional[dict]:
    """Verify email+password against MongoDB users collection."""
    if mongodb is None: return None
    user = await get_user_by_email(email)
    if not user:
        return None
    if user.get("role") != role:
        return None

    stored_hash = user.get("password_hash")
    
    # Try password verification
    if stored_hash and stored_hash == _hash_password(password):
        user.pop("password_hash", None)
        # Compatibility fields
        user["hospitalId"] = user.get("hospital_id") or ""
        user["HID"] = user.get("hospital_id") or ""
        user["hospitalName"] = user.get("hospital_name") or ""
        return user
    
    return None

# ─────────────────────────────────────────────
#  NOTIFICATIONS
# ─────────────────────────────────────────────

async def create_notification(data: dict) -> dict:
    if mongodb is None: return {}
    notif_id = _gen_id("N-")
    notif_doc = {
        "_id": notif_id,
        "id": notif_id,
        "title": data.get("title"),
        "message": data.get("message"),
        "target_user_id": data.get("target_user_id"),
        "target_role": data.get("target_role"),
        "hospital_id": data.get("hospital_id"),
        "type": data.get("type", "info"),
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await mongodb.notifications.insert_one(notif_doc)
    return notif_doc

async def get_notifications(user_id: Optional[str] = None, hospital_id: Optional[str] = None) -> List[dict]:
    if mongodb is None: return []
    query = {}
    # Build query based on user_id or hospital_id
    # (n.get("target_user_id") == user_id or n.get("target_user_id") is None or (hospital_id and n.get("hospital_id") == hospital_id))
    
    # Simplified query for now:
    cursor = mongodb.notifications.find(query).sort("created_at", -1)
    notifs = await cursor.to_list(length=1000)
    
    filtered = []
    for n in notifs:
        n["id"] = str(n.get("_id", n.get("id")))
        # Actual filtering logic if needed (can be done in MongoDB query too)
        if user_id and n.get("target_user_id") and n.get("target_user_id") != user_id:
            continue
        if hospital_id and n.get("hospital_id") and n.get("hospital_id") != hospital_id:
            # If target_user_id is set and doesn't match, we already skipped.
            # If hospital_id is set and doesn't match, we skip unless it's general.
            pass
        filtered.append(n)
        
    return filtered

async def create_audit_log(
    event: str,
    status: str,
    actor_email: Optional[str] = None,
    actor_id: Optional[str] = None,
    role: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> dict:
    if mongodb is None: return {}
    audit_id = _gen_id("AUD-")
    audit_doc = {
        "_id": audit_id,
        "id": audit_id,
        "event": event,
        "status": status,
        "actor_email": actor_email,
        "actor_id": actor_id,
        "role": role,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "metadata": metadata or {},
        "created_at": datetime.utcnow(),
    }
    await mongodb.audit_logs.insert_one(audit_doc)
    return audit_doc

async def create_patient_proof(data: dict) -> dict:
    if mongodb is None: return {}
    proof_id = data.get("id") or _gen_id("PF-")
    proof_doc = {
        "_id": proof_id,
        "id": proof_id,
        "user_id": data.get("user_id"),
        "email": data.get("email"),
        "file_name": data.get("file_name"),
        "original_name": data.get("original_name"),
        "mime_type": data.get("mime_type"),
        "size": data.get("size"),
        "sha256": data.get("sha256"),
        "status": data.get("status", "submitted"),
        "created_at": datetime.utcnow(),
    }
    await mongodb.patient_proofs.insert_one(proof_doc)
    return proof_doc
