# backend/routes/tokens.py - Token management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/tokens", tags=["Tokens"])


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("/my", response_model=StandardResponse)
def get_my_tokens(payload: dict = Depends(auth_service.require_auth)):
    """Get tokens for current user."""
    return StandardResponse(
        success=True,
        message="Tokens fetched.",
        data={"tokens": []},
    )
