from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

from firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter
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


def _allocate_doctor(hospital_id: str, case_type: str) -> Optional[dict]:
    doctors = [
        item for item in user_service.get_all_users(role='doctor', hospital_id=hospital_id)
        if _doctor_is_available(item) and _doctor_matches_case(item, case_type)
    ]
    if not doctors:
        return None

    active_docs = db.collection('advanced_bookings').where(
        filter=FieldFilter('hospital_id', '==', hospital_id)
    ).stream()
    existing = [doc.to_dict() for doc in active_docs]

    weighted = []
    for doctor in doctors:
        doctor_id = str(doctor.get('id') or '')
        active_count = sum(
            1 for item in existing
            if str(item.get('doctor_id') or '') == doctor_id
            and str(item.get('status') or '').lower() in ('allocated', 'in_consultation')
        )
        weighted.append((active_count, str(doctor.get('name') or ''), doctor))

    weighted.sort(key=lambda item: (item[0], item[1]))
    return weighted[0][2]


def create_booking(data: dict) -> dict:
    booking_id = _gen_id("AB-")
    now = _now_iso()

    doctor_id = str(data.get("doctor_id") or "")
    doctor_name = data.get("doctor_name", "")
    doctor_specialization = data.get("doctor_specialization", "")

    if not doctor_id:
        allocated_doctor = _allocate_doctor(str(data.get('hospital_id') or ''), str(data.get('case_type') or ''))
        if not allocated_doctor:
            raise ValueError('No eligible doctor available for this advanced booking.')
        doctor_id = str(allocated_doctor.get('id') or '')
        doctor_name = allocated_doctor.get('name', '')
        doctor_specialization = allocated_doctor.get('specialization') or allocated_doctor.get('department', '')

    booking_doc = {
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
        "allocated_at": data.get("allocated_at") or now,
        "created_at": now,
        "updated_at": now,
    }

    db.collection("advanced_bookings").document(booking_id).set(booking_doc)
    return booking_doc


def get_booking_by_id(booking_id: str) -> Optional[dict]:
    snap = db.collection("advanced_bookings").document(booking_id).get()
    if not snap.exists:
        return None
    return {"id": snap.id, **snap.to_dict()}


def get_bookings_scoped(payload: dict) -> List[dict]:
    role = str(payload.get("role") or "").lower()
    user_id = str(payload.get("sub") or "")
    hospital_id = str(payload.get("hospital_id") or "")

    ref = db.collection("advanced_bookings")

    if role == "admin":
        docs = ref.stream()
    elif role == "hm":
        docs = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id)).stream()
    elif role == "doctor":
        docs = ref.where(filter=FieldFilter("doctor_id", "==", user_id)).stream()
    elif role == "patient":
        docs = ref.where(filter=FieldFilter("patient_id", "==", user_id)).stream()
    else:
        return []

    bookings = [{"id": doc.id, **doc.to_dict()} for doc in docs]
    bookings.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return bookings


def update_booking_status(booking_id: str, status: str, payload: Dict[str, Any]) -> Optional[dict]:
    booking = get_booking_by_id(booking_id)
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
        "updated_at": _now_iso(),
    }

    db.collection("advanced_bookings").document(booking_id).update(updates)
    return get_booking_by_id(booking_id)


def assign_booking_doctor(
    booking_id: str,
    doctor_id: str,
    payload: Dict[str, Any],
    doctor_name: str = "",
    doctor_specialization: str = "",
    allocation_method: str = "hm-manual-assignment",
) -> Optional[dict]:
    booking = get_booking_by_id(booking_id)
    if not booking:
        return None

    role = str(payload.get("role") or "").lower()
    actor_hospital_id = str(payload.get("hospital_id") or "")

    if role not in ("hm", "admin"):
        raise PermissionError("Role not allowed")

    if role == "hm" and actor_hospital_id and str(booking.get("hospital_id") or "") != actor_hospital_id:
        raise PermissionError("HM can update only own hospital bookings")

    selected_doctor = user_service.get_user_by_id(str(doctor_id))
    if not selected_doctor or str(selected_doctor.get("role") or "").lower() != "doctor":
        raise ValueError("Selected doctor not found")

    booking_hospital_id = str(booking.get("hospital_id") or "")
    doctor_hospital_id = str(selected_doctor.get("hospital_id") or "")
    if booking_hospital_id and doctor_hospital_id and booking_hospital_id != doctor_hospital_id:
        raise ValueError("Selected doctor does not belong to this hospital")

    updates = {
        "doctor_id": str(doctor_id),
        "doctor_name": doctor_name or selected_doctor.get("name", "Doctor"),
        "doctor_specialization": doctor_specialization or selected_doctor.get("specialization", ""),
        "allocation_method": allocation_method or "hm-manual-assignment",
        "status": "allocated",
        "updated_at": _now_iso(),
    }

    db.collection("advanced_bookings").document(booking_id).update(updates)
    return get_booking_by_id(booking_id)
