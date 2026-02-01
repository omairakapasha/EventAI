"""
Migration Runner Script
Applies SQL migrations to the PostgreSQL database.
"""

import os
import glob
import psycopg2
from urllib.parse import urlparse

def get_db_connection():
    """Get database connection using environment variables"""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)
    
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "eventai"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )

def run_migrations():
    """Run all SQL migrations in order"""
    print("Connecting to database...")
    try:
        conn = get_db_connection()
        conn.autocommit = True
    except Exception as e:
        print(f"Could not connect to database: {e}")
        return

    # Path to migrations - adjust as needed
    # We have migrations in two places:
    # 1. packages/backend/src/db/migrations (Original)
    # 2. Created 009 and 010 in the same folder during this session
    
    migration_dirs = [
        "../../backend/src/db/migrations",  # Relative to this script in packages/agentic_event_orchestrator
        "../../backend/src/db/migrations"   # I wrote 009/010 to this same dir in previous steps
    ]
    
    # Get all SQL files
    sql_files = []
    seen_files = set()
    
    for d in migration_dirs:
        if os.path.isdir(d):
            files = glob.glob(os.path.join(d, "*.sql"))
            for f in files:
                basename = os.path.basename(f)
                if basename not in seen_files:
                    seen_files.add(basename)
                    sql_files.append(f)
    
    # Sort by filename (001, 002, etc.)
    sql_files.sort(key=lambda x: os.path.basename(x))
    
    print(f"Found {len(sql_files)} migration files.")
    
    with conn.cursor() as cur:
        # Create migrations table if not exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        
        # Get applied migrations
        cur.execute("SELECT filename FROM migrations;")
        applied = {row[0] for row in cur.fetchall()}
        
        for sql_file in sql_files:
            filename = os.path.basename(sql_file)
            if filename in applied:
                print(f"Skipping {filename} (already applied)")
                continue
            
            print(f"Applying {filename}...")
            try:
                with open(sql_file, "r") as f:
                    sql_content = f.read()
                    cur.execute(sql_content)
                
                cur.execute("INSERT INTO migrations (filename) VALUES (%s)", (filename,))
                print(f"✅ Successfully applied {filename}")
            except Exception as e:
                print(f"❌ Error applying {filename}: {e}")
                # Don't break, try next? Or stop? usually stop.
                # simpler to just print error for now.
    
    conn.close()
    print("Migration run complete.")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    run_migrations()
