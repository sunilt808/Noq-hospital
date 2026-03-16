# backend/database.py - SQLAlchemy Database Setup with SQLite

import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, Float, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.pool import StaticPool

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./noq_hospital.db")
ECHO_SQL = os.getenv("ECHO_SQL", "False").lower() == "true"

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in DATABASE_URL else None,
    echo=ECHO_SQL,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base for models
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════
# DATABASE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class User(Base):
    """User model - Patients, Doctors, Hospital Managers, Admins."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String)
    role = Column(String, nullable=False)  # patient, doctor, hm, admin
    hospital_id = Column(String, ForeignKey("hospitals.id"))
    status = Column(String, default="active")  # active, inactive, suspended
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="users")
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    appointments = relationship("Appointment", back_populates="patient")
    audit_logs = relationship("AuditLog", back_populates="user")


class Hospital(Base):
    """Hospital model."""
    __tablename__ = "hospitals"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String)
    phone = Column(String)
    email = Column(String)
    city = Column(String)
    state = Column(String)
    pincode = Column(String)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="hospital")
    departments = relationship("Department", back_populates="hospital")
    doctors = relationship("Doctor", back_populates="hospital")
    rooms = relationship("Room", back_populates="hospital")
    appointments = relationship("Appointment", back_populates="hospital")


class Department(Base):
    """Department model - Cardiology, Surgery, etc."""
    __tablename__ = "departments"

    id = Column(String, primary_key=True, index=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="departments")
    doctors = relationship("Doctor", back_populates="department")


class Doctor(Base):
    """Doctor model."""
    __tablename__ = "doctors"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id"), nullable=False)
    specialization = Column(String)
    license_number = Column(String)
    experience_years = Column(Integer)
    consultation_fee = Column(Float, default=500)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="doctor_profile")
    hospital = relationship("Hospital", back_populates="doctors")
    department = relationship("Department", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")
    queue_tokens = relationship("QueueToken", back_populates="doctor")


class Room(Base):
    """Room/Chamber model."""
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, index=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    room_number = Column(String, nullable=False)
    floor = Column(Integer)
    capacity = Column(Integer, default=1)
    status = Column(String, default="available")  # available, occupied, maintenance
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="rooms")


class Appointment(Base):
    """Appointment model."""
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, index=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    status = Column(String, default="scheduled")  # scheduled, completed, cancelled
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    patient = relationship("User", back_populates="appointments")


class QueueToken(Base):
    """Queue token for appointment management."""
    __tablename__ = "queue_tokens"

    id = Column(String, primary_key=True, index=True)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False)
    appointment_id = Column(String, ForeignKey("appointments.id"))
    token_number = Column(Integer, nullable=False)
    status = Column(String, default="waiting")  # waiting, called, completed, missed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor = relationship("Doctor", back_populates="queue_tokens")


class AuditLog(Base):
    """Audit log for tracking all activities."""
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type = Column(String)  # User, Appointment, Doctor, etc.
    entity_id = Column(String)
    old_values = Column(Text)  # JSON string
    new_values = Column(Text)  # JSON string
    ip_address = Column(String)
    status = Column(String, default="success")  # success, failed
    error_message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


# ═══════════════════════════════════════════════════════════════════════════
# DATABASE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session - used as dependency in FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database with tables."""
    create_tables()
