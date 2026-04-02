import sys
import os

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

def add_updated_at_to_scan_results_devices(conn):
    """Menambahkan kolom updated_at ke tabel scan_results_devices"""
    try:
        cur = conn.cursor()
        
        # Cek apakah kolom sudah ada
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'scan_results_devices' AND column_name = 'updated_at'
        """)
        
        if cur.fetchone():
            print("✓ Kolom updated_at sudah ada di tabel scan_results_devices")
            return True
        
        # Tambah kolom updated_at
        cur.execute("""
            ALTER TABLE scan_results_devices 
            ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """)
        
        conn.commit()
        print("✓ Kolom updated_at berhasil ditambahkan ke tabel scan_results_devices")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error adding updated_at to scan_results_devices: {e}")
        return False

def add_updated_at_to_scan_results_materials(conn):
    """Menambahkan kolom updated_at ke tabel scan_results_materials"""
    try:
        cur = conn.cursor()
        
        # Cek apakah kolom sudah ada
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'scan_results_materials' AND column_name = 'updated_at'
        """)
        
        if cur.fetchone():
            print("✓ Kolom updated_at sudah ada di tabel scan_results_materials")
            return True
        
        # Tambah kolom updated_at
        cur.execute("""
            ALTER TABLE scan_results_materials 
            ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """)
        
        conn.commit()
        print("✓ Kolom updated_at berhasil ditambahkan ke tabel scan_results_materials")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error adding updated_at to scan_results_materials: {e}")
        return False

def add_indexes(conn):
    """Menambahkan index untuk kolom updated_at"""
    try:
        cur = conn.cursor()
        
        # Index untuk scan_results_devices
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_scan_results_devices_updated_at 
            ON scan_results_devices(updated_at)
        """)
        
        # Index untuk scan_results_materials
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_scan_results_materials_updated_at 
            ON scan_results_materials(updated_at)
        """)
        
        conn.commit()
        print("✓ Index untuk kolom updated_at berhasil ditambahkan")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error adding indexes: {e}")
        return False

def update_existing_records(conn):
    """Update nilai updated_at untuk record yang sudah ada"""
    try:
        cur = conn.cursor()
        
        # Update scan_results_devices yang updated_at NULL
        cur.execute("""
            UPDATE scan_results_devices 
            SET updated_at = created_at 
            WHERE updated_at IS NULL
        """)
        
        # Update scan_results_materials yang updated_at NULL
        cur.execute("""
            UPDATE scan_results_materials 
            SET updated_at = created_at 
            WHERE updated_at IS NULL
        """)
        
        conn.commit()
        print("✓ Nilai updated_at untuk record yang sudah ada berhasil diupdate")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error updating existing records: {e}")
        return False

def migrate():
    """Fungsi utama untuk menjalankan migrasi"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("=" * 60)
        print("MIGRASI: Menambahkan kolom updated_at ke tabel scan_results")
        print("=" * 60)
        print()
        
        # 1. Tambah kolom updated_at ke scan_results_devices
        print("1. Menambahkan kolom updated_at ke scan_results_devices...")
        if not add_updated_at_to_scan_results_devices(conn):
            return False
        
        # 2. Tambah kolom updated_at ke scan_results_materials
        print("2. Menambahkan kolom updated_at ke scan_results_materials...")
        if not add_updated_at_to_scan_results_materials(conn):
            return False
        
        # 3. Update nilai updated_at untuk record yang sudah ada
        print("3. Mengupdate nilai updated_at untuk record yang sudah ada...")
        if not update_existing_records(conn):
            return False
        
        # 4. Tambah index
        print("4. Menambahkan index untuk kolom updated_at...")
        if not add_indexes(conn):
            return False
        
        print()
        print("=" * 60)
        print("✅ MIGRASI BERHASIL!")
        print("Kolom updated_at telah ditambahkan ke tabel:")
        print("   - scan_results_devices")
        print("   - scan_results_materials")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"Error during migration: {e}")
        return False
    finally:
        conn.close()

def rollback():
    """Fungsi untuk rollback (menghapus kolom updated_at)"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("=" * 60)
        print("ROLLBACK: Menghapus kolom updated_at dari tabel scan_results")
        print("=" * 60)
        print()
        
        cur = conn.cursor()
        
        # Hapus kolom dari scan_results_devices
        try:
            cur.execute("""
                ALTER TABLE scan_results_devices 
                DROP COLUMN IF EXISTS updated_at
            """)
            print("✓ Kolom updated_at dihapus dari scan_results_devices")
        except Exception as e:
            print(f"Error dropping column from scan_results_devices: {e}")
        
        # Hapus kolom dari scan_results_materials
        try:
            cur.execute("""
                ALTER TABLE scan_results_materials 
                DROP COLUMN IF EXISTS updated_at
            """)
            print("✓ Kolom updated_at dihapus dari scan_results_materials")
        except Exception as e:
            print(f"Error dropping column from scan_results_materials: {e}")
        
        conn.commit()
        
        print()
        print("=" * 60)
        print("✅ ROLLBACK BERHASIL!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error during rollback: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("SCAN RESULTS MIGRATION TOOL")
    print("=" * 60)
    print()
    print("Pilih aksi:")
    print("1. Migrate (tambah kolom updated_at)")
    print("2. Rollback (hapus kolom updated_at)")
    print()
    
    action = input("Masukkan pilihan (1/2): ").strip()
    
    if action == "1":
        migrate()
    elif action == "2":
        confirm = input("⚠️ Yakin ingin menghapus kolom updated_at? (yes/no): ").strip().lower()
        if confirm == "yes":
            rollback()
        else:
            print("Rollback dibatalkan.")
    else:
        print("Pilihan tidak valid.")