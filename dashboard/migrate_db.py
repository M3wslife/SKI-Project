import sqlite3
import os

DB_PATH = 'dashboard/data/local.db'

def migrate():
    print(f"Checking {DB_PATH} schema...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if assignee_name exists
    cursor.execute("PRAGMA table_info(invoices)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'assignee_name' not in columns:
        print("Adding assignee_name column to invoices table...")
        cursor.execute("ALTER TABLE invoices ADD COLUMN assignee_name TEXT")
        conn.commit()
        print("Column added successfully.")
    else:
        print("assignee_name column already exists.")
    
    conn.close()

if __name__ == "__main__":
    migrate()
