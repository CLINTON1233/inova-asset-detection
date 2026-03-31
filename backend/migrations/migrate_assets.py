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

def migrate_assets_table():
    """Migrasi: Menambahkan tabel assets jika belum ada"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("🚀 Memulai migrasi tabel assets...")
        print("-" * 50)
        
        cur = conn.cursor()
        
        # Cek apakah tabel assets sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'assets'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            print(" Tabel assets sudah ada, akan ditambahkan kolom yang belum ada...")
            
            # Cek dan tambah kolom yang belum ada
            columns_to_add = [
                ("validation_id", "INTEGER REFERENCES validations(id_validation) ON DELETE SET NULL"),
                ("asset_code", "VARCHAR(100) UNIQUE NOT NULL"),
                ("asset_name", "VARCHAR(255) NOT NULL"),
                ("asset_type", "VARCHAR(100)"),
                ("category", "VARCHAR(50)"),
                ("serial_number", "VARCHAR(100) UNIQUE"),
                ("scan_code", "VARCHAR(100) UNIQUE"),
                ("project_name", "VARCHAR(255)"),
                ("department_name", "VARCHAR(255)"),
                ("receiver_name", "VARCHAR(255)"),
                ("location_id", "INTEGER REFERENCES locations(id_location) ON DELETE SET NULL"),
                ("location_name", "VARCHAR(255)"),
                ("brand", "VARCHAR(100)"),
                ("vendor", "VARCHAR(255)"),
                ("model", "VARCHAR(100)"),
                ("specifications", "TEXT"),
                ("quantity", "DECIMAL(10,2) DEFAULT 1"),
                ("uom", "VARCHAR(20)"),
                ("status", "VARCHAR(50) DEFAULT 'active'"),
                ("photo_url", "TEXT"),
                ("validated_by", "INTEGER REFERENCES users(id_user) ON DELETE SET NULL"),
                ("validated_at", "TIMESTAMP")
            ]
            
            for col_name, col_type in columns_to_add:
                try:
                    cur.execute(f"""
                        ALTER TABLE assets 
                        ADD COLUMN IF NOT EXISTS {col_name} {col_type}
                    """)
                    print(f"   ✓ Kolom {col_name} ditambahkan")
                except Exception as e:
                    print(f" Kolom {col_name} sudah ada atau error: {e}")
            
            # Tambah index
            indexes_to_add = [
                "idx_assets_user ON assets(user_id)",
                "idx_assets_validation ON assets(validation_id)",
                "idx_assets_code ON assets(asset_code)",
                "idx_assets_serial ON assets(serial_number)",
                "idx_assets_scan_code ON assets(scan_code)",
                "idx_assets_status ON assets(status)",
                "idx_assets_category ON assets(category)",
                "idx_assets_project ON assets(project_name)",
                "idx_assets_department ON assets(department_name)",
                "idx_assets_receiver ON assets(receiver_name)"
            ]
            
            for idx_def in indexes_to_add:
                try:
                    cur.execute(f"CREATE INDEX IF NOT EXISTS {idx_def}")
                    print(f"   ✓ Index {idx_def.split(' ON ')[0]} ditambahkan")
                except Exception as e:
                    print(f"   ⚠️ Index {idx_def.split(' ON ')[0]} gagal: {e}")
            
        else:
            print("📦 Membuat tabel assets baru...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS assets (
                    id_assets SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                    validation_id INTEGER REFERENCES validations(id_validation) ON DELETE SET NULL,
                    asset_code VARCHAR(100) UNIQUE NOT NULL,
                    asset_name VARCHAR(255) NOT NULL,
                    asset_type VARCHAR(100),
                    category VARCHAR(50),
                    serial_number VARCHAR(100) UNIQUE,
                    scan_code VARCHAR(100) UNIQUE,
                    project_name VARCHAR(255),
                    department_name VARCHAR(255),
                    receiver_name VARCHAR(255),
                    location_id INTEGER REFERENCES locations(id_location) ON DELETE SET NULL,
                    location_name VARCHAR(255),
                    brand VARCHAR(100),
                    vendor VARCHAR(255),
                    model VARCHAR(100),
                    specifications TEXT,
                    quantity DECIMAL(10,2) DEFAULT 1,
                    uom VARCHAR(20),
                    status VARCHAR(50) DEFAULT 'active',
                    photo_url TEXT,
                    validated_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                    validated_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("   ✓ Tabel assets dibuat")
            
            # Tambah index
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_validation ON assets(validation_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_scan_code ON assets(scan_code)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_name)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department_name)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_receiver ON assets(receiver_name)")
            print("   ✓ Index ditambahkan")
        
        conn.commit()
        
        print("-" * 50)
        print("✅ Migrasi tabel assets selesai!")
        
        # Tampilkan struktur tabel assets
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'assets'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        
        print("\n📋 Struktur tabel assets:")
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during migration: {e}")
        return False
    finally:
        conn.close()

def add_validation_asset_column():
    """Menambahkan kolom asset_id ke tabel validations jika belum ada"""
    conn = get_connection()
    if not conn:
        return False
    
    try:
        cur = conn.cursor()
        
        # Cek apakah kolom asset_id sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'validations' AND column_name = 'asset_id'
            )
        """)
        column_exists = cur.fetchone()[0]
        
        if not column_exists:
            print("📦 Menambahkan kolom asset_id ke tabel validations...")
            cur.execute("""
                ALTER TABLE validations 
                ADD COLUMN asset_id INTEGER REFERENCES assets(id_assets) ON DELETE SET NULL
            """)
            print("   ✓ Kolom asset_id ditambahkan")
            conn.commit()
        else:
            print("⚠️ Kolom asset_id sudah ada di tabel validations")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error adding asset_id column: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("ASSETS TABLE MIGRATION TOOL")
    print("=" * 60)
    print("  Tool ini hanya akan MENAMBAH tabel assets dan kolom yang diperlukan")
    print("  Data yang sudah ada di database TIDAK akan terhapus")
    print("=" * 60)
    
    confirm = input("\nLanjutkan migrasi? (yes/no): ").strip().lower()
    
    if confirm == "yes":
        # Migrasi tabel assets
        migrate_assets_table()
        
        # Tambah kolom asset_id ke validations
        add_validation_asset_column()
        
        print("\n✅ Migrasi selesai! Data Anda aman.")
    else:
        print("Migrasi dibatalkan.")