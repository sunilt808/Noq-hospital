# backend/services/auth_service.py - JWT authentication service

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import os
import jwt
from fastapi import Header, HTTPException, status

SECRET_KEY = os.environ.get("JWT_SECRET", "noq_jwt_secret_2026_change_in_prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def create_access_token(payload: Dict[str, Any], expires_hours: int = ACCESS_TOKEN_EXPIRE_HOURS) -> str:
    """Generate a signed JWT access token."""
    to_encode = payload.copy()
    expire = datetime.utcnow() + timedelta(hours=expires_hours)
    to_encode["exp"] = expire
    to_encode["iat"] = datetime.utcnow()
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT. Returns payload dict or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_auth(authorization: str = Header(default=None)) -> Dict[str, Any]:
    """
    FastAPI dependency — verifies the Bearer JWT in Authorization header.
    Raises 401 if missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = authorization.split(" ", 1)[1]

    payload = decode_access_token(token)
    if payload:
        return payload

    try:
        from services import user_service

        firebase_claims = user_service.verify_firebase_token(token)
        if not firebase_claims:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is invalid or has expired",
            )

        email = str(firebase_claims.get("email") or "").strip().lower()
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Firebase token missing email claim",
            )

        user = user_service.get_user_by_email(email)
        if not user:
            user = user_service.create_user(
                {
                    "name": firebase_claims.get("name") or email.split("@")[0] or "Firebase User",
                    "email": email,
                    "role": "patient",
                    "status": "active",
                    "firebase_uid": firebase_claims.get("uid"),
                }
            )

        return {
            "sub": user.get("id"),
            "email": user.get("email"),
            "role": user.get("role"),
            "name": user.get("name"),
            "hospital_id": user.get("hospital_id"),
            "firebase_uid": firebase_claims.get("uid"),
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired",
        )


def require_role(*roles: str):
    """FastAPI dependency factory that requires specific roles."""
    def checker(payload: dict = require_auth):
        if payload.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}",
            )
        return payload
    return checker
