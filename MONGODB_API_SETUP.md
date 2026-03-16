# MongoDB & API Setup Guide

This guide covers the proper setup of MongoDB and API calls for the NOQ Hospital Queue Management System.

## Quick Start

### 1. Backend Setup

#### Step 1: Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Step 2: Configure Environment
The `.env` file is already configured with local MongoDB defaults:
```
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=noq_hospital_local
ENVIRONMENT=development
```

For production or MongoDB Atlas:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=noq_hospital_prod
ENVIRONMENT=production
```

#### Step 3: Ensure MongoDB is Running
**Local MongoDB:**
```bash
# macOS with Homebrew
brew services start mongodb-community

# Windows (if installed as service)
net start MongoDB

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Step 4: Start the Backend Server
```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Expected output:**
```
✓ MongoDB connection pool initialized
✓ Connected to MongoDB: noq_hospital_local
✓ MongoDB connection verified
✓ Bootstrap data loaded
✓ Auth service initialized
🚀 Starting NOQ API...
```

### 2. Frontend Setup

#### Step 1: Install Dependencies
```bash
cd noq-frontend
npm install
```

#### Step 2: Start Development Server
```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173`

### 3. Testing the Setup

#### Check Backend Health
```bash
curl http://127.0.0.1:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "api": "running",
  "version": "1.0.0"
}
```

#### Check API Documentation
Visit: `http://127.0.0.1:8000/docs` (Swagger UI)

## New Modules & Features

### Backend Modules

#### `mongo_client.py` - MongoDB Connection Manager
- Singleton pattern for MongoDB connection
- Connection pooling with configurable settings
- Health check functionality
- Graceful shutdown handling

**Usage:**
```python
from mongo_client import get_mongo_manager, get_collection

# Get database instance
db = get_mongo_manager().database

# Get specific collection
users_collection = get_collection("users")

# Health check
is_healthy = get_mongo_manager().health_check()
```

#### `response_models.py` - Standardized API Responses
Provides consistent response format across all endpoints:
- `StandardResponse`: Standard API response
- `PaginatedResponse`: For paginated data
- `ErrorResponse`: For errors
- Helper functions: `success_response()`, `error_response()`, `paginated_response()`

**Usage:**
```python
from response_models import success_response, error_response

# Success response
return success_response(
    message="Operation successful",
    data={"user": user_data},
    status_code=200
)

# Error response
return error_response(
    message="Operation failed",
    error="User not found",
    status_code=404
)
```

#### `api_utils.py` - API Utilities & Decorators
Provides error handling, validation, and database utilities:
- `@handle_api_error`: Decorator for automatic error handling
- Custom exceptions: `ValidationError`, `NotFoundError`, `UnauthorizedError`, etc.
- Validation functions: `validate_email()`, `validate_required_fields()`
- Pagination helper: `get_paginated_query()`

**Usage:**
```python
from api_utils import (
    handle_api_error, ValidationError, validate_email,
    validate_required_fields, get_paginated_query
)

@router.post("/users")
@handle_api_error
def create_user(data: dict):
    validate_required_fields(data, ["email", "name"])
    if not validate_email(data["email"]):
        raise ValidationError("Invalid email format")
    # ... rest of implementation
```

### Frontend Improvements

#### Enhanced API Client (`api.js`)
- **Timeout handling**: 10-second request timeout
- **Retry logic**: Automatic retry on server errors (5xx)
- **Error handling**: Detailed error messages from responses
- **Health check**: Built-in health check endpoint

**Features:**
```javascript
// Automatic retry on server errors
const data = await api.get("/users"); // Retries up to 3 times

// Health check
const health = await api.healthCheck();
if (!health.ok) {
  console.error("API unreachable");
}

// All methods now return Promises (async/await)
const userData = await api.post("/auth/login", { email, password });
```

## MongoDB Best Practices

### 1. Connection Pooling
The MongoDB client automatically pools connections (10-50 by default). You don't need to manually manage connections.

### 2. Error Handling
```python
from mongo_client import get_mongo_manager
from pymongo.errors import PyMongoError

try:
    result = collection.find_one({"email": email})
except PyMongoError as e:
    logger.error(f"Database error: {e}")
    # Handle error appropriately
```

### 3. Data Validation
```python
from api_utils import validate_required_fields, ValidationError

try:
    validate_required_fields(request_data, ["email", "password"])
except ValidationError as e:
    raise HTTPException(status_code=400, detail=str(e))
```

## API Endpoints

### Health Check
```
GET /health
Response: { status, database, api, version }
```

### Authentication
```
POST /auth/login
Body: { email, password, role, [hospital_id], [otp] }
Response: { success, message, data { user, token } }
```

All other endpoints documented in `/docs`

## Troubleshooting

### MongoDB Connection Failed
```python
# Check connection
from mongo_client import get_mongo_manager
if get_mongo_manager().health_check():
    print("Connected")
else:
    print("Not connected")
```

### Database Error During Requests
1. Check MongoDB is running: `mongosh --eval "db.adminCommand('ping')"`
2. Verify `MONGO_URI` in `.env`
3. Check MongoDB logs: `docker logs mongodb` (if using Docker)

### API Not Responding
1. Check backend is running: `curl http://localhost:8000/`
2. Check health endpoint: `curl http://localhost:8000/health`
3. Check logs for errors
4. Verify CORS configuration in `main.py`

### Frontend API Calls Failing
1. Open browser DevTools (F12)
2. Check Network tab for request details
3. Check Console for error messages
4. Verify API URL in frontend: `http://127.0.0.1:8000`
5. Check CORS headers in response

## Environment Variables Reference

```env
# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=noq_hospital_local
MONGO_MAX_POOL_SIZE=50
MONGO_MIN_POOL_SIZE=10
MONGO_CONNECT_TIMEOUT_MS=10000

# Security
JWT_SECRET=your_secret_key
PASSWORD_SALT=your_salt
JWT_EXPIRATION_MINUTES=1440

# Application
ENVIRONMENT=development
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=DEBUG
```

## Next Steps

1. **Data Seeding**: Add bootstrap service to seed initial data
2. **Authentication**: Implement JWT token refresh mechanism
3. **Validation**: Add request/response schema validation
4. **Logging**: Centralize logging with rotation
5. **Monitoring**: Add performance monitoring and alerting
6. **Testing**: Add comprehensive unit and integration tests
