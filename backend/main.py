# backend/main.py - NOQ Smart Queue Management System API

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, users, queues, tokens, hospitals, advanced_bookings, reviews, departments, rooms, appointments, prescriptions, revenue, diseases
from services import bootstrap_service

app = FastAPI(
    title="NOQ Smart Queue Management API",
    description="Backend API for the NOQ hospital queue management system",
    version="1.0.0",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.on_event("startup")
def startup_seed_defaults():
    try:
        bootstrap_service.ensure_bootstrap_data()
    except Exception as exc:
        print(f"[startup-seed] warning: {exc}")


@app.get("/", tags=["Health"])
def root():
    return {"message": "NOQ API is running", "version": "1.0.0", "docs": "/docs"}

