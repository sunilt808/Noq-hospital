import sqlite3
from pathlib import Path
paths = [Path(r'd:/nqrpro/noq_hospital.db'), Path(r'd:/nqrpro/backend/noq_hospital.db')]
for p in paths:
    print('---', p, 'exists=', p.exists(), 'size=', (p.stat().st_size if p.exists() else -1))
    if not p.exists():
        continue
    con = sqlite3.connect(p)
    cur = con.cursor()
    for t in ['users','doctors','rooms','audit_logs']:
        try:
            c = cur.execute(f'select count(*) from {t}').fetchone()[0]
            print(t, c)
        except Exception as e:
            print(t, 'ERR', e)
    try:
        rows = cur.execute("select full_name,role,status,updated_at from users where role='doctor' order by updated_at desc limit 5").fetchall()
        print('latest doctors in users:', rows)
    except Exception as e:
        print('doctor query err', e)
    try:
        rows = cur.execute('select id,room_number,status,updated_at from rooms order by updated_at desc limit 5').fetchall()
        print('latest rooms:', rows)
    except Exception as e:
        print('rooms query err', e)
    con.close()
