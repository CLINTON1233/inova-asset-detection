import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from config import DB_CONFIG

def get_connection():
    try:
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            database=DB_CONFIG['database'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port']
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def add_receiver_name_column():
    """Menambahkan kolom receiver_name ke tabel validations"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek apakah kolom sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'validations' AND column_name = 'receiver_name'
            )
        """)
        column_exists = cur.fetchone()[0]
        
        if not column_exists:
            print("Adding receiver_name column to validations table...")
            cur.execute("""
                ALTER TABLE validations 
                ADD COLUMN receiver_name VARCHAR(255)
            """)
            conn.commit()
            print("✓ receiver_name column added successfully")
        else:
            print("✓ receiver_name column already exists")
        
        return True
        
    except Exception as e:
        print(f"Error adding receiver_name column: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("="*50)
    print("ADDING RECEIVER_NAME COLUMN TO VALIDATIONS")
    print("="*50)
    
    if add_receiver_name_column():
        print("✅ Migration completed!")
    else:
        print("❌ Migration failed!")