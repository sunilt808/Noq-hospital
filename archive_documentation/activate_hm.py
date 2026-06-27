import sqlite3
c = sqlite3.connect(r"d:\nqrpro\backend\noq_hospital.db")
c.execute("UPDATE users SET status='active' WHERE email='hm@apollo.com'")
c.execute("UPDATE hospitals SET status='active' WHERE email='hm@apollo.com'")
c.commit()
print("activated")
