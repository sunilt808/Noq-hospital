# backend/services/auth_service.py - Authentication Service (MongoDB)

import os
import logging
from datetime import datetime, timedelta
from uuid import uuid4
from fastapi import Header, HTTPException
from jose import JWTError, jwt
import hashlib
import secrets
from database import mongodb
from audit import AuditLogger
from hospital_id_utils import is_valid_hospital_id

logger = logging.getLogger(__name__)

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "1440"))


async def require_auth(authorization: str = Header(default=None)) -> dict:
    """FastAPI dependency for Bearer token authentication."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token required")

    token = authorization.replace("Bearer ", "", 1).strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization token")

    try:
        payload = AuthService.decode_token(token)
        if not payload or not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")


class AuthService:
    """Authentication service using MongoDB."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using PBKDF2."""
        salt = secrets.token_hex(32)
        pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return f"{salt}${pwd_hash.hex()}"
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify a password against its hash."""
        try:
            salt, pwd_hash = password_hash.split('$', 1)
            computed_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
            return computed_hash.hex() == pwd_hash
        except Exception:
            return False
    
    @staticmethod
    def create_access_token(
        data: dict,
        expires_delta: timedelta = None
    ) -> str:
        """Create JWT access token."""
        try:
            to_encode = data.copy()
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
            
            to_encode.update({"exp": expire})
            encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Failed to create access token: {e}")
            raise
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and verify JWT token."""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except JWTError as e:
            logger.warning(f"Invalid token: {e}")
            raise
        except Exception as e:
            logger.error(f"Token decode error: {e}")
            raise
    
    @staticmethod
    async def authenticate_user(
        email: str,
        password: str,
        ip_address: str = None
    ) -> dict:
        """Authenticate user with email and password from MongoDB."""
        try:
            if mongodb is None:
                raise HTTPException(status_code=500, detail="Database connection failed")

            # Find user by email
            user = await mongodb.users.find_one({"email": email.lower().strip()})
            
            if not user:
                logger.warning(f"Login attempt with non-existent email: {email}")
                await AuditLogger.log_login(email, ip_address, success=False, 
                                           error_message="User not found")
                raise ValueError("Invalid credentials")
            
            # Check if user is active
            if user.get("status") != "active":
                logger.warning(f"Login attempt with inactive user: {email}")
                await AuditLogger.log_login(user.get("_id"), ip_address, success=False,
                                           error_message=f"User status: {user.get('status')}")
                raise ValueError("Account is not active")
            
            # Verify password
            if not AuthService.verify_password(password, user.get("password_hash")):
                logger.warning(f"Failed login attempt for user: {email}")
                await AuditLogger.log_login(user.get("_id"), ip_address, success=False,
                                           error_message="Invalid password")
                raise ValueError("Invalid credentials")
            
            # Create token
            token = AuthService.create_access_token({
                "sub": user.get("_id"),
                "email": user.get("email"),
                "role": user.get("role"),
            })
            
            # Log successful login
            await AuditLogger.log_login(user.get("_id"), ip_address, success=True)
            
            logger.info(f"User logged in successfully: {email} ({user.get('role')})")
            
            return {
                "id": user.get("_id"),
                "email": user.get("email"),
                "full_name": user.get("full_name"),
                "role": user.get("role"),
                "hospital_id": user.get("hospital_id"),
                "status": user.get("status"),
                "token": token,
            }
            
        except ValueError as e:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {e}", exc_info=True)
            raise


class UserService:
    """User service using MongoDB."""
    
    @staticmethod
    async def create_user(
        email: str,
        password: str,
        full_name: str,
        role: str,
        hospital_id: str = None,
        phone: str = None,
        user_id: str = None,
    ) -> dict:
        """Create a new user in MongoDB."""
        try:
            if mongodb is None:
                raise HTTPException(status_code=500, detail="Database connection failed")

            role_normalized = (role or "").strip().lower()
            if role_normalized in {"hm", "doctor"}:
                if not hospital_id:
                    raise ValueError(f"hospital_id required for {role_normalized} registration")
                if not is_valid_hospital_id(hospital_id):
                    raise ValueError("hospital_id must be in format Noq-######")
                
                hospital_exists = await mongodb.hospitals.find_one({"_id": hospital_id})
                if not hospital_exists:
                    # Check legacy "id" field just in case
                    hospital_exists = await mongodb.hospitals.find_one({"id": hospital_id})
                    if not hospital_exists:
                        raise ValueError(f"Invalid hospital_id: {hospital_id}")

            # Check if email already exists
            existing_user = await mongodb.users.find_one({"email": email.lower().strip()})
            if existing_user:
                # Allow reactivation if 'inactive' OR 'deleted'
                if (existing_user.get("status") in {"inactive", "deleted"}) and existing_user.get("role") == role:
                    updated_data = {
                        "password_hash": AuthService.hash_password(password),
                        "full_name": full_name,
                        "phone": phone,
                        "status": "active",
                        "updated_at": datetime.utcnow()
                    }
                    if hospital_id:
                        updated_data["hospital_id"] = hospital_id
                    
                    await mongodb.users.update_one(
                        {"_id": existing_user["_id"]},
                        {"$set": updated_data}
                    )
                    
                    logger.info(f"Reactivated existing user: {email} ({role})")
                    return {**existing_user, **updated_data, "id": existing_user["_id"]}

                raise ValueError(f"Email {email} already registered")
            
            # Create user
            new_id = user_id or str(uuid4())
            user_doc = {
                "_id": new_id,
                "email": email.lower().strip(),
                "password_hash": AuthService.hash_password(password),
                "full_name": full_name,
                "phone": phone,
                "role": role,
                "hospital_id": hospital_id,
                "status": "active",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            
            await mongodb.users.insert_one(user_doc)
            
            # If doctor role, create Doctor record
            if role == "doctor" and hospital_id:
                try:
                    # Will be created on first profile update
                    pass
                except Exception as doctor_error:
                    logger.warning(f"Failed to create Doctor record: {doctor_error}")
     
            # Log user creation
            await AuditLogger.log_entity_create(
                entity_type="User",
                entity_id=new_id,
                data={
                    "email": user_doc["email"],
                    "full_name": user_doc["full_name"],
                    "role": user_doc["role"],
                    "phone": user_doc["phone"],
                },
            )
            
            logger.info(f"New user created: {email} ({role})")
            return {**user_doc, "id": new_id}
            
        except ValueError as e:
            raise
        except Exception as e:
            logger.error(f"User creation error: {e}", exc_info=True)
            raise
    
    @staticmethod
    async def get_user(user_id: str) -> dict:
        """Get user by ID from MongoDB."""
        if mongodb is None: return {}
        user = await mongodb.users.find_one({"_id": user_id})
        if not user:
            # Try legacy "id" field
            user = await mongodb.users.find_one({"id": user_id})
            if not user:
                raise ValueError(f"User not found: {user_id}")
        user["id"] = user["_id"]
        return user
    
    @staticmethod
    async def get_user_by_email(email: str) -> dict:
        """Get user by email from MongoDB."""
        if mongodb is None: return {}
        user = await mongodb.users.find_one({"email": email.lower().strip()})
        if not user:
            raise ValueError(f"User not found: {email}")
        user["id"] = user["_id"]
        return user
    
    @staticmethod
    async def update_user(user_id: str, **kwargs) -> dict:
        """Update user details in MongoDB."""
        try:
            if mongodb is None: return {}
            user = await mongodb.users.find_one({"_id": user_id})
            if not user:
                user = await mongodb.users.find_one({"id": user_id})
                if not user:
                    raise ValueError(f"User not found: {user_id}")
            
            user_key = user["_id"]
            
            # Store old values for audit
            old_values = {
                "full_name": user.get("full_name"),
                "phone": user.get("phone"),
                "status": user.get("status"),
            }
            
            # Clean kwargs
            update_data = {k: v for k, v in kwargs.items() if k not in ["id", "_id", "email", "password_hash"]}
            update_data["updated_at"] = datetime.utcnow()
            
            await mongodb.users.update_one({"_id": user_key}, {"$set": update_data})
            
            # Sync Doctor record if user is a doctor
            if user.get("role") == "doctor" and user.get("hospital_id"):
                try:
                    doctor = await mongodb.doctors.find_one({"user_id": user_key})
                    
                    if not doctor and "department_id" in kwargs and kwargs.get("department_id"):
                        doctor_doc = {
                            "_id": str(uuid4()),
                            "user_id": user_key,
                            "hospital_id": user.get("hospital_id"),
                            "department_id": kwargs.get("department_id"),
                            "specialization": kwargs.get("specialization"),
                            "license_number": kwargs.get("license"),
                            "experience_years": kwargs.get("experience", 0),
                            "consultation_fee": kwargs.get("fee", 500),
                            "status": user.get("status", "active"),
                            "created_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow(),
                        }
                        await mongodb.doctors.insert_one(doctor_doc)
                        logger.info(f"Doctor record created for user {user_key}")
                    elif doctor:
                        doc_update = {}
                        if "specialization" in kwargs: doc_update["specialization"] = kwargs.get("specialization")
                        if "department_id" in kwargs: doc_update["department_id"] = kwargs.get("department_id")
                        if "license" in kwargs: doc_update["license_number"] = kwargs.get("license")
                        if "experience" in kwargs: doc_update["experience_years"] = kwargs.get("experience", 0)
                        if "fee" in kwargs: doc_update["consultation_fee"] = kwargs.get("fee", 500)
                        if "status" in kwargs: doc_update["status"] = kwargs.get("status")
                        
                        if doc_update:
                            doc_update["updated_at"] = datetime.utcnow()
                            await mongodb.doctors.update_one({"_id": doctor["_id"]}, {"$set": doc_update})
                            logger.info(f"Doctor record synced for user {user_key}")
                except Exception as doctor_error:
                    logger.warning(f"Failed to sync Doctor record: {doctor_error}")
            
            # Log update
            new_values = {
                "full_name": update_data.get("full_name", user.get("full_name")),
                "phone": update_data.get("phone", user.get("phone")),
                "status": update_data.get("status", user.get("status")),
            }

            await AuditLogger.log_entity_update(
                entity_type="User",
                entity_id=user_key,
                old_values=old_values,
                new_values=new_values,
                user_id=user_id,
            )
            
            return {**user, **update_data, "id": user_key}
            
        except Exception as e:
            logger.error(f"User update error: {e}", exc_info=True)
            raise
    
    @staticmethod
    async def delete_user(user_id: str):
        """Soft delete user (mark as inactive) in MongoDB."""
        try:
            if mongodb is None: return
            user = await mongodb.users.find_one({"_id": user_id})
            if not user:
                user = await mongodb.users.find_one({"id": user_id})
                if not user:
                    raise ValueError(f"User not found: {user_id}")
            
            user_key = user["_id"]
            
            # If doctor, also delete Doctor record
            if user.get("role") == "doctor":
                try:
                    await mongodb.doctors.delete_one({"user_id": user_key})
                    logger.info(f"Doctor record deleted for user {user_key}")
                except Exception as doctor_error:
                    logger.warning(f"Failed to delete Doctor record: {doctor_error}")
            
            await mongodb.users.update_one(
                {"_id": user_key},
                {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}}
            )

            await AuditLogger.log_entity_delete(
                entity_type="User",
                entity_id=user_key,
                data={
                    "email": user.get("email"),
                    "full_name": user.get("full_name"),
                    "role": user.get("role"),
                },
                user_id=user_id,
            )
            
            logger.info(f"User deleted: {user.get('email')}")
            
        except Exception as e:
            logger.error(f"User deletion error: {e}", exc_info=True)
            raise
