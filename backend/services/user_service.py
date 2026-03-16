# backend/services/user_service.py - User, hospital, and auth logic

from firebase import db, auth as firebase_auth
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid
import hashlib
import os
import json

# ═════════════════════════════════════════════════════════════════════
# FIREBASE-FIRST SERVICE WITH SMART IN-MEMORY CACHING FOR QUOTA MANAGEMENT
# ═════════════════════════════════════════════════════════════════════

from datetime import datetime, timedelta

# In-memory cache with TTL (not persisted, just for quota management)
_cache = {
    "_hospitals": {"data": [], "ttl": None},
    "_departments": {"data": [], "ttl": None},
    "_doctors": {"data": [], "ttl": None},
    "_users_by_email": {"data": {}, "ttl": None},  # email -> user dict
}
CACHE_TTL_SECONDS = 300  # 5 minutes

def _is_cache_valid(cache_key: str) -> bool:
    """Check if cache is still valid."""
    if cache_key not in _cache:
        return False
    cache_entry = _cache[cache_key]
    if cache_entry["ttl"] is None:
        return False
    return datetime.utcnow() < cache_entry["ttl"]

def _get_cached_data(cache_key: str):
    """Get data from cache if valid."""
    if _is_cache_valid(cache_key):
        return _cache[cache_key]["data"]
    return None

def _set_cache_data(cache_key: str, data):
    """Set cache data with TTL."""
    _cache[cache_key] = {
        "data": data,
        "ttl": datetime.utcnow() + timedelta(seconds=CACHE_TTL_SECONDS)
    }

def _load_fallback_cache():
    """Load fallback cache from local JSON files (bootstrap only)."""
    try:
        # Load users (needed for authentication fallback)
        users_file = os.path.join(os.path.dirname(__file__), "..", "data", "users_cache.json")
        if os.path.exists(users_file):
            with open(users_file, 'r') as f:
                data = json.load(f)
                users_by_email = {}
                for user in data.get("users", []):
                    email = user.get("email", "").lower()
                    if email:
                        users_by_email[email] = user
                _cache["_users_by_email"] = {
                    "data": users_by_email,
                    "ttl": datetime.utcnow() + timedelta(seconds=86400)  # 24h for users
                }
                print(f"✓ Loaded {len(users_by_email)} users from fallback cache")
    except Exception as e:
        print(f"Note: Could not load users fallback cache: {e}")

    try:
        # Load hospitals
        hospitals_file = os.path.join(os.path.dirname(__file__), "..", "data", "hospitals_cache.json")
        if os.path.exists(hospitals_file):
            with open(hospitals_file, 'r') as f:
                data = json.load(f)
                hospitals = [
                    {"id": h.get("id") or h.get("hospital_id"), **h}
                    for h in data.get("hospitals", [])
                ]
                _set_cache_data("_hospitals", hospitals)
                print(f"✓ Loaded {len(hospitals)} hospitals from fallback cache")
    except Exception as e:
        print(f"Note: Could not load hospitals fallback cache: {e}")
    
    try:
        # Load departments
        depts_file = os.path.join(os.path.dirname(__file__), "..", "data", "departments_cache.json")
        if os.path.exists(depts_file):
            with open(depts_file, 'r') as f:
                data = json.load(f)
                depts = [
                    {"id": d.get("id") or d.get("department_id"), **d}
                    for d in data.get("departments", [])
                ]
                _set_cache_data("_departments", depts)
                print(f"✓ Loaded {len(depts)} departments from fallback cache")
    except Exception as e:
        print(f"Note: Could not load departments fallback cache: {e}")
    
    try:
        # Load doctors
        doctors_file = os.path.join(os.path.dirname(__file__), "..", "data", "doctors_cache.json")
        if os.path.exists(doctors_file):
            with open(doctors_file, 'r') as f:
                data = json.load(f)
                doctors = [
                    {"id": d.get("id") or d.get("doctor_id"), **d}
                    for d in data.get("doctors", [])
                ]
                _set_cache_data("_doctors", doctors)
                print(f"✓ Loaded {len(doctors)} doctors from fallback cache")
    except Exception as e:
        print(f"Note: Could not load doctors fallback cache: {e}")

# Load fallback caches on service startup
_load_fallback_cache()


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12].upper()}"


def _hash_password(password: str) -> str:
    """Simple sha256 hash — in production use bcrypt."""
    salt = os.environ.get("PASSWORD_SALT", "noq_salt_2026")
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()


def _sync_firebase_auth_user(email: str, password: Optional[str] = None, display_name: Optional[str] = None, existing_uid: Optional[str] = None) -> Optional[str]:
    """Create or update Firebase Auth user and return uid."""
    email_clean = (email or "").strip().lower()
    if not email_clean:
        return None

    user_record = None
    uid = (existing_uid or "").strip() or None

    try:
        if uid:
            user_record = firebase_auth.get_user(uid)
    except Exception:
        user_record = None

    if not user_record:
        try:
            user_record = firebase_auth.get_user_by_email(email_clean)
            uid = user_record.uid
        except Exception:
            user_record = None

    try:
        if user_record:
            update_kwargs = {"email": email_clean}
            if display_name:
                update_kwargs["display_name"] = display_name
            if password:
                update_kwargs["password"] = password
            firebase_auth.update_user(user_record.uid, **update_kwargs)
            return user_record.uid

        create_kwargs = {
            "email": email_clean,
        }
        if display_name:
            create_kwargs["display_name"] = display_name
        if password:
            create_kwargs["password"] = password

        created = firebase_auth.create_user(**create_kwargs)
        return created.uid
    except Exception:
        return uid


# ─────────────────────────────────────────────
#  USER CRUD
# ─────────────────────────────────────────────

def create_user(data: dict) -> dict:
    role = data.get("role", "user")
    role_prefix = {
        "hm": "HM-",
        "doctor": "DOC-",
        "patient": "PAT-",
        "admin": "ADM-",
    }.get(role, "USR-")
    user_id = _gen_id(role_prefix)
    password_raw = data.get("password")
    firebase_uid = data.get("firebase_uid") or _sync_firebase_auth_user(
        data.get("email"),
        password=password_raw,
        display_name=data.get("name"),
    )

    user_doc = {
        "id": user_id,
        "name": data["name"],
        "email": data["email"].lower(),
        "role": data["role"],
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
        "firebase_uid": firebase_uid,
        "password_hash": _hash_password(password_raw) if password_raw else None,
        "created_at": _now_iso(),
    }

    db.collection("users").document(user_id).set(user_doc)

    user_doc.pop("password_hash", None)
    
    return user_doc


def get_all_users(role: Optional[str] = None, hospital_id: Optional[str] = None) -> List[dict]:
    ref = db.collection("users")
    if role:
        ref = ref.where(filter=FieldFilter("role", "==", role))
    if hospital_id:
        ref = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
    users = [{"id": u.id, **u.to_dict()} for u in ref.stream()]
    for u in users:
        u.pop("password_hash", None)
    return users


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID directly from Firebase."""
    try:
        doc = db.collection("users").document(user_id).get()
        if doc.exists:
            data = {"id": doc.id, **doc.to_dict()}
            data.pop("password_hash", None)
            return data
    except Exception:
        pass
    return None


def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email - Firebase first, fallback to cache if quota exceeded."""
    email_lower = email.lower()
    try:
        docs = (
            db.collection("users")
            .where(filter=FieldFilter("email", "==", email_lower))
            .limit(1)
            .stream()
        )
        for doc in docs:
            user = {"id": doc.id, **doc.to_dict()}
            # Update cache with fresh data
            users_cache = _cache.get("_users_by_email", {"data": {}})
            users_cache["data"][email_lower] = user
            return user
    except Exception as e:
        # On quota or connection error, fallback to cached user
        if "quota" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
            print(f"⚠️ Firebase quota hit on user lookup, using cache: {email_lower}")
            users_by_email = _cache.get("_users_by_email", {"data": {}}).get("data", {})
            cached_user = users_by_email.get(email_lower)
            if cached_user:
                return dict(cached_user)  # return a copy
        else:
            print(f"Error accessing Firebase user {email_lower}: {e}")
    return None


def update_user(user_id: str, updates: dict) -> Optional[dict]:
    ref = db.collection("users").document(user_id)
    snapshot = ref.get()
    if not snapshot.exists:
        return None

    current = snapshot.to_dict() or {}
    updated_email = updates.get("email", current.get("email"))
    updated_name = updates.get("name", current.get("name"))
    raw_password = updates.get("password")

    firebase_uid = _sync_firebase_auth_user(
        updated_email,
        password=raw_password,
        display_name=updated_name,
        existing_uid=current.get("firebase_uid"),
    )

    if "password" in updates:
        updates["password_hash"] = _hash_password(updates.pop("password"))
    if firebase_uid:
        updates["firebase_uid"] = firebase_uid

    ref.update(updates)
    data = {"id": user_id, **(ref.get().to_dict() or {})}
    data.pop("password_hash", None)
    return data


def delete_user(user_id: str) -> bool:
    ref = db.collection("users").document(user_id)
    if not ref.get().exists:
        return False
    ref.delete()
    return True


# ─────────────────────────────────────────────
#  HOSPITAL CRUD
# ─────────────────────────────────────────────

def create_hospital(data: dict) -> dict:
    hospital_id = f"NOQ-{'PRI' if data.get('category','').lower() == 'private' else 'GOV'}-{uuid.uuid4().hex[:5].upper()}"
    hospital_doc = {
        "id": hospital_id,
        "hospital_name": data["hospital_name"],
        "hm_name": data["hm_name"],
        "email": data["email"].lower(),
        "phone": data["phone"],
        "category": data.get("category", "private"),
        "address": data.get("address"),
        "emergency_contact": data.get("emergency_contact"),
        "status": "PENDING_APPROVAL",
        "created_at": _now_iso(),
    }
    db.collection("hospitals").document(hospital_id).set(hospital_doc)
    return hospital_doc


def get_all_hospitals(status: Optional[str] = None) -> List[dict]:
    """Get all hospitals - Firebase first, fallback to cache if quota exceeded."""
    # Try cache first
    cached = _get_cached_data("_hospitals")
    
    try:
        ref = db.collection("hospitals")
        if status:
            ref = ref.where(filter=FieldFilter("status", "==", status))
        
        hospitals = [{"id": h.id, **h.to_dict()} for h in ref.stream()]
        _set_cache_data("_hospitals", hospitals)  # Update cache on success
        return hospitals
    except Exception as e:
        # If quota exceeded or error, fallback to cache
        if "quota" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e):
            print(f"⚠️ Firebase quota limit hit, using cached data: {e}")
            if cached:
                if status:
                    return [h for h in cached if h.get("status") == status]
                return cached
        
        # If no cache and error, return empty list
        print(f"Error accessing Firebase hospitals: {e}")
        return []


def get_hospital_by_id(hospital_id: str) -> Optional[dict]:
    """Get hospital by ID directly from Firebase."""
    try:
        doc = db.collection("hospitals").document(hospital_id).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
    except Exception:
        pass
    return None


def update_hospital_status(hospital_id: str, status: str, message: str = "") -> Optional[dict]:
    ref = db.collection("hospitals").document(hospital_id)
    if not ref.get().exists:
        return None
    ref.update({"status": status, "admin_message": message, "reviewed_at": _now_iso()})
    return {"id": hospital_id, **ref.get().to_dict()}


# ─────────────────────────────────────────────
#  DEPARTMENT CRUD (CACHE-FIRST)
# ─────────────────────────────────────────────

def get_all_departments(hospital_id: Optional[str] = None) -> List[dict]:
    """Get departments - Firebase first, fallback to cache if quota exceeded."""
    # Try cache first
    cached = _get_cached_data("_departments")
    
    try:
        ref = db.collection("departments")
        if hospital_id:
            ref = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
        
        departments = [{"id": d.id, **d.to_dict()} for d in ref.stream()]
        _set_cache_data("_departments", departments)  # Update cache on success
        return departments
    except Exception as e:
        # If quota exceeded or error, fallback to cache
        if "quota" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e):
            print(f"⚠️ Firebase quota limit hit, using cached data: {e}")
            if cached:
                if hospital_id:
                    return [d for d in cached if d.get("hospital_id") == hospital_id]
                return cached
        
        # If no cache and error, return empty list
        print(f"Error accessing Firebase departments: {e}")
        return []


def get_department_by_id(department_id: str) -> Optional[dict]:
    """Get department by ID directly from Firebase."""
    try:
        doc = db.collection("departments").document(department_id).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────
#  DOCTOR CRUD (CACHE-FIRST)
# ─────────────────────────────────────────────

def get_all_doctors(hospital_id: Optional[str] = None, department_id: Optional[str] = None) -> List[dict]:
    """Get doctors - Firebase first, fallback to cache if quota exceeded."""
    # Try cache first
    cached = _get_cached_data("_doctors")
    
    try:
        ref = db.collection("doctors")
        if hospital_id:
            ref = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
        if department_id:
            ref = ref.where(filter=FieldFilter("department_id", "==", department_id))
        
        doctors = [{"id": d.id, **d.to_dict()} for d in ref.stream()]
        _set_cache_data("_doctors", doctors)  # Update cache on success
        return doctors
    except Exception as e:
        # If quota exceeded or error, fallback to cache
        if "quota" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e):
            print(f"⚠️ Firebase quota limit hit, using cached data: {e}")
            if cached:
                result = cached
                if hospital_id:
                    result = [d for d in result if d.get("hospital_id") == hospital_id]
                if department_id:
                    result = [d for d in result if d.get("department_id") == department_id]
                return result
        
        # If no cache and error, return empty list
        print(f"Error accessing Firebase doctors: {e}")
        return []


def get_doctor_by_id(doctor_id: str) -> Optional[dict]:
    """Get doctor by ID directly from Firebase."""
    try:
        doc = db.collection("doctors").document(doctor_id).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────
#  AUTH HELPERS
# ─────────────────────────────────────────────

def verify_firebase_token(id_token: str) -> Optional[dict]:
    """Verify Firebase ID token and return decoded claims."""
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded
    except Exception:
        return None


def authenticate_user(email: str, password: str, role: str) -> Optional[dict]:
    """Verify email+password against Firestore users collection.
    
    Priority:
    1. If password_hash matches → authenticate (password login)
    2. If has firebase_uid → allow (Firebase login fallback)
    3. Otherwise → deny
    """
    user = get_user_by_email(email)
    if not user:
        return None
    if user.get("role") != role:
        return None

    stored_hash = user.get("password_hash")
    
    # Try password verification first
    if stored_hash and stored_hash == _hash_password(password):
        user.pop("password_hash", None)
        return user
    
    # If password failed but user has firebase_uid, allow Firebase login
    if user.get("firebase_uid"):
        user.pop("password_hash", None)
        return user
    
    return None


# ─────────────────────────────────────────────
#  NOTIFICATIONS
# ─────────────────────────────────────────────

def create_notification(data: dict) -> dict:
    notif_id = _gen_id("N-")
    notif_doc = {
        "id": notif_id,
        "title": data["title"],
        "message": data["message"],
        "target_user_id": data.get("target_user_id"),
        "target_role": data.get("target_role"),
        "hospital_id": data.get("hospital_id"),
        "type": data.get("type", "info"),
        "read": False,
        "created_at": _now_iso(),
    }
    db.collection("notifications").document(notif_id).set(notif_doc)
    return notif_doc


def get_notifications(user_id: Optional[str] = None, hospital_id: Optional[str] = None) -> List[dict]:
    ref = db.collection("notifications")
    notifs = [{"id": n.id, **n.to_dict()} for n in ref.stream()]
    # Filter by relevance
    if user_id or hospital_id:
        notifs = [
            n for n in notifs
            if n.get("target_user_id") == user_id
            or n.get("target_user_id") is None
            or (hospital_id and n.get("hospital_id") == hospital_id)
        ]
    return sorted(notifs, key=lambda x: x.get("created_at", ""), reverse=True)


def create_audit_log(
    event: str,
    status: str,
    actor_email: Optional[str] = None,
    actor_id: Optional[str] = None,
    role: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> dict:
    audit_id = _gen_id("AUD-")
    audit_doc = {
        "id": audit_id,
        "event": event,
        "status": status,
        "actor_email": actor_email,
        "actor_id": actor_id,
        "role": role,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "metadata": metadata or {},
        "created_at": _now_iso(),
    }
    db.collection("audit_logs").document(audit_id).set(audit_doc)
    return audit_doc


def create_patient_proof(data: dict) -> dict:
    proof_id = data.get("id") or _gen_id("PF-")
    proof_doc = {
        "id": proof_id,
        "user_id": data.get("user_id"),
        "email": data.get("email"),
        "file_name": data.get("file_name"),
        "original_name": data.get("original_name"),
        "mime_type": data.get("mime_type"),
        "size": data.get("size"),
        "sha256": data.get("sha256"),
        "status": data.get("status", "submitted"),
        "created_at": data.get("created_at") or _now_iso(),
    }
    db.collection("patient_proofs").document(proof_id).set(proof_doc)
    return proof_doc
