# backend/main.py - NOQ Smart Queue Management System API

import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from routes import auth, users, queues, tokens, hospitals, advanced_bookings, reviews, departments, rooms, appointments, prescriptions, revenue, diseases
from services import bootstrap_service
from mongo_client import get_mongo_manager, close_mongo_connection

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app startup and shutdown events."""
    # ─── STARTUP ───────────────────────────────────────────────────────
    logger.info("🚀 Starting NOQ API...")
    
    # Initialize MongoDB connection
    mongo_manager = get_mongo_manager()
    if not mongo_manager.health_check():
        logger.warning("⚠️  MongoDB health check failed at startup, but continuing...")
    else:
        logger.info("✓ MongoDB connection verified")
    
    # Bootstrap seed data
    try:
        bootstrap_service.ensure_bootstrap_data()
        logger.info("✓ Bootstrap data loaded")
    except Exception as exc:
        msg = str(exc)
        if "quota" in msg.lower() or "429" in msg:
            logger.warning("[startup-seed] Firestore quota exceeded, continuing...")
        else:
            logger.warning(f"[startup-seed] {msg}")
    
    yield
    
    # ─── SHUTDOWN ───────────────────────────────────────────────────────
    logger.info("🛑 Shutting down NOQ API...")
    close_mongo_connection()
    logger.info("✓ MongoDB connection closed")


app = FastAPI(
    title="NOQ Smart Queue Management API",
    description="Backend API for the NOQ hospital queue management system",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return 500 WITH CORS headers so the
    browser can read the error instead of seeing a opaque CORS failure."""
    origin = request.headers.get("origin", "")
    extra_headers = {}
    if origin in ALLOWED_ORIGINS:
        extra_headers["Access-Control-Allow-Origin"] = origin
        extra_headers["Access-Control-Allow-Credentials"] = "true"
    
    # Log the error
    logger.error(f"[500] {request.method} {request.url.path} → {type(exc).__name__}: {exc}")
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Server error. Please try again.",
            "data": {},
            "error": str(exc) if os.getenv("ENVIRONMENT") == "development" else "Internal server error"
        },
        headers=extra_headers,
    )


@app.get("/", tags=["Health"])
def root():
    """Root endpoint - check if API is running."""
    return {
        "message": "NOQ API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "healthy"
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint - verify MongoDB connectivity."""
    mongo_manager = get_mongo_manager()
    is_db_healthy = mongo_manager.health_check()
    
    if not is_db_healthy:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "api": "running"
            }
        )
    
    return {
        "status": "healthy",
        "database": "connected",
        "api": "running",
        "version": "1.0.0"
    }

# ─── ROUTERS ─────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(queues.router)
app.include_router(tokens.router)
app.include_router(appointments.router)
app.include_router(hospitals.router)
app.include_router(advanced_bookings.router)
app.include_router(reviews.router)
app.include_router(departments.router)
app.include_router(diseases.router)
app.include_router(rooms.router)
app.include_router(prescriptions.router)
app.include_router(revenue.router)

