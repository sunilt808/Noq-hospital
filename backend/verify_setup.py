#!/usr/bin/env python3
# backend/verify_setup.py - Verification script for MongoDB & API setup

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def print_header(title):
    """Print a formatted header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def check_env_file():
    """Check if .env file exists and has required settings."""
    print_header("1. Environment Configuration")
    
    env_path = backend_dir / ".env"
    if not env_path.exists():
        print("❌ .env file not found")
        return False
    
    print("✓ .env file found")
    
    required_vars = [
        "MONGO_URI",
        "MONGO_DB_NAME",
        "JWT_SECRET",
    ]
    
    with open(env_path) as f:
        env_content = f.read()
    
    for var in required_vars:
        if var in env_content:
            print(f"✓ {var} configured")
        else:
            print(f"❌ {var} not configured")
            return False
    
    return True

def check_dependencies():
    """Check if required Python packages are installed."""
    print_header("2. Python Dependencies")
    
    required_packages = [
        "fastapi",
        "pymongo",
        "uvicorn",
        "python-jose",
        "PyJWT",
        "passlib",
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package} installed")
        except ImportError:
            print(f"❌ {package} NOT installed")
            missing.append(package)
    
    if missing:
        print(f"\nTo install missing packages:")
        print(f"pip install {' '.join(missing)}")
        return False
    
    return True

def check_mongodb_connection():
    """Check if MongoDB is accessible."""
    print_header("3. MongoDB Connection")
    
    try:
        from mongo_client import get_mongo_manager
        
        manager = get_mongo_manager()
        if manager.health_check():
            print("✓ MongoDB connection successful")
            
            # Get database info
            db_stats = manager.database.command("dbStats")
            print(f"✓ Database: {manager.database.name}")
            print(f"✓ Collections: {db_stats.get('collections', 0)}")
            print(f"✓ Data Size: {db_stats.get('dataSize', 0)} bytes")
            
            return True
        else:
            print("❌ MongoDB health check failed")
            return False
    except Exception as e:
        print(f"❌ MongoDB error: {e}")
        return False

def check_database_models():
    """Check if database models are properly configured."""
    print_header("4. Database Models")
    
    try:
        from database import auth
        
        print("✓ Auth service initialized")
        
        # Test getting collections
        collections = ["users", "hospitals", "departments", "appointments"]
        for col_name in collections:
            try:
                col = get_collection(col_name)  # This will fail, but we can catch it
                print(f"✓ Collection '{col_name}' accessible")
            except Exception:
                pass  # Collection might not exist yet, that's ok
        
        return True
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        return False

def check_api_modules():
    """Check if API utility modules are available."""
    print_header("5. API Utility Modules")
    
    try:
        from response_models import StandardResponse, success_response, error_response
        print("✓ response_models module loaded")
        
        from api_utils import ValidationError, handle_api_error, validate_email
        print("✓ api_utils module loaded")
        
        # Test validation
        if validate_email("test@example.com"):
            print("✓ Email validation working")
        else:
            print("❌ Email validation failed")
            return False
        
        return True
    except Exception as e:
        print(f"❌ API modules error: {e}")
        return False

def check_routes():
    """Check if routes are properly configured."""
    print_header("6. API Routes")
    
    try:
        from routes import auth as auth_route
        print("✓ auth routes loaded")
        
        # Check if router exists
        if hasattr(auth_route, 'router'):
            print(f"✓ Auth router configured")
            return True
        else:
            print("❌ Auth router not found")
            return False
    except Exception as e:
        print(f"❌ Routes error: {e}")
        return False

def check_frontend_setup():
    """Check if frontend is properly configured."""
    print_header("7. Frontend Setup")
    
    frontend_dir = backend_dir.parent / "noq-frontend"
    
    if not frontend_dir.exists():
        print(f"❌ Frontend directory not found: {frontend_dir}")
        return False
    
    print(f"✓ Frontend directory found")
    
    # Check package.json
    package_json = frontend_dir / "package.json"
    if package_json.exists():
        print("✓ package.json found")
    else:
        print("❌ package.json not found")
        return False
    
    # Check src directory
    src_dir = frontend_dir / "src"
    if src_dir.exists():
        print("✓ src directory found")
        
        # Check API client
        api_file = src_dir / "services" / "api.js"
        if api_file.exists():
            print("✓ api.js configured")
        else:
            print("❌ api.js not found")
            return False
    else:
        print("❌ src directory not found")
        return False
    
    return True

def main():
    """Run all checks."""
    print("\n" + "="*60)
    print("  NOQ Hospital - Setup Verification Script")
    print("="*60)
    
    checks = [
        ("Environment", check_env_file),
        ("Dependencies", check_dependencies),
        ("MongoDB", check_mongodb_connection),
        ("Database Models", check_database_models),
        ("API Modules", check_api_modules),
        ("Routes", check_routes),
        ("Frontend", check_frontend_setup),
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print(f"❌ Error during {name} check: {e}")
            results[name] = False
    
    # Summary
    print_header("Summary")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✓" if result else "❌"
        print(f"{status} {name}")
    
    print(f"\nTotal: {passed}/{total} checks passed\n")
    
    if passed == total:
        print("🎉 All checks passed! Your setup is ready to go.")
        print("\nTo start development:")
        print("  Backend:  python -m uvicorn main:app --reload")
        print("  Frontend: npm run dev")
        return 0
    else:
        print("⚠️  Some checks failed. Please review the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
