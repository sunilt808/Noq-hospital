import sqlite3
import re

DB_PATH = "noq_hospital.db"
TARGET_RE = re.compile(r"^Noq-\d{6}$")


def make_noq_id(number: int) -> str:
    return f"Noq-{number:06d}"


def next_available(existing_ids: set[str], start: int = 200000) -> str:
    candidate = start
    while True:
        hid = make_noq_id(candidate)
        if hid not in existing_ids:
            return hid
        candidate += 1


def run():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT id FROM hospitals")
    hospital_ids = [row["id"] for row in cur.fetchall()]

    existing_target_ids = {hid for hid in hospital_ids if TARGET_RE.fullmatch(str(hid))}
    mapping = {}

    for hid in hospital_ids:
        if TARGET_RE.fullmatch(str(hid)):
            continue
        new_id = next_available(existing_target_ids)
        existing_target_ids.add(new_id)
        mapping[hid] = new_id

    if not mapping:
        print("No migration needed. All hospital IDs already in Noq-###### format.")
        conn.close()
        return

    print("Hospital ID migration plan:")
    for old_id, new_id in mapping.items():
        print(f"  {old_id} -> {new_id}")

    cur.execute("BEGIN")

    # Update hospitals PK first (SQLite allows this without FK enforcement on by default)
    for old_id, new_id in mapping.items():
        cur.execute("UPDATE hospitals SET id = ? WHERE id = ?", (new_id, old_id))

    # Update all known FK/links
    for table, column in [
        ("users", "hospital_id"),
        ("departments", "hospital_id"),
        ("doctors", "hospital_id"),
        ("rooms", "hospital_id"),
        ("appointments", "hospital_id"),
    ]:
        for old_id, new_id in mapping.items():
            cur.execute(f"UPDATE {table} SET {column} = ? WHERE {column} = ?", (new_id, old_id))

    # Handle orphaned user hospital_ids that never existed in hospitals
    cur.execute("SELECT DISTINCT hospital_id FROM users WHERE hospital_id IS NOT NULL")
    user_hids = {row["hospital_id"] for row in cur.fetchall()}

    cur.execute("SELECT id FROM hospitals")
    valid_hids = {row["id"] for row in cur.fetchall()}

    orphans = sorted([hid for hid in user_hids if hid not in valid_hids])
    for orphan in orphans:
        new_id = next_available(valid_hids)
        valid_hids.add(new_id)

        cur.execute(
            """
            INSERT INTO hospitals (id, name, address, phone, email, city, state, pincode, status, created_at, updated_at)
            VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (new_id, f"Migrated {orphan}"),
        )
        cur.execute("UPDATE users SET hospital_id = ? WHERE hospital_id = ?", (new_id, orphan))
        print(f"  Orphan {orphan} -> {new_id} (created placeholder hospital)")

    conn.commit()
    conn.close()
    print("Migration completed.")


if __name__ == "__main__":
    run()
