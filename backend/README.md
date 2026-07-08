# NOQ Backend (Render Deployment)

This backend is a FastAPI app deployed on Render.

## Local Run

```bash
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## Required Environment Variables

Set these in Render service settings:

```bash
JWT_SECRET=your_strong_secret
MONGODB_URL=your_mongodb_connection_string
DATABASE_NAME=noq_hospital_db
FRONTEND_URL=https://your-vercel-app-url
JWT_EXPIRATION_MINUTES=1440
```

## Render Setup

1. Create a new **Web Service** in Render from this repo.
2. Use root directory: `backend`.
3. Runtime: `Python`.
4. Build command:

```bash
pip install -r requirements.txt
```

5. Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

6. Health check path: `/health`.
7. Add environment variables listed above.
8. Deploy and verify these endpoints:
   - `/health`
   - `/docs`

## CORS Note

`FRONTEND_URL` must match your Vercel frontend URL (no trailing slash).
