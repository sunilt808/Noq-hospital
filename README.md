# Noq Hospital

Noq Hospital is a full-stack hospital queue and appointment platform.

## Repository Structure

- backend: FastAPI API server
- noq-frontend: React + Vite frontend
- render.yaml: Render backend deployment blueprint

## Tech Stack

- Frontend: React, Vite
- Backend: FastAPI, Uvicorn
- Database: MongoDB
- Deploy: Vercel (frontend) + Render (backend)

## Local Development

### 1) Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Backend environment variables (see backend/.env.example):

- JWT_SECRET
- MONGODB_URL
- DATABASE_NAME
- FRONTEND_URL
- JWT_EXPIRATION_MINUTES

### 2) Frontend

```bash
cd noq-frontend
npm install
npm run dev
```

Frontend environment variables (see noq-frontend/.env.example):

- VITE_API_URL

## Deployment

### Backend on Render

- Use render.yaml from repo root
- Root directory: backend
- Build command: pip install -r requirements.txt
- Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
- Health path: /health

Detailed backend deployment guide: backend/README.md

### Frontend on Vercel

- Root directory: noq-frontend
- Framework preset: Vite
- Build command: npm run build
- Output directory: dist
- Add env var VITE_API_URL pointing to Render backend URL

Frontend deployment config: noq-frontend/vercel.json

## Notes

- After Vercel deploy, set backend FRONTEND_URL to your Vercel app URL.
- Re-deploy both services after environment variable updates.
