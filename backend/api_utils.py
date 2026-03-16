# backend/api_utils.py - API Utilities and Decorators

import logging
import traceback
from functools import wraps
from typing import Callable, Any
from fastapi import HTTPException, status
from pymongo.errors import PyMongoError, OperationFailure
from response_models import error_response, ErrorResponse

logger = logging.getLogger(__name__)


def handle_api_error(func: Callable) -> Callable:
    """Decorator to handle API errors consistently."""
    @wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            result = await func(*args, **kwargs) if hasattr(func, '__await__') else func(*args, **kwargs)
            return result
        except ValueError as e:
            logger.warning(f"Validation error in {func.__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except KeyError as e:
            logger.warning(f"Missing key in {func.__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {e}"
            )
        except PermissionError as e:
            logger.warning(f"Permission denied in {func.__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        except PyMongoError as e:
            logger.error(f"Database error in {func.__name__}: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database error. Please try again later."
            )
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}", exc_info=True)
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )
    return wrapper


class APIError(Exception):
    """Base API error class."""
    def __init__(self, message: str, status_code: int = 400, error_code: str = "API_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)


class ValidationError(APIError):
    """Validation error."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400, error_code="VALIDATION_ERROR")


class NotFoundError(APIError):
    """Not found error."""
    def __init__(self, message: str):
        super().__init__(message, status_code=404, error_code="NOT_FOUND")


class UnauthorizedError(APIError):
    """Unauthorized error."""
    def __init__(self, message: str):
        super().__init__(message, status_code=401, error_code="UNAUTHORIZED")


class ForbiddenError(APIError):
    """Forbidden error."""
    def __init__(self, message: str):
        super().__init__(message, status_code=403, error_code="FORBIDDEN")


class DatabaseError(APIError):
    """Database error."""
    def __init__(self, message: str = "Database error"):
        super().__init__(message, status_code=503, error_code="DATABASE_ERROR")


def validate_email(email: str) -> bool:
    """Validate email format."""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_required_fields(data: dict, required_fields: list) -> bool:
    """Validate that required fields are present."""
    for field in required_fields:
        if field not in data or not data[field]:
            raise ValidationError(f"Missing required field: {field}")
    return True


def get_paginated_query(
    collection,
    filter_dict: dict,
    page: int = 1,
    limit: int = 10,
    sort_field: str = "_id",
    sort_order: int = -1
):
    """Execute a paginated MongoDB query."""
    try:
        # Calculate skip
        skip = (page - 1) * limit
        
        # Get total count
        total = collection.count_documents(filter_dict)
        
        # Get paginated results
        results = list(
            collection.find(filter_dict)
            .sort(sort_field, sort_order)
            .skip(skip)
            .limit(limit)
        )
        
        # Clean _id field from results
        for result in results:
            result.pop("_id", None)
        
        return results, total
    except PyMongoError as e:
        logger.error(f"Database error in pagination: {e}")
        raise DatabaseError(str(e))
