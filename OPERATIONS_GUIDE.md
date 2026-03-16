# NOQ Hospital System - Operations & Maintenance Guide

## Production Operations

### Health Monitoring

#### Backend Health Check
```bash
# Check backend status
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected"
}
```

#### Database Health Check
```bash
# Connect to MongoDB and run admin command
mongo
> db.adminCommand("ping")
{ "ok" : 1 }

# Check replica set status (if using replica set)
> rs.status()

# Get database stats
> db.stats()
```

#### Frontend Status
```bash
# Check if frontend is responding
curl http://localhost:5173

# Should return HTML content
```

### Performance Monitoring

#### Backend Metrics
```python
# Add to backend/main.py for Prometheus metrics
from prometheus_client import Counter, Histogram
import time

# Request counter
request_count = Counter('api_requests_total', 'Total API requests')

# Response time histogram
response_time = Histogram('api_response_seconds', 'API response time')

@app.middleware("http")
async def add_metrics(request: Request, call_next):
    request_count.inc()
    start = time.time()
    response = await call_next(request)
    response_time.observe(time.time() - start)
    return response
```

#### Database Metrics

```bash
# Query database for performance insights
mongo

# Slow queries
> db.getProfilingStatus()

# Index usage statistics
> db.users.aggregate([{ 
    $indexStats: {} 
  }])

# Collection size
> db.users.stats()

# Current operations
> db.currentOp()
```

#### Frontend Performance

Use browser DevTools:
- Network tab: Check API response times
- Performance tab: Monitor rendering performance
- Console: Check for JavaScript errors

### Log Monitoring

**Backend logs** (configured in main.py):
```
# Development
tail -f backend/app.log

# Production (with rotation)
tail -f /var/log/nqrpro/app.log
```

**Database logs**:
```bash
# MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Or with follow
journalctl -u mongod -f
```

**Frontend Console**:
Access browser DevTools console for client-side errors

---

## Database Maintenance

### Regular Backups

#### Local MongoDB Backup
```bash
# Backup all databases
mongodump --out /backups/mongo-$(date +%Y%m%d)

# Backup specific database
mongodump --db noq_hospital_local --out /backups/nqrpro-$(date +%Y%m%d)

# Backup with authentication
mongodump --username user --password pass --authenticationDatabase admin \
  --out /backups/mongo-auth
```

#### MongoDB Atlas Automatic Backups
- Atlas automatically backs up daily
- Restore from Atlas Dashboard: Backups → Restore

#### Restore from Backup
```bash
# Restore all databases
mongorestore /backups/mongo-20240115

# Restore specific database
mongorestore --db noq_hospital_local /backups/mongo-20240115/noq_hospital_local
```

### Index Maintenance

```bash
# View indexes
mongo> db.users.getIndexes()

# Rebuild indexes (careful - may take time)
mongo> db.users.reIndex()

# Remove unused indexes
mongo> db.users.dropIndex("email_1")

# Monitor index usage
mongo> db.aggregate([
  { $indexStats: { } }
])
```

### Collection Maintenance

```bash
# Check for corruption
mongo> db.users.validate()

# Repair database
mongod --repair

# Clean up deleted data (compaction)
mongo> db.users.compact()

# Update existing documents in bulk
mongo> db.users.updateMany(
  { status: "inactive" },
  { $set: { "updated_at": new Date() } }
)
```

---

## Scaling & Performance Optimization

### Database Optimization

#### 1. Connection Pooling (Already Configured)
```python
# backend/mongo_client.py
# Current settings:
# - Min pool size: 10 connections
# - Max pool size: 50 connections
# - Connection timeout: 10 seconds

# Adjust for high load:
MONGO_POOL_MIN=20  # More connections ready
MONGO_POOL_MAX=100  # Handle more concurrent requests
```

#### 2. Query Optimization
```bash
# Analyze query performance
mongo> db.users.find({status: "active"}).explain("executionStats")

# Add composite indexes for common queries
mongo> db.appointments.createIndex({
  hospital_id: 1,
  appointment_date: -1,
  status: 1
})
```

#### 3. Pagination Optimization
```python
# Already implemented in api_utils.py
# Use pagination for large datasets
# GET /api/users?page=1&limit=20

# For even better performance, use keyset pagination:
# GET /api/users?after=lastUserId&limit=20
```

### Backend Optimization

#### 1. Caching
```python
# Add Redis caching (optional)
from functools import lru_cache
import redis

redis_client = redis.Redis(host='localhost', port=6379)

@app.get("/api/hospitals")
async def get_hospitals(limit: int = 20):
    cache_key = f"hospitals:{limit}"
    
    # Check cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Query database
    hospitals = list(get_collection("hospitals").find().limit(limit))
    
    # Cache for 1 hour
    redis_client.setex(cache_key, 3600, json.dumps(hospitals, default=str))
    
    return hospitals
```

#### 2. Async/Await (FastAPI Native)
```python
# All routes should use async where possible
@app.get("/api/users")
async def get_users(limit: int = 20):
    # Non-blocking operation
    users = await get_collection("users").find().limit(limit).to_list(length=limit)
    return StandardResponse(status="success", data=users)
```

#### 3. Compression
```python
from fastapi.middleware.gzip import GZIPMiddleware

app.add_middleware(GZIPMiddleware, minimum_size=1000)
```

### Frontend Optimization

#### 1. Code Splitting
```javascript
// Use dynamic imports for routes
const AdminApp = lazy(() => import('./AdminApp'))
const DoctorApp = lazy(() => import('./DoctorApp'))

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/admin/*" element={<AdminApp />} />
    <Route path="/doctor/*" element={<DoctorApp />} />
  </Routes>
</Suspense>
```

#### 2. API Call Optimization
```javascript
// Already implemented in api.js:
// - Request deduplication
// - Retry with exponential backoff
// - Request timeout handling
// - Compression support
```

#### 3. Bundle Size Optimization
```bash
# Analyze bundle
npm run build
npm install -g webpack-bundle-analyzer
webpack-bundle-analyzer dist/bundle.js

# Remove unused dependencies
npm prune
npm dedupe
```

---

## Troubleshooting Common Issues

### High CPU Usage

**Diagnosis:**
```bash
# Backend
py-spy record -o profile.svg -- python -m uvicorn main:app

# Database
mongo> db.currentOp()
```

**Solutions:**
- Add proper indexes
- Optimize slow queries
- Increase worker processes
- Check for infinite loops or memory leaks

### High Memory Usage

**Diagnosis:**
```bash
# Backend
ps aux | grep python
# Check RSS column

# Database
mongo> db.stats().storageSize
mongod --profile 1  # Enable slow query logging
```

**Solutions:**
- Paginate large result sets
- Reduce connection pool size
- Clear old logs
- Optimize projection in queries

### Database Connection Issues

```bash
# Check connection pool
mongo --eval "db.serverStatus().connections"

# Result:
# { "current" : 45, "available" : 1, "totalCreated" : 87 }

# If connection_pool_exhausted errors:
# Increase MONGO_POOL_MAX in .env
# Identify long-running queries: db.currentOp()
```

### API Timeout Issues

**Check backend health:**
```bash
time curl http://localhost:8000/health
# Should respond < 500ms

# Check slow endpoints
# Add monitoring to log request times
```

**Solutions:**
- Optimize database queries
- Reduce timeout threshold in api.js if appropriate
- Scale backend horizontally
- Check for network latency

### MongoDB Replication Issues

```bash
# Check replica set status
mongo> rs.status()

# If PRIMARY not available:
# 1. Check network connectivity
# 2. Verify authentication
# 3. Check disk space

# Force reconfiguration if needed:
mongo> rs.reconfig({ $set: { members: [...] }})
```

---

## Security Checklist

### Backend Security

- [ ] Environment variables stored securely (use Vault in production)
- [ ] JWT secret strong and rotated regularly
- [ ] HTTPS enabled (SSL/TLS certificates)
- [ ] CORS properly configured for your domain
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] Database credentials rotated

### Database Security

```bash
# Create database user with limited permissions
mongo admin
> db.createUser({
  user: "nqrpro_app",
  pwd: generatedPassword,
  roles: [
    { role: "readWrite", db: "noq_hospital_local" }
  ]
})

# Enable authentication
# Set in MongoDB: security.authorization = enabled

# Bind to specific IP (not 0.0.0.0)
# In mongod.conf: net.bindIp: 127.0.0.1

# Enable encryption in transit
# Use --sslMode requireSSL
```

### Frontend Security

- [ ] HTTPS only
- [ ] Secure cookies (HttpOnly, Secure, SameSite flags)
- [ ] Content Security Policy headers
- [ ] XSS protection enabled
- [ ] CSRF tokens for state-changing operations
- [ ] Secure storage of tokens (not localStorage ideally)

---

## Incident Response

### Database Down

```bash
# 1. Check if service is running
systemctl status mongod

# 2. Check logs
tail -f /var/log/mongodb/mongod.log

# 3. Check disk space
df -h /var/lib/mongodb

# 4. Check permissions
ls -la /var/lib/mongodb

# 5. Restart
systemctl restart mongod

# 6. Verify
mongo
> db.version()
```

### Backend Crashed

```bash
# 1. Check logs for error
tail -50 /var/log/nqrpro/app.log

# 2. Check resources
ps aux | grep python
free -h

# 3. Restart service
systemctl restart nqrpro-backend

# 4. Check health
curl http://localhost:8000/health
```

### API High Latency

```bash
# 1. Check database performance
mongo> db.currentOp(true)

# 2. Check backend metrics
# Add to backend/main.py:
# for request in slow_requests:
#     log_slow_request(request)

# 3. Check network
ping -c 5 database-host

# 4. Analyze slow queries
mongo
> db.setProfilingLevel(1, { slowms: 100 })
> db.system.profile.find().limit(5).sort({ ts: -1 })
```

### Authentication Issues

```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check recent auth attempts
mongo
> db.auth_users.find().sort({_id: -1}).limit(10)

# Clear authentication cache if needed
# Force re-login for all users
```

---

## Regular Maintenance Schedule

### Daily
- Monitor application health dashboard
- Check error logs for exceptions
- Verify backups completed

### Weekly
- Review performance metrics
- Check disk space on all systems
- Test database backup restore process
- Review slow query logs

### Monthly
- Update dependencies
- Review and rotate credentials
- Security audit of access logs
- Capacity planning analysis

### Quarterly
- Full security audit
- Performance optimization
- Disaster recovery test
- Database defragmentation

### Yearly
- Security assessment
- Infrastructure review
- Capacity planning for next year
- Major version upgrades

---

## Useful Commands for Operations

```bash
# Backend
systemctl start|stop|restart|status nqrpro-backend
systemctl enable nqrpro-backend  # Auto-start on boot

# Database
mongo                      # Connect
mongo --eval "db.version()" # Check version
mongodump --out /backups/  # Backup
mongorestore /backups/      # Restore

# Monitoring
curl http://localhost:8000/health           # Backend health
curl http://localhost:8000/docs             # API docs
curl http://localhost:5173                  # Frontend

# Logs
journalctl -u nqrpro-backend -f  # Follow backend logs
journalctl -u mongod -f           # Follow database logs
tail -f /var/log/nqrpro/app.log  # Application log

# Performance
ps aux | grep mongod
ps aux | grep python
top -p <pid>
```

---

## Contact & Escalation

**Support Channels:**
- Platform Issues: Check logs first, then escalate to DevOps
- Database Issues: Database team, include `db.stats()` output
- API Issues: Backend team, include request/response headers
- Frontend Issues: Frontend team, include browser console errors

**Required Information for Support Tickets:**
1. Timestamp of issue
2. Relevant log excerpts (with timestamp)
3. Steps to reproduce
4. Expected vs actual behavior
5. Environment (dev/staging/prod)
6. Any recent changes

---

**Last Updated**: January 2024
**Version**: 1.0.0
