
from fastapi import APIRouter, HTTPException
from database import mongodb
from datetime import datetime

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/{doc_id}")
async def get_settings(doc_id: str):
    """Get settings document by ID."""
    try:
        doc = await mongodb.admin_settings.find_one({"_id": doc_id})
        if not doc:
            return {"settings": {}, "security": {}, "profile": {}}
        doc["id"] = str(doc.pop("_id"))
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{doc_id}")
async def update_settings(doc_id: str, payload: dict):
    """Create or update settings document."""
    try:
        payload["updated_at"] = datetime.utcnow()
        await mongodb.admin_settings.update_one(
            {"_id": doc_id},
            {"$set": payload},
            upsert=True
        )
        return {"success": True, "message": "Settings updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
