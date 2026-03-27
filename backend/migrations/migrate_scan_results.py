import sys
import os

# Tambahkan path ke project backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from config import DB_CONFIG

def get_connection():
    """Membuat koneksi ke database"""
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

def add_photo_column_to_scan_results():
    """Menambahkan kolom photo ke tabel scan_results_devices dan scan_results_materials"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek apakah kolom sudah ada
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'scan_results_devices' AND column_name = 'photo_data'
        """)
        column_exists = cur.fetchone()
        
        if column_exists:
            print("Photo columns already exist in scan_results_devices")
        else:
            # Tambah kolom photo ke scan_results_devices
            print("Adding photo column to scan_results_devices...")
            try:
                cur.execute("""
                    ALTER TABLE scan_results_devices 
                    ADD COLUMN photo_data TEXT,
                    ADD COLUMN photo_url TEXT
                """)
                print("✓ Photo columns added to scan_results_devices")
            except Exception as e:
                print(f"Error adding columns to scan_results_devices: {e}")
                conn.rollback()
                return False
        
        # Cek kolom di scan_results_materials
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'scan_results_materials' AND column_name = 'photo_data'
        """)
        column_exists = cur.fetchone()
        
        if column_exists:
            print("Photo columns already exist in scan_results_materials")
        else:
            # Tambah kolom photo ke scan_results_materials
            print("Adding photo column to scan_results_materials...")
            try:
                cur.execute("""
                    ALTER TABLE scan_results_materials 
                    ADD COLUMN photo_data TEXT,
                    ADD COLUMN photo_url TEXT
                """)
                print("✓ Photo columns added to scan_results_materials")
            except Exception as e:
                print(f"Error adding columns to scan_results_materials: {e}")
                conn.rollback()
                return False
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Migration error: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def rollback_photo_column():
    """Menghapus kolom photo jika diperlukan rollback"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        print("Rolling back photo columns...")
        
        # Hapus kolom dari scan_results_devices
        try:
            cur.execute("""
                ALTER TABLE scan_results_devices 
                DROP COLUMN IF EXISTS photo_data,
                DROP COLUMN IF EXISTS photo_url
            """)
            print("✓ Photo columns removed from scan_results_devices")
        except Exception as e:
            print(f"Error removing columns from scan_results_devices: {e}")
        
        # Hapus kolom dari scan_results_materials
        try:
            cur.execute("""
                ALTER TABLE scan_results_materials 
                DROP COLUMN IF EXISTS photo_data,
                DROP COLUMN IF EXISTS photo_url
            """)
            print("✓ Photo columns removed from scan_results_materials")
        except Exception as e:
            print(f"Error removing columns from scan_results_materials: {e}")
        
        conn.commit()
        print("\n✅ Rollback completed!")
        return True
        
    except Exception as e:
        print(f"Rollback error: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("MIGRATION: Add Photo Column to Scan Results")
    print("=" * 50)
    
    action = input("Do you want to (migrate) or (rollback)? [migrate/rollback]: ").strip().lower()
    
    if action == "migrate":
        add_photo_column_to_scan_results()
    elif action == "rollback":
        rollback_photo_column()
    else:
        print("Invalid action. Please choose 'migrate' or 'rollback'")