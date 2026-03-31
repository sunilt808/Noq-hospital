# backend/services/queue_service.py - Queue & token business logic with MongoDB

import logging
from database import mongodb
from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid

logger = logging.getLogger(__name__)

def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def _gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12].upper()}"

# ─────────────────────────────────────────────
#  QUEUE OPERATIONS
# ─────────────────────────────────────────────

async def create_queue(data: dict) -> dict:
    """Create a new queue in MongoDB."""
    if mongodb is None: return {}
    queue_id = _gen_id("Q-")
    queue_doc = {
        "_id": queue_id,
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
        "created_at": datetime.utcnow(),
    }
    await mongodb.queues.insert_one(queue_doc)
    return queue_doc

async def get_all_queues(hospital_id: Optional[str] = None) -> List[dict]:
    """Fetch all queues from MongoDB."""
    if mongodb is None: return []
    query = {}
    if hospital_id:
        query["hospital_id"] = hospital_id
    cursor = mongodb.queues.find(query)
    queues = await cursor.to_list(length=1000)
    for q in queues:
        q["id"] = q.get("_id", q.get("id"))
    return queues

async def get_queue_by_id(queue_id: str) -> Optional[dict]:
    """Get a specific queue from MongoDB."""
    if mongodb is None: return None
    queue = await mongodb.queues.find_one({"_id": queue_id})
    if queue:
        queue["id"] = queue.get("_id", queue.get("id"))
    return queue

async def update_queue(queue_id: str, updates: dict) -> Optional[dict]:
    """Update a queue in MongoDB."""
    if mongodb is None: return None
    await mongodb.queues.update_one({"_id": queue_id}, {"$set": updates})
    return await get_queue_by_id(queue_id)

async def delete_queue(queue_id: str) -> bool:
    """Delete a queue in MongoDB."""
    if mongodb is None: return False
    result = await mongodb.queues.delete_one({"_id": queue_id})
    return result.deleted_count > 0

async def call_next_in_queue(queue_id: str) -> Optional[dict]:
    """Find and call the next waiting token in a queue."""
    if mongodb is None: return None
    next_token = await mongodb.tokens.find_one(
        {"queue_id": queue_id, "status": "waiting"},
        sort=[("token_number", 1)]
    )
    if not next_token:
        return None
    return await call_token(next_token["_id"])

# ─────────────────────────────────────────────
#  TOKEN OPERATIONS
# ─────────────────────────────────────────────

async def create_token(data: dict) -> dict:
    """Create a token with atomic sequential numbering in MongoDB."""
    if mongodb is None: return {}
    queue_id = data["queue_id"]
    
    # Atomic increment of token_counter and waiting_count
    queue = await mongodb.queues.find_one_and_update(
        {"_id": queue_id},
        {"$inc": {"token_counter": 1, "waiting_count": 1}},
        return_document=True
    )
    
    if not queue:
        raise ValueError("Queue not found")

    token_number = queue["token_counter"]
    token_code = f"T-{str(token_number).zfill(3)}"
    token_id = _gen_id("TOK-")

    token_doc = {
        "_id": token_id,
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
        "token_number": token_number,
        "token_code": token_code,
        "created_at": datetime.utcnow(),
        "called_at": None,
        "completed_at": None,
        "cancelled_at": None,
    }

    await mongodb.tokens.insert_one(token_doc)
    return token_doc

async def get_tokens_by_queue(queue_id: str) -> List[dict]:
    """Get all tokens for a queue from MongoDB."""
    if mongodb is None: return []
    cursor = mongodb.tokens.find({"queue_id": queue_id}).sort("token_number", 1)
    tokens = await cursor.to_list(length=1000)
    for t in tokens:
        t["id"] = t.get("_id", t.get("id"))
    return tokens

async def get_token_by_id(token_id: str) -> Optional[dict]:
    """Get a token by ID from MongoDB."""
    if mongodb is None: return None
    token = await mongodb.tokens.find_one({"_id": token_id})
    if token:
        token["id"] = token.get("_id", token.get("id"))
    return token

async def call_token(token_id: str) -> Optional[dict]:
    """Mark a token as calling in MongoDB."""
    if mongodb is None: return None
    token = await mongodb.tokens.find_one_and_update(
        {"_id": token_id},
        {"$set": {"status": "calling", "called_at": datetime.utcnow()}},
        return_document=True
    )
    if token:
        await mongodb.queues.update_one(
            {"_id": token["queue_id"]},
            {"$set": {"current_token": token_id}}
        )
        token["id"] = token["_id"]
    return token

async def complete_token(token_id: str) -> Optional[dict]:
    """Mark a token as completed in MongoDB."""
    if mongodb is None: return None
    token = await mongodb.tokens.find_one_and_update(
        {"_id": token_id},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}},
        return_document=True
    )
    if token:
        await mongodb.queues.update_one(
            {"_id": token["queue_id"]},
            {"$inc": {"waiting_count": -1}, "$set": {"current_token": None}}
        )
        token["id"] = token["_id"]
    return token

async def cancel_token(token_id: str) -> Optional[dict]:
    """Mark a token as cancelled in MongoDB."""
    if mongodb is None: return None
    token = await mongodb.tokens.find_one_and_update(
        {"_id": token_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.utcnow()}},
        return_document=True
    )
    if token:
        await mongodb.queues.update_one(
            {"_id": token["queue_id"]},
            {"$inc": {"waiting_count": -1}}
        )
        token["id"] = token["_id"]
    return token
