# backend/services/advanced_booking_service.py - Advanced booking business logic (MongoDB)

from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid
from database import mongodb
from services import user_service

def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def _gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12].upper()}"

def _doctor_matches_case(doctor: dict, case_type: str) -> bool:
    category = str(doctor.get('advanced_booking_category') or doctor.get('advancedBookingCategory') or 'general').lower()
    case_key = str(case_type or '').lower()
    if category == case_key:
        return True
    if category not in ('general', 'any', ''):
        return False

    text = f"{doctor.get('specialization', '')} {doctor.get('department', '')}".lower()
    if case_key == 'pregnancy':
        return any(token in text for token in ('gyn', 'obst', 'women', 'maternity'))
    if case_key == 'baby':
        return any(token in text for token in ('pedia', 'child', 'neonatal'))
    if case_key == 'elder':
        return any(token in text for token in ('geriat', 'general', 'internal', 'medicine', 'senior'))
    return True

def _doctor_is_available(doctor: dict) -> bool:
    status = str(doctor.get('status') or 'active').lower()
    return status not in ('inactive', 'disabled', 'blocked', 'suspended')

async def _allocate_doctor(hospital_id: str, case_type: str) -> Optional[dict]:
    if mongodb is None: return None
    
    all_docs = await user_service.get_all_users(role='doctor', hospital_id=hospital_id)
    doctors = [
        item for item in all_docs
        if _doctor_is_available(item) and _doctor_matches_case(item, case_type)
    ]
    if not doctors:
        return None

    # Get active bookings from MongoDB
    cursor = mongodb.advanced_bookings.find({"hospital_id": hospital_id})
    existing = await cursor.to_list(length=1000)

    weighted = []
    for doctor in doctors:
        doctor_id = str(doctor.get('id') or doctor.get('_id') or '')
        active_count = sum(
            1 for item in existing
            if str(item.get('doctor_id') or '') == doctor_id
            and str(item.get('status') or '').lower() in ('allocated', 'in_consultation')
        )
        weighted.append((active_count, str(doctor.get('name') or ''), doctor))

    weighted.sort(key=lambda item: (item[0], item[1]))
    return weighted[0][2]

async def create_booking(data: dict) -> dict:
    if mongodb is None: return {}
    booking_id = _gen_id("AB-")
    now_dt = datetime.utcnow()

    doctor_id = str(data.get("doctor_id") or "")
    doctor_name = data.get("doctor_name", "")
    doctor_specialization = data.get("doctor_specialization", "")

    if not doctor_id:
        allocated_doctor = await _allocate_doctor(str(data.get('hospital_id') or ''), str(data.get('case_type') or ''))
        if not allocated_doctor:
            raise ValueError('No eligible doctor available for this advanced booking.')
        doctor_id = str(allocated_doctor.get('id') or allocated_doctor.get('_id') or '')
        doctor_name = allocated_doctor.get('name', '')
        doctor_specialization = allocated_doctor.get('specialization') or allocated_doctor.get('department', '')

    booking_doc = {
        "_id": booking_id,
        "id": booking_id,
        "case_type": data.get("case_type"),
        "case_label": data.get("case_label"),
        "patient_id": str(data.get("patient_id") or ""),
        "patient_name": data.get("patient_name"),
        "patient_age": data.get("patient_age", 0),
        "patient_gender": data.get("patient_gender", ""),
        "hospital_id": str(data.get("hospital_id") or ""),
        "hospital_name": data.get("hospital_name", ""),
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "doctor_specialization": doctor_specialization,
        "room": data.get("room"),
        "room_id": str(data.get("room_id") or ""),
        "room_type": data.get("room_type", ""),
        "reason": data.get("reason", ""),
        "appointment_date": data.get("appointment_date"),
        "priority": data.get("priority", "high"),
        "status": str(data.get("status", "allocated")),
        "allocation_method": data.get("allocation_method", "auto-doctor-load-balanced"),
        "source": data.get("source", "advanced-booking"),
        "allocated_at": now_dt,
        "created_at": now_dt,
        "updated_at": now_dt,
    }

    await mongodb.advanced_bookings.insert_one(booking_doc)
    return booking_doc

async def get_booking_by_id(booking_id: str) -> Optional[dict]:
    if mongodb is None: return None
    booking = await mongodb.advanced_bookings.find_one({"_id": booking_id})
    if booking:
        booking["id"] = str(booking.get("_id", booking.get("id")))
    return booking

async def get_bookings_scoped(payload: dict) -> List[dict]:
    if mongodb is None: return []
    role = str(payload.get("role") or "").lower()
    user_id = str(payload.get("sub") or "")
    hospital_id = str(payload.get("hospital_id") or "")

    query = {}
    if role == "admin":
        pass
    elif role == "hm":
        query["hospital_id"] = hospital_id
    elif role == "doctor":
        query["doctor_id"] = user_id
    elif role == "patient":
        query["patient_id"] = user_id
    else:
        return []

    cursor = mongodb.advanced_bookings.find(query).sort("created_at", -1)
    bookings = await cursor.to_list(length=1000)
    for b in bookings:
        b["id"] = str(b.get("_id", b.get("id")))
    return bookings

async def update_booking_status(booking_id: str, status: str, payload: Dict[str, Any]) -> Optional[dict]:
    if mongodb is None: return None
    booking = await get_booking_by_id(booking_id)
    if not booking:
        return None

    role = str(payload.get("role") or "").lower()
    actor_id = str(payload.get("sub") or "")
    actor_hospital_id = str(payload.get("hospital_id") or "")

    if role == "doctor" and str(booking.get("doctor_id") or "") != actor_id:
        raise PermissionError("Doctor can update only own allocated bookings")

    if role == "hm" and actor_hospital_id and str(booking.get("hospital_id") or "") != actor_hospital_id:
        raise PermissionError("HM can update only own hospital bookings")

    if role not in ("doctor", "hm", "admin"):
        raise PermissionError("Role not allowed")

    updates = {
        "status": status,
        "updated_at": datetime.utcnow(),
    }

    await mongodb.advanced_bookings.update_one({"_id": booking_id}, {"$set": updates})
    return await get_booking_by_id(booking_id)

async def assign_booking_doctor(
    booking_id: str,
    doctor_id: str,
    payload: Dict[str, Any],
    doctor_name: str = "",
    doctor_specialization: str = "",
    allocation_method: str = "hm-manual-assignment",
) -> Optional[dict]:
    if mongodb is None: return None
    booking = await get_booking_by_id(booking_id)
    if not booking:
        return None

    role = str(payload.get("role") or "").lower()
    actor_hospital_id = str(payload.get("hospital_id") or "")

    if role not in ("hm", "admin"):
        raise PermissionError("Role not allowed")

    if role == "hm" and actor_hospital_id and str(booking.get("hospital_id") or "") != actor_hospital_id:
        raise PermissionError("HM can update only own hospital bookings")

    selected_doctor = await user_service.get_user_by_id(str(doctor_id))
    if not selected_doctor or str(selected_doctor.get("role") or "").lower() != "doctor":
        raise ValueError("Selected doctor not found")

    booking_hospital_id = str(booking.get("hospital_id") or "")
    doctor_hospital_id = str(selected_doctor.get("hospital_id") or "")
    if booking_hospital_id and doctor_hospital_id and booking_hospital_id != doctor_hospital_id:
        raise ValueError("Selected doctor does not belong to this hospital")

    updates = {
        "doctor_id": str(doctor_id),
        "doctor_name": doctor_name or selected_doctor.get("name") or "Doctor",
        "doctor_specialization": doctor_specialization or selected_doctor.get("specialization") or "",
        "allocation_method": allocation_method or "hm-manual-assignment",
        "status": "allocated",
        "updated_at": datetime.utcnow(),
    }

    await mongodb.advanced_bookings.update_one({"_id": booking_id}, {"$set": updates})
    return await get_booking_by_id(booking_id)
