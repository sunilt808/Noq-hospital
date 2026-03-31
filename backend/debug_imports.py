# debug_imports.py
import sys
import os
sys.path.append(os.getcwd())
try:
    from routes import auth, users, hospitals, appointments, departments, rooms, queues, tokens, diseases, reviews, prescriptions, revenue, advanced_bookings, bills
    modules = [auth, users, hospitals, appointments, departments, rooms, queues, tokens, diseases, reviews, prescriptions, revenue, advanced_bookings, bills]
    for m in modules:
        print(f"Module: {m.__name__}, Router: {getattr(m, 'router', 'MISSING')}")
except Exception as e:
    import traceback
    traceback.print_exc()
