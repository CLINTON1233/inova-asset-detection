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

def fix_validations_table():
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek dan hapus kolom receiver_name
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'validations' AND column_name = 'receiver_name'
            )
        """)
        if cur.fetchone()[0]:
            print("Removing column: receiver_name")
            cur.execute("ALTER TABLE validations DROP COLUMN receiver_name CASCADE")
        
        # Cek dan hapus kolom receiver_title
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'validations' AND column_name = 'receiver_title'
            )
        """)
        if cur.fetchone()[0]:
            print("Removing column: receiver_title")
            cur.execute("ALTER TABLE validations DROP COLUMN receiver_title CASCADE")
        
        conn.commit()
        print("✓ Validations table fixed successfully!")
        return True
        
    except Exception as e:
        print(f"Error fixing validations table: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("="*50)
    print("FIXING VALIDATIONS TABLE")
    print("="*50)
    
    if fix_validations_table():
        print("\n✅ Done! Please restart your backend server.")
    else:
        print("\n❌ Failed to fix validations table")