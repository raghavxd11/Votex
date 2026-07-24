import sqlite3
import os

DB_PATH = 'backend/mental_health_platform_v4.db'

def normalize_existing_emails():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Fetch all users
    cursor.execute("SELECT id, email FROM users")
    users = cursor.fetchall()
    
    updated_count = 0
    for user_id, email in users:
        lower_email = email.lower()
        if lower_email != email:
            cursor.execute("UPDATE users SET email = ? WHERE id = ?", (lower_email, user_id))
            updated_count += 1
            print(f"Normalized: {email} -> {lower_email}")
            
    conn.commit()
    conn.close()
    print(f"Successfully normalized {updated_count} email(s).")

if __name__ == "__main__":
    normalize_existing_emails()
