# backend/routes/tokens.py - Token management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional
from firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime
import uuid

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


@router.get("/my", response_model=StandardResponse)
def get_my_tokens(payload: dict = Depends(auth_service.require_auth)):
    """Get tokens for current user."""
    user_id = payload.get("sub")
    ref = db.collection("tokens").where(filter=FieldFilter("patientId", "==", user_id))
    tokens = []
    for doc in ref.stream():
        tokens.append({"id": doc.id, **doc.to_dict()})
    
    return StandardResponse(
        success=True,
        message="Tokens fetched.",
        data={"tokens": tokens},
    )


@router.post("/create", response_model=StandardResponse, status_code=201)
def create_token(token_data: TokenCreate):
    """Create a new queue token."""
    try:
        token_id = f"TOK-{uuid.uuid4().hex[:12].upper()}"
        token_doc = {
            "id": token_id,
            "queueId": token_data.queueId,
            "patientId": token_data.patientId,
            "patientName": token_data.patientName,
            "patientEmail": token_data.patientEmail or "",
            "hospitalId": token_data.hospitalId,
            "departmentId": token_data.departmentId or "",
            "status": "waiting",
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        
        db.collection("tokens").document(token_id).set(token_doc)
        return StandardResponse(
            success=True,
            message="Token created.",
            data={"id": token_id, **token_doc},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating token: {str(e)}")


@router.get("/{queue_id}", response_model=StandardResponse)
def get_queue_tokens(queue_id: str):
    """Get tokens for a specific queue."""
    ref = db.collection("tokens").where(filter=FieldFilter("queueId", "==", queue_id))
    tokens = []
    for doc in ref.stream():
        tokens.append({"id": doc.id, **doc.to_dict()})
    
    tokens.sort(key=lambda x: x.get("created_at", ""))
    return StandardResponse(
        success=True,
        message="Queue tokens fetched.",
        data={"tokens": tokens, "count": len(tokens)},
    )
