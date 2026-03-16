# backend/response_models.py - Standardized API Response Models

from pydantic import BaseModel
from typing import Any, Dict, Optional, List
from enum import Enum


class ResponseStatus(str, Enum):
    """Standard response status codes."""
    SUCCESS = "success"
    ERROR = "error"
    FAILED = "failed"
    NOT_FOUND = "not_found"
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"
    BAD_REQUEST = "bad_request"


class StandardResponse(BaseModel):
    """Standard API response model."""
    success: bool
    message: str
    data: Dict[str, Any] = {}
    error: Optional[str] = None
    status_code: int = 200


class PaginatedResponse(BaseModel):
    """Paginated response model."""
    success: bool
    message: str
    data: List[Dict[str, Any]] = []
    pagination: Dict[str, Any] = {
        "total": 0,
        "page": 1,
        "limit": 10,
        "pages": 0
    }
    error: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response model."""
    success: bool = False
    message: str
    error: str
    data: Dict[str, Any] = {}
    status_code: int = 400


def success_response(
    message: str,
    data: Optional[Dict[str, Any]] = None,
    status_code: int = 200
) -> StandardResponse:
    """Create a success response."""
    return StandardResponse(
        success=True,
        message=message,
        data=data or {},
        status_code=status_code
    )


def error_response(
    message: str,
    error: str,
    data: Optional[Dict[str, Any]] = None,
    status_code: int = 400
) -> ErrorResponse:
    """Create an error response."""
    return ErrorResponse(
        success=False,
        message=message,
        error=error,
        data=data or {},
        status_code=status_code
    )


def paginated_response(
    message: str,
    data: List[Dict[str, Any]],
    total: int,
    page: int = 1,
    limit: int = 10
) -> PaginatedResponse:
    """Create a paginated response."""
    pages = (total + limit - 1) // limit if limit > 0 else 0
    return PaginatedResponse(
        success=True,
        message=message,
        data=data,
        pagination={
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages
        }
    )
