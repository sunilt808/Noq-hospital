# backend/services/queue_service.py - Queue & token business logic with Firestore

from firebase import db
from google.cloud.firestore_v1 import Client, transactional, Transaction
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12].upper()}"


# ─────────────────────────────────────────────
#  QUEUE OPERATIONS
# ─────────────────────────────────────────────

def create_queue(data: dict) -> dict:
    """Create a new queue document in Firestore."""
    queue_id = _gen_id("Q-")
    queue_doc = {
        "id": queue_id,
        "hospital_id": data.get("hospital_id"),
        "doctor_id": data.get("doctor_id"),
        "doctor_name": data.get("doctor_name"),
        "department": data.get("department"),
        "room": data.get("room"),
        "date": data.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
        "max_capacity": data.get("max_capacity", 50),
        "status": "active",
        "token_counter": 0,
        "current_token": None,
        "waiting_count": 0,
        "created_at": _now_iso(),
    }
    db.collection("queues").document(queue_id).set(queue_doc)
    return queue_doc


def get_all_queues(hospital_id: Optional[str] = None) -> List[dict]:
    """Fetch all queues, optionally filtered by hospital."""
    ref = db.collection("queues")
    if hospital_id:
        ref = ref.where(filter=FieldFilter("hospital_id", "==", hospital_id))
    return [{"id": q.id, **q.to_dict()} for q in ref.stream()]


def get_queue_by_id(queue_id: str) -> Optional[dict]:
    doc = db.collection("queues").document(queue_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


def update_queue(queue_id: str, updates: dict) -> Optional[dict]:
    ref = db.collection("queues").document(queue_id)
    if not ref.get().exists:
        return None
    ref.update(updates)
    return {"id": queue_id, **ref.get().to_dict()}


def delete_queue(queue_id: str) -> bool:
    ref = db.collection("queues").document(queue_id)
    if not ref.get().exists:
        return False
    ref.delete()
    return True


def call_next_in_queue(queue_id: str) -> Optional[dict]:
    """Atomically find and call the next waiting token in a queue."""
    # Get waiting tokens sorted by token_number
    tokens_ref = (
        db.collection("tokens")
        .where(filter=FieldFilter("queue_id", "==", queue_id))
        .where(filter=FieldFilter("status", "==", "waiting"))
    )
    waiting = sorted(
        [{"id": t.id, **t.to_dict()} for t in tokens_ref.stream()],
        key=lambda x: x.get("token_number", 999),
    )
    if not waiting:
        return None
    return call_token(waiting[0]["id"])


# ─────────────────────────────────────────────
#  TOKEN OPERATIONS
# ─────────────────────────────────────────────

@transactional
def _create_token_tx(transaction: Transaction, queue_ref, token_ref, token_doc: dict):
    """Atomically increment queue counter and create token."""
    queue_snap = queue_ref.get(transaction=transaction)
    if not queue_snap.exists:
        raise ValueError("Queue not found")

    current_counter = queue_snap.to_dict().get("token_counter", 0)
    new_counter = current_counter + 1
    token_number = new_counter
    token_code = f"T-{str(token_number).zfill(3)}"

    token_doc["token_number"] = token_number
    token_doc["token_code"] = token_code

    transaction.update(queue_ref, {
        "token_counter": new_counter,
        "waiting_count": queue_snap.to_dict().get("waiting_count", 0) + 1,
    })
    transaction.set(token_ref, token_doc)
    return token_doc


def create_token(data: dict) -> dict:
    """Create a token with atomic sequential numbering."""
    token_id = _gen_id("TOK-")
    queue_id = data["queue_id"]

    token_doc = {
        "id": token_id,
        "queue_id": queue_id,
        "patient_id": data.get("patient_id"),
        "patient_name": data.get("patient_name", "Patient"),
        "patient_phone": data.get("patient_phone"),
        "patient_email": data.get("patient_email"),
        "appointment_type": data.get("appointment_type", "regular"),
        "priority": data.get("priority", "normal"),
        "notes": data.get("notes"),
        "status": "waiting",
        "token_number": 0,
        "token_code": "",
        "created_at": _now_iso(),
        "called_at": None,
        "completed_at": None,
        "cancelled_at": None,
    }

    queue_ref = db.collection("queues").document(queue_id)
    token_ref = db.collection("tokens").document(token_id)

    transaction = db.transaction()
    _create_token_tx(transaction, queue_ref, token_ref, token_doc)

    # Re-fetch to get final stored doc with updated numbers
    stored = token_ref.get().to_dict()
    return {"id": token_id, **stored}


def get_tokens_by_queue(queue_id: str) -> List[dict]:
    tokens = (
        db.collection("tokens")
        .where(filter=FieldFilter("queue_id", "==", queue_id))
        .stream()
    )
    return sorted(
        [{"id": t.id, **t.to_dict()} for t in tokens],
        key=lambda x: x.get("token_number", 0),
    )


def get_token_by_id(token_id: str) -> Optional[dict]:
    doc = db.collection("tokens").document(token_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


def _update_token_and_queue(token_id: str, token_updates: dict, queue_updates: dict = None) -> Optional[dict]:
    token_ref = db.collection("tokens").document(token_id)
    token_snap = token_ref.get()
    if not token_snap.exists:
        return None

    token_ref.update(token_updates)

    if queue_updates:
        queue_id = token_snap.to_dict().get("queue_id")
        if queue_id:
            db.collection("queues").document(queue_id).update(queue_updates)

    return {"id": token_id, **token_ref.get().to_dict()}


def call_token(token_id: str) -> Optional[dict]:
    return _update_token_and_queue(
        token_id,
        {"status": "calling", "called_at": _now_iso()},
        {"current_token": token_id},
    )


def complete_token(token_id: str) -> Optional[dict]:
    token_snap = db.collection("tokens").document(token_id).get()
    if not token_snap.exists:
        return None
    queue_id = token_snap.to_dict().get("queue_id")

    result = _update_token_and_queue(
        token_id,
        {"status": "completed", "completed_at": _now_iso()},
    )

    # Decrement waiting count on queue
    if queue_id:
        queue_ref = db.collection("queues").document(queue_id)
        queue_snap = queue_ref.get()
        if queue_snap.exists:
            wc = max(0, queue_snap.to_dict().get("waiting_count", 1) - 1)
            queue_ref.update({"waiting_count": wc, "current_token": None})

    return result


def cancel_token(token_id: str) -> Optional[dict]:
    token_snap = db.collection("tokens").document(token_id).get()
    if not token_snap.exists:
        return None
    queue_id = token_snap.to_dict().get("queue_id")

    result = _update_token_and_queue(
        token_id,
        {"status": "cancelled", "cancelled_at": _now_iso()},
    )

    if queue_id:
        queue_ref = db.collection("queues").document(queue_id)
        queue_snap = queue_ref.get()
        if queue_snap.exists:
            wc = max(0, queue_snap.to_dict().get("waiting_count", 1) - 1)
            queue_ref.update({"waiting_count": wc})

    return result
