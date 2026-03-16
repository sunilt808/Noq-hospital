# backend/routes/queues.py - Queue management endpoints

from fastapi import APIRouter, HTTPException, Depends
from services import queue_service, auth_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/queues", tags=["Queues"])


class QueueCreate(BaseModel):
    department_id: str
    hospital_id: str
    current_number: int = 1
    max_capacity: int = 50


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("", response_model=StandardResponse)
def get_queues(hospital_id: Optional[str] = None, payload: dict = Depends(auth_service.require_auth)):
    """Get all queues."""
    queues = queue_service.get_all_queues(hospital_id=hospital_id)
    return StandardResponse(success=True, message="Queues fetched.", data={"queues": queues, "count": len(queues)})


@router.get("/{queue_id}", response_model=StandardResponse)
def get_queue(queue_id: str, payload: dict = Depends(auth_service.require_auth)):
    """Get a specific queue."""
    queue = queue_service.get_queue_by_id(queue_id)
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found.")
    return StandardResponse(success=True, message="Queue fetched.", data={"queue": queue})


@router.post("", response_model=StandardResponse, status_code=201)
def create_queue(queue: QueueCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a new queue."""
    new_queue = queue_service.create_queue(queue.model_dump())
    return StandardResponse(success=True, message="Queue created.", data={"queue": new_queue})
