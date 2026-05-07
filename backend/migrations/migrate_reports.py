import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from config import DB_CONFIG
from datetime import datetime

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

def add_verification_columns_to_reports(conn):
    """Menambahkan kolom verifikasi ke tabel reports"""
    try:
        cur = conn.cursor()
        
        # Cek dan tambah kolom verification_status
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reports' AND column_name = 'verification_status'
        """)
        
        if not cur.fetchone():
            cur.execute("""
                ALTER TABLE reports 
                ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending_review'
            """)
            print("✓ Kolom verification_status berhasil ditambahkan")
        else:
            print("✓ Kolom verification_status sudah ada")
        
        # Cek dan tambah kolom verification_notes (untuk alasan reject)
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reports' AND column_name = 'verification_notes'
        """)
        
        if not cur.fetchone():
            cur.execute("""
                ALTER TABLE reports 
                ADD COLUMN verification_notes TEXT
            """)
            print("✓ Kolom verification_notes berhasil ditambahkan")
        else:
            print("✓ Kolom verification_notes sudah ada")
        
        # Cek dan tambah kolom verified_by (user id yang melakukan verifikasi)
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reports' AND column_name = 'verified_by'
        """)
        
        if not cur.fetchone():
            cur.execute("""
                ALTER TABLE reports 
                ADD COLUMN verified_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL
            """)
            print("✓ Kolom verified_by berhasil ditambahkan")
        else:
            print("✓ Kolom verified_by sudah ada")
        
        # Cek dan tambah kolom verified_at (waktu verifikasi)
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reports' AND column_name = 'verified_at'
        """)
        
        if not cur.fetchone():
            cur.execute("""
                ALTER TABLE reports 
                ADD COLUMN verified_at TIMESTAMP
            """)
            print("✓ Kolom verified_at berhasil ditambahkan")
        else:
            print("✓ Kolom verified_at sudah ada")
        
        conn.commit()
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error adding verification columns: {e}")
        return False

def add_indexes(conn):
    """Menambahkan index untuk kolom verifikasi"""
    try:
        cur = conn.cursor()
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_reports_verification_status 
            ON reports(verification_status)
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_reports_verified_by 
            ON reports(verified_by)
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_reports_verified_at 
            ON reports(verified_at)
        """)
        
        conn.commit()
        print("✓ Index untuk kolom verifikasi berhasil ditambahkan")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error adding indexes: {e}")
        return False

def update_create_tables_script():
    """Memberikan instruksi untuk update file create_tables.py"""
    print("\n" + "=" * 60)
    print("⚠️  PENTING: Update file create_tables.py")
    print("=" * 60)
    print("""
Tambahkan kolom berikut ke dalam fungsi create_reports_table(conn):

    verification_status VARCHAR(50) DEFAULT 'pending_review',
    verification_notes TEXT,
    verified_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
    verified_at TIMESTAMP,

Contoh lengkap fungsi create_reports_table yang sudah diupdate:

def create_reports_table(conn):
    try:
        cur = conn.cursor()
        cur.execute(\"\"\"
            CREATE TABLE IF NOT EXISTS reports (
                id_report SERIAL PRIMARY KEY,
                report_code VARCHAR(100) UNIQUE NOT NULL,
                report_name VARCHAR(255) NOT NULL,
                report_type VARCHAR(50) NOT NULL,
                period_key VARCHAR(50) NOT NULL,
                period_label VARCHAR(100) NOT NULL,
                year INTEGER NOT NULL,
                month INTEGER,
                week_number INTEGER,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                total_devices INTEGER DEFAULT 0,
                total_materials INTEGER DEFAULT 0,
                total_items INTEGER DEFAULT 0,
                session_count INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'active',
                created_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                -- KOLOM VERIFIKASI BARU --
                verification_status VARCHAR(50) DEFAULT 'pending_review',
                verification_notes TEXT,
                verified_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                verified_at TIMESTAMP
            )
        \"\"\")
        conn.commit()
        print("✓ Tabel reports berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating reports table: {e}")
    """)

def migrate():
    """Fungsi utama untuk menjalankan migrasi"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("=" * 60)
        print("MIGRASI: Menambahkan kolom verifikasi ke tabel reports")
        print("=" * 60)
        print()
        
        # 1. Tambah kolom verifikasi
        print("1. Menambahkan kolom verifikasi ke tabel reports...")
        if not add_verification_columns_to_reports(conn):
            return False
        
        # 2. Tambah index
        print("2. Menambahkan index untuk kolom verifikasi...")
        if not add_indexes(conn):
            return False
        
        print()
        print("=" * 60)
        print("✅ MIGRASI BERHASIL!")
        print("Kolom verifikasi telah ditambahkan ke tabel reports:")
        print("   - verification_status (pending_review, on_review, approved, rejected)")
        print("   - verification_notes")
        print("   - verified_by")
        print("   - verified_at")
        print("=" * 60)
        
        # Tampilkan instruksi update create_tables.py
        update_create_tables_script()
        
        return True
        
    except Exception as e:
        print(f"Error during migration: {e}")
        return False
    finally:
        conn.close()

def rollback():
    """Fungsi untuk rollback (menghapus kolom verifikasi)"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("=" * 60)
        print("ROLLBACK: Menghapus kolom verifikasi dari tabel reports")
        print("=" * 60)
        print()
        
        cur = conn.cursor()
        
        # Hapus kolom
        columns = ['verification_status', 'verification_notes', 'verified_by', 'verified_at']
        
        for col in columns:
            try:
                cur.execute(f"""
                    ALTER TABLE reports 
                    DROP COLUMN IF EXISTS {col}
                """)
                print(f"✓ Kolom {col} dihapus dari reports")
            except Exception as e:
                print(f"Error dropping column {col}: {e}")
        
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
    print("REPORTS VERIFICATION MIGRATION TOOL")
    print("=" * 60)
    print()
    print("Status verifikasi yang tersedia:")
    print("   - pending_review: Belum direview")
    print("   - on_review: Sedang direview")
    print("   - approved: Disetujui")
    print("   - rejected: Ditolak")
    print()
    print("Pilih aksi:")
    print("1. Migrate (tambah kolom verifikasi)")
    print("2. Rollback (hapus kolom verifikasi)")
    print()
    
    action = input("Masukkan pilihan (1/2): ").strip()
    
    if action == "1":
        migrate()
    elif action == "2":
        confirm = input("⚠️ Yakin ingin menghapus kolom verifikasi? (yes/no): ").strip().lower()
        if confirm == "yes":
            rollback()
        else:
            print("Rollback dibatalkan.")
    else:
        print("Pilihan tidak valid.")