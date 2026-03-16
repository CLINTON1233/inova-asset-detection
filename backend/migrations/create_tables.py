import psycopg2
from psycopg2 import sql
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

def create_users_table(conn):
    """Membuat tabel users (menggabungkan karyawan dan manager)"""
    try:
        cur = conn.cursor()
        cur.execute("DROP TABLE IF EXISTS karyawan CASCADE")
        cur.execute("DROP TABLE IF EXISTS manager CASCADE")
        
        # Create users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id_user SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                no_badge VARCHAR(50) UNIQUE,
                department VARCHAR(100),
                role VARCHAR(50) DEFAULT 'karyawan',
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create index on role for faster queries
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)")
        
        conn.commit()
        print("✓ Tabel users berhasil dibuat")
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating users table: {e}")
        
def create_scanning_preparations_table(conn):
    """Membuat tabel scanning_preparations untuk menyiapkan sesi scanning"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS scanning_preparations (
                id_preparation SERIAL PRIMARY KEY,
                checking_number VARCHAR(50) UNIQUE NOT NULL,
                checking_name VARCHAR(255) NOT NULL,
                category_id INTEGER REFERENCES asset_categories(id_category) ON DELETE SET NULL,
                item_name VARCHAR(255) NOT NULL,
                brand VARCHAR(100),
                model VARCHAR(100),
                specifications TEXT,
                quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
                location_id INTEGER REFERENCES locations(id_location) ON DELETE SET NULL,
                checking_date DATE NOT NULL,
                remarks TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scanning_prep_checking_number ON scanning_preparations(checking_number)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scanning_prep_category ON scanning_preparations(category_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scanning_prep_location ON scanning_preparations(location_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scanning_prep_status ON scanning_preparations(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scanning_prep_date ON scanning_preparations(checking_date)")
        
        conn.commit()
        print("✓ Tabel scanning_preparations berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating scanning_preparations table: {e}")

def create_scanning_items_table(conn):
    """Membuat tabel scanning_items untuk multiple items dalam satu persiapan"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS scanning_items (
                id_item SERIAL PRIMARY KEY,
                preparation_id INTEGER REFERENCES scanning_preparations(id_preparation) ON DELETE CASCADE,
                item_name VARCHAR(255) NOT NULL,
                brand VARCHAR(100),
                model VARCHAR(100),
                specifications TEXT,
                quantity INTEGER NOT NULL DEFAULT 1,
                scanned_count INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scanning_items_prep ON scanning_items(preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scanning_items_status ON scanning_items(status)")
        
        conn.commit()
        print("✓ Tabel scanning_items berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating scanning_items table: {e}")

def create_asset_categories_table(conn):
    """Membuat tabel asset_categories"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS asset_categories (
                id_category SERIAL PRIMARY KEY,
                category_name VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("✓ Tabel asset_categories berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating asset_categories table: {e}")

def create_assets_table(conn):
    """Membuat tabel assets"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS assets (
                id_assets SERIAL PRIMARY KEY,
                category_id INTEGER REFERENCES asset_categories(id_category) ON DELETE SET NULL,
                asset_name VARCHAR(255) NOT NULL,
                serial_number VARCHAR(100) UNIQUE,
                barcode VARCHAR(100) UNIQUE,
                lokasi VARCHAR(255),
                status VARCHAR(50) DEFAULT 'available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_barcode ON assets(barcode)")
        
        conn.commit()
        print("✓ Tabel assets berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating assets table: {e}")

def create_locations_table(conn):
    """Membuat tabel locations"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS locations (
                id_location SERIAL PRIMARY KEY,
                location_name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("✓ Tabel locations berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating locations table: {e}")

def create_history_logs_table(conn):
    """Membuat tabel history_logs"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS history_logs (
                id_logs SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                asset_id INTEGER REFERENCES assets(id_assets) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )
        """)
        
        # Create indexes for faster queries
        cur.execute("CREATE INDEX IF NOT EXISTS idx_history_user ON history_logs(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_history_asset ON history_logs(asset_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history_logs(action_timestamp)")
        
        conn.commit()
        print("✓ Tabel history_logs berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating history_logs table: {e}")

def create_reports_table(conn):
    """Membuat tabel reports"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id_report SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                report_name VARCHAR(255) NOT NULL,
                report_date DATE DEFAULT CURRENT_DATE,
                status VARCHAR(50) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date)")
        
        conn.commit()
        print("✓ Tabel reports berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating reports table: {e}")

def create_report_details_table(conn):
    """Membuat tabel report_details"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS report_details (
                id_report_detail SERIAL PRIMARY KEY,
                report_id INTEGER REFERENCES reports(id_report) ON DELETE CASCADE,
                asset_id INTEGER REFERENCES assets(id_assets) ON DELETE SET NULL,
                condition VARCHAR(100),
                notes TEXT
            )
        """)
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_report_details_report ON report_details(report_id)")
        
        conn.commit()
        print("✓ Tabel report_details berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating report_details table: {e}")

def create_scan_results_table(conn):
    """Membuat tabel scan_results"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS scan_results (
                id_scan SERIAL PRIMARY KEY,
                asset_id INTEGER REFERENCES assets(id_assets) ON DELETE SET NULL,
                category_id INTEGER REFERENCES asset_categories(id_category) ON DELETE SET NULL,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scan_type VARCHAR(50),
                scan_value TEXT,
                bounding_box JSONB,
                photo_proof TEXT,
                scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_success BOOLEAN DEFAULT FALSE,
                notes TEXT
            )
        """)
        
        # Create indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_asset ON scan_results(asset_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_user ON scan_results(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_time ON scan_results(scan_time)")
        
        conn.commit()
        print("✓ Tabel scan_results berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating scan_results table: {e}")

def create_validations_table(conn):
    """Membuat tabel validations"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS validations (
                id_validations SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scan_id INTEGER REFERENCES scan_results(id_scan) ON DELETE CASCADE,
                asset_id INTEGER REFERENCES assets(id_assets) ON DELETE SET NULL,
                validation_status VARCHAR(50) DEFAULT 'pending',
                unique_code VARCHAR(100) UNIQUE,
                notes TEXT,
                validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_user ON validations(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_scan ON validations(scan_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_status ON validations(validation_status)")
        
        conn.commit()
        print("✓ Tabel validations berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating validations table: {e}")

def create_all_tables():
    """Function utama untuk membuat semua tabel"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("🚀 Memulai migrasi database...")
        print("-" * 50)
        
        create_users_table(conn)
        create_asset_categories_table(conn)
        create_assets_table(conn)
        create_locations_table(conn)
        create_history_logs_table(conn)
        create_reports_table(conn)
        create_report_details_table(conn)
        create_scan_results_table(conn)
        create_validations_table(conn)
        create_scanning_preparations_table(conn) 
        create_scanning_items_table(conn)         
        
        print("-" * 50)
        print("✅ Migrasi database selesai!")

        cur = conn.cursor()
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cur.fetchall()
        
        print("\n Daftar tabel yang berhasil dibuat:")
        for table in tables:
            print(f"   - {table[0]}")
        
        return True
        
    except Exception as e:
        print(f"Error during migration: {e}")
        return False
    finally:
        conn.close()

def drop_all_tables():
    """Function untuk menghapus semua tabel (hati-hati menggunakan ini!)"""
    conn = get_connection()
    if not conn:
        return False
    
    try:
        print("Menghapus semua tabel...")
        cur = conn.cursor()
        
        # Drop tables in reverse order (because of foreign key constraints)
        tables_to_drop = [
            'validations',
            'scan_results',
            'report_details',
            'reports',
            'history_logs',
            'assets',
            'locations',
            'asset_categories',
            'users'
        ]
        
        for table in tables_to_drop:
            cur.execute(sql.SQL("DROP TABLE IF EXISTS {} CASCADE").format(sql.Identifier(table)))
            print(f"   ✓ Tabel {table} dihapus")
        
        conn.commit()
        print("✅ Semua tabel berhasil dihapus")
        return True
        
    except Exception as e:
        print(f"Error dropping tables: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()