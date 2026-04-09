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

def add_is_stock_column():
    """Migrasi: Menambahkan kolom is_stock ke tabel items_preparation"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("🚀 Memulai migrasi kolom is_stock...")
        print("-" * 50)
        
        cur = conn.cursor()
        
        # ==================== UNTUK DEVICES ====================
        print("\n Menambahkan kolom is_stock ke devices_items_preparation...")
        
        # Cek apakah kolom sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'devices_items_preparation' 
                AND column_name = 'is_stock'
            )
        """)
        column_exists = cur.fetchone()[0]
        
        if not column_exists:
            cur.execute("""
                ALTER TABLE devices_items_preparation 
                ADD COLUMN is_stock BOOLEAN DEFAULT FALSE
            """)
            print(" Kolom is_stock ditambahkan ke devices_items_preparation")
        else:
            print(" Kolom is_stock sudah ada di devices_items_preparation")
        
        # Tambah index
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_devices_items_prep_stock 
            ON devices_items_preparation(is_stock)
        """)
        print("   ✓ Index idx_devices_items_prep_stock ditambahkan")
        
        # ==================== UNTUK MATERIALS ====================
        print("\n Menambahkan kolom is_stock ke materials_items_preparation...")
        
        # Cek apakah kolom sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'materials_items_preparation' 
                AND column_name = 'is_stock'
            )
        """)
        column_exists = cur.fetchone()[0]
        
        if not column_exists:
            cur.execute("""
                ALTER TABLE materials_items_preparation 
                ADD COLUMN is_stock BOOLEAN DEFAULT FALSE
            """)
            print("   ✓ Kolom is_stock ditambahkan ke materials_items_preparation")
        else:
            print("   ⚠️ Kolom is_stock sudah ada di materials_items_preparation")
        
        # Tambah index
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_materials_items_prep_stock 
            ON materials_items_preparation(is_stock)
        """)
        print("   ✓ Index idx_materials_items_prep_stock ditambahkan")
        
        conn.commit()
        
        print("-" * 50)
        print("✅ Migrasi kolom is_stock selesai!")
        
        # Tampilkan hasil
        print("\n Verifikasi struktur tabel:")
        
        # Cek devices_items_preparation
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'devices_items_preparation' 
            AND column_name = 'is_stock'
        """)
        device_col = cur.fetchone()
        if device_col:
            print(f"   - devices_items_preparation.is_stock: {device_col[1]} (default: {device_col[3]})")
        
        # Cek materials_items_preparation
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'materials_items_preparation' 
            AND column_name = 'is_stock'
        """)
        material_col = cur.fetchone()
        if material_col:
            print(f"   - materials_items_preparation.is_stock: {material_col[1]} (default: {material_col[3]})")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f" Error during migration: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("ADD IS_STOCK COLUMN MIGRATION")
    print("=" * 60)
    print("  Tool ini akan MENAMBAH kolom is_stock ke tabel:")
    print("  - devices_items_preparation")
    print("  - materials_items_preparation")
    print("  Data yang sudah ada di database TIDAK akan terhapus")
    print("=" * 60)
    
    confirm = input("\nLanjutkan migrasi? (yes/no): ").strip().lower()
    
    if confirm == "yes":
        add_is_stock_column()
        print("\n✅ Migrasi selesai! Data Anda aman.")
    else:
        print("Migrasi dibatalkan.")