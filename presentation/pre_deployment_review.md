# NOQ Pre-Deployment Testing Review

Here is the complete pre-deployment analysis of the NOQ full-stack project (React + FastAPI + MongoDB). This report focuses exclusively on real issues discovered in the codebase that affect deployment readiness, security, and stability.

## 1. Critical Bugs (Must Fix Before Deployment)

*   **Hardcoded CORS Origins:** In `backend/main.py`, `ALLOWED_ORIGINS` is hardcoded to `http://localhost:5173` and `http://127.0.0.1:5173`. 
    *   *Impact:* When deployed, your frontend (e.g., hosted on Vercel) will be blocked from accessing the backend API by browser CORS policies. 
    *   *Fix:* Change this to read from environment variables or dynamically allow the production frontend URL.
*   **Database Environment Variable Mismatch:** `backend/.env.example` defines `MONGO_URI` and `MONGO_DB_NAME`, but the actual database connection logic in `backend/database.py` looks for `MONGODB_URL` and `DATABASE_NAME`. 
    *   *Impact:* In production, the app will fail to read the `.env` file correctly and attempt to connect to `localhost:27017`, causing database connection timeouts and application crashes.
    *   *Fix:* Standardize the variable names across `.env` and `database.py`.
*   **Unbounded Audit Logging:** `backend/audit.py` records every login, failure, and database mutation permanently.
    *   *Impact:* MongoDB Atlas 512MB free tier will fill up rapidly, leading to application crashes once the database enters a read-only state.
    *   *Fix:* Implement a MongoDB TTL (Time-To-Live) index on the `audit_logs` collection to delete records older than 30 days.

## 2. Medium Issues (Fix If Possible)

*   **No Rate Limiting on Authentication:** `backend/routes/auth.py` and `services/auth_service.py` have no request throttling.
    *   *Impact:* Vulnerable to brute-force credential stuffing and password-guessing attacks.
    *   *Fix:* Implement basic rate limiting (e.g., via `slowapi` in FastAPI) for `/auth/login` (e.g., max 5 requests per minute per IP).
*   **Dead SQLite Code & File Generation:** `backend/database.py` still contains legacy `SQLAlchemy` initialization code that automatically generates a `noq_hospital.db` SQLite file locally on startup.
    *   *Impact:* Unnecessary disk I/O, confusing architecture (mixing SQL and NoSQL code), and potential deployment issues in ephemeral cloud environments (like Railway/Heroku) where the filesystem is read-only.
    *   *Fix:* Remove all `SQLAlchemy` and SQLite references from `database.py` since the app relies exclusively on `motor` (MongoDB).
*   **Default JWT Secret Exposure:** `backend/services/auth_service.py` defaults to `"your-secret-key-change-in-production"` if the `JWT_SECRET` environment variable is missing.
    *   *Impact:* If the `.env` variable isn't properly loaded in production, attackers can forge admin JWT tokens using the hardcoded default secret.
    *   *Fix:* Remove the fallback string. Throw a fatal error on startup if `JWT_SECRET` is not found.

## 3. Low Priority Improvements

*   **Leftover `console.log` Statements:** The React frontend contains multiple debug `console.log` statements (e.g., in `BookAppointment.jsx`, `HmLayout.jsx`). These should be stripped during the Vite build process. You can configure `vite.config.js` to automatically drop console statements in production via the `esbuild: { drop: ['console'] }` setting.
*   **Missing API Pagination:** Endpoints like `tokens.py` fetch arrays via `cursor.to_list(length=1000)`. If a hospital generates thousands of tokens, this will cause high memory usage on the Python server. Implement proper limit/offset pagination.

## 4. Deployment Checklist

Before triggering your production build, ensure the following steps are completed:

- [ ] Update `backend/main.py` CORS to include the production frontend URL.
- [ ] Rename `.env` variables to match `database.py` expectations (`MONGODB_URL`).
- [ ] Generate a secure, 64-character random string for `JWT_SECRET`.
- [ ] Set `ENVIRONMENT="production"` in your backend `.env` so `global_exception_handler` doesn't leak internal Python stack traces to the frontend.
- [ ] Remove `console.log` outputs in the Vite build configuration.
- [ ] Run a MongoDB query in Atlas to apply a TTL index to `audit_logs`.

## 5. Final Verdict

**Verdict:** ❌ **Not Ready to Deploy**

**Reason:** The hardcoded CORS settings (`ALLOWED_ORIGINS`) and the environment variable mismatch (`MONGO_URI` vs `MONGODB_URL`) guarantee that the application will be functionally broken in a production environment out-of-the-box. The frontend will not be able to talk to the backend, and the backend will not be able to talk to the database. These two critical bugs must be resolved before proceeding with a production launch.
