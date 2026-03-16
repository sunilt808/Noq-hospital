# NOQ Hospital System - Developer Quick Reference

## Project Structure

```
nqrpro/
├── backend/                      # FastAPI Backend
│   ├── main.py                  # Application entry point
│   ├── database.py              # MongoDB integration
│   ├── mongo_client.py          # Connection management
│   ├── response_models.py       # API response models
│   ├── api_utils.py             # Utilities & error handling
│   ├── routing_utils.py         # Route utilities
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment config
│   ├── init_db.py               # Database initialization
│   ├── integration_test.py      # Integration tests
│   ├── e2e_verify.py            # End-to-end verification
│   ├── verify_setup.py          # Setup verification
│   ├── models/                  # Data models
│   ├── routes/                  # API endpoints
│   ├── services/                # Business logic
│   └── data/                    # JSON fixtures
│
├── noq-frontend/                # React Frontend
│   ├── package.json            # Node dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Main component
│   │   ├── index.css           # Global styles
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API & Firebase services
│   │   ├── context/            # React context
│   │   ├── hooks/              # Custom hooks
│   │   └── styles/             # Component styles
│   ├── public/                 # Static assets
│   └── .env.local              # Frontend config
│
├── COMPLETE_SETUP_GUIDE.md      # Setup instructions
├── OPERATIONS_GUIDE.md          # Operations & maintenance
├── MONGODB_API_SETUP.md         # MongoDB setup details
└── SETUP_COMPLETE.md            # Summary of changes
```

## Environment Variables

### Backend (.env)
```env
# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=noq_hospital_local
MONGO_POOL_MIN=10
MONGO_POOL_MAX=50

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
ENVIRONMENT=development
LOG_LEVEL=DEBUG

# Security
JWT_SECRET=your-secret-key
PASSWORD_SALT=your-salt

# URLs
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:8000/api

# Database Connection Timeouts
MONGO_CONNECTION_TIMEOUT=10
MONGO_SERVER_SELECTION_TIMEOUT=5
```

### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_ENVIRONMENT=development
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain.com
```

## Common Development Tasks

### 1. Start Development Environment

**Terminal 1: Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Terminal 2: Frontend**
```bash
cd noq-frontend
npm install
npm run dev
```

**Terminal 3: MongoDB** (if local)
```bash
mongod
```

### 2. Create New API Endpoint

```python
# backend/routes/new_route.py

from fastapi import APIRouter, HTTPException
from response_models import StandardResponse, ErrorResponse
from api_utils import validate_required_fields, handle_api_error
from mongo_client import get_collection

router = APIRouter(prefix="/api/resource", tags=["resource"])

@router.get("/")
async def list_resources():
    """List all resources."""
    try:
        collection = get_collection("resources")
        items = list(collection.find().limit(20))
        return StandardResponse(status="success", data=items)
    except Exception as e:
        return ErrorResponse(status="error", message=str(e))

@router.post("/")
@handle_api_error
async def create_resource(data: dict):
    """Create new resource."""
    validate_required_fields(data, ["name"])
    collection = get_collection("resources")
    result = collection.insert_one(data)
    return StandardResponse(status="success", data={"id": str(result.inserted_id)})
```

Register in `main.py`:
```python
from routes import new_route
app.include_router(new_route.router)
```

### 3. Add Frontend Component

```jsx
// noq-frontend/src/components/NewComponent.jsx

import { useState, useEffect } from 'react'
import api from '../services/api'

export default function NewComponent() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await api.get('/resources')
      setData(response.data)
    } catch (error) {
      console.error('Failed to fetch:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {data.map(item => (
        <div key={item._id}>{item.name}</div>
      ))}
    </div>
  )
}
```

### 4. Add Database Collection

```python
# backend/init_db.py - Add to create_indexes()

"new_collection": [
    ("name", ASCENDING),
    ("status", ASCENDING),
    ("created_at", DESCENDING),
]

# Then run:
python init_db.py
```

### 5. Query Database

```python
# Quick query
from mongo_client import get_collection

collection = get_collection("users")
user = collection.find_one({"email": "user@test.local"})

# Find multiple with filter
users = list(collection.find({"status": "active"}).limit(20))

# Aggregation
result = list(collection.aggregate([
    {"$match": {"status": "active"}},
    {"$group": {"_id": "$role", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]))
```

## API Client Usage (Frontend)

```javascript
import api from '@/services/api'

// GET request
const users = await api.get('/users')

// POST request
const created = await api.post('/users', { name: 'John', email: 'john@test.local' })

// PUT request
const updated = await api.put('/users/123', { status: 'active' })

// DELETE request
await api.delete('/users/123')

// With custom headers
const response = await api.get('/protected', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Health check
const health = await api.healthCheck()
```

## Error Handling

### Backend

```python
from api_utils import ValidationError, NotFoundError, UnauthorizedError

# Validation error
if not data.get('email'):
    raise ValidationError("Email is required")

# Not found
user = collection.find_one({"_id": user_id})
if not user:
    raise NotFoundError("User not found")

# Unauthorized
if not is_authenticated:
    raise UnauthorizedError("Please login")

# Generic error handling
@handle_api_error
async def my_route():
    # Any exception is caught and formatted
    pass
```

### Frontend

```javascript
try {
  const response = await api.get('/endpoint')
} catch (error) {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = '/login'
  } else if (error.status === 404) {
    showNotification('Not found')
  } else {
    showNotification(`Error: ${error.message}`)
  }
}
```

## Testing

### Run Tests
```bash
# Integration tests
cd backend
python integration_test.py

# End-to-end verification
python e2e_verify.py

# Setup verification
python verify_setup.py
```

### Write a Test
```python
# backend/test_my_feature.py

import unittest
from mongo_client import get_collection

class TestMyFeature(unittest.TestCase):
    def setUp(self):
        self.collection = get_collection("test_collection")
    
    def test_something(self):
        result = self.collection.insert_one({"name": "test"})
        self.assertIsNotNone(result.inserted_id)

if __name__ == '__main__':
    unittest.main()
```

## Debugging

### Backend
```python
# Add logging
import logging
logger = logging.getLogger(__name__)

logger.info("User logged in: " + user_id)
logger.error("Database error: " + str(e))

# Debugger
import pdb; pdb.set_trace()
# Or use Python debugger: python -m pdb main.py
```

### Frontend
```javascript
// Console logging
console.log('Data:', data)
console.error('Error:', error)

// Debugger
debugger  // Sets breakpoint

// DevTools
// F12 to open → Sources tab → Set breakpoints
```

### Database
```bash
# Check slow queries
mongo
> db.setProfilingLevel(1, { slowms: 100 })
> db.system.profile.find().sort({ts: -1}).limit(5)

# Analyze query execution
> db.users.find({email: "test@test.local"}).explain("executionStats")
```

## Performance Tips

1. **Database**: Add indexes for frequently queried fields
2. **API**: Use pagination for large result sets
3. **Frontend**: Lazy load components, use React.memo for expensive renders
4. **Backend**: Cache frequently accessed data, use async/await
5. **General**: Monitor performance metrics regularly

## Git Commands

```bash
# Commit changes
git add .
git commit -m "Descriptive message"

# Pull latest
git pull origin main

# Push changes
git push origin main

# Create branch
git checkout -b feature/my-feature

# Merge branch
git checkout main
git merge feature/my-feature

# View changes
git diff main
git status
```

## Useful URLs

- **API Docs**: http://localhost:8000/docs (Swagger)
- **API YAML**: http://localhost:8000/openapi.json
- **Frontend**: http://localhost:5173
- **MongoDB**: mongodb://127.0.0.1:27017
- **Health Check**: http://localhost:8000/health

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| MongoDB connection refused | `mongod` not running, check MONGO_URI in .env |
| Port already in use | Kill process: `lsof -i :8000` then `kill PID` |
| Module not found | Run `pip install -r requirements.txt` |
| Import errors | Verify `sys.path` includes project directories |
| CORS errors | Check FRONTEND_URL in backend .env |
| Token expired | Refresh JWT or re-login |
| npm modules not found | Run `npm install` |
| Vite build error | Clear cache: `rm -rf node_modules && npm install` |

## IDE Setup

### VS Code Extensions
- Python
- Pylance
- PyTest
- MongoDB for VS Code
- Thunder Client (API testing)
- Prettier (Code formatter)
- ESLint
- ES7+ React/Redux/React-Native snippets

### PyCharm
- File → Settings → Python Interpreter → Select venv
- Settings → Editor → Code Style → Import Organization
- Run → Edit Configurations → Add Python for main.py

## Resources

- Backend Docs: https://fastapi.tiangolo.com/
- MongoDB Docs: https://docs.mongodb.com/
- React Docs: https://react.dev/
- Vite Docs: https://vitejs.dev/
- Python Best Practices: https://pep8.org/

---

**Version**: 1.0.0 | **Last Updated**: January 2024
