# backend/routes/tokens.py - Token management endpoints (MongoDB)

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from database import mongodb

router = APIRouter(prefix="/tokens", tags=["Tokens"])


class TokenCreate(BaseModel):
    queueId: str
    patientId: str
    patientName: str
    patientEmail: Optional[str] = None
    hospitalId: str
    departmentId: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


def _serialize_token(t: dict) -> dict:
    t["id"] = str(t.get("_id", t.get("id")))
    for field in ["created_at"]:
        if field in t and isinstance(t[field], datetime):
            t[field] = t[field].isoformat()
    return t


@router.get("/my", response_model=StandardResponse)
async def get_my_tokens(payload: dict = Depends(auth_service.require_auth)):
    """Get tokens for current user from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        user_id = payload.get("sub")
        cursor = mongodb.tokens.find({"patientId": user_id})
        tokens = await cursor.to_list(length=1000)
        
        return StandardResponse(
            success=True,
            message="Tokens fetched.",
            data={"tokens": [_serialize_token(t) for t in tokens]},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=StandardResponse, status_code=201)
async def create_token(token_data: TokenCreate):
    """Create a new queue token in MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        
        token_id = f"TOK-{uuid.uuid4().hex[:12].upper()}"
        token_doc = {
            "_id": token_id,
            "id": token_id,
            "queueId": token_data.queueId,
            "patientId": token_data.patientId,
            "patientName": token_data.patientName,
            "patientEmail": token_data.patientEmail or "",
            "hospitalId": token_data.hospitalId,
            "departmentId": token_data.departmentId or "",
            "status": "waiting",
            "created_at": datetime.utcnow(),
        }
        
        await mongodb.tokens.insert_one(token_doc)
        return StandardResponse(
            success=True,
            message="Token created.",
            data=_serialize_token(token_doc),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating token: {str(e)}")


@router.get("/{queue_id}", response_model=StandardResponse)
async def get_queue_tokens(queue_id: str):
    """Get tokens for a specific queue from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        cursor = mongodb.tokens.find({"queueId": queue_id}).sort("created_at", 1)
        tokens = await cursor.to_list(length=1000)
        
        return StandardResponse(
            success=True,
            message="Queue tokens fetched.",
            data={"tokens": [_serialize_token(t) for t in tokens], "count": len(tokens)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
