import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
    """Membuat tabel users"""
    try:
        cur = conn.cursor()
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
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)")
        conn.commit()
        print("✓ Tabel users berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating users table: {e}")

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

def create_departments_table(conn):
    """Membuat tabel departments"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS departments (
                id_department SERIAL PRIMARY KEY,
                department_name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("✓ Tabel departments berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating departments table: {e}")

# ==================== TABEL UNTUK DEVICES ====================
def create_devices_scanning_preparations_table(conn):
    """Tabel HEADER scanning preparation untuk Devices"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS devices_scanning_preparations (
                id_preparation SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                checking_number VARCHAR(50) UNIQUE NOT NULL,
                checking_name VARCHAR(255) NOT NULL,
                category_id INTEGER REFERENCES asset_categories(id_category) ON DELETE SET NULL,
                location_id INTEGER REFERENCES locations(id_location) ON DELETE SET NULL,
                checking_date DATE NOT NULL,
                remarks TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_prep_user ON devices_scanning_preparations(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_prep_checking_number ON devices_scanning_preparations(checking_number)")
        conn.commit()
        print("✓ Tabel devices_scanning_preparations berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating devices_scanning_preparations table: {e}")

def create_devices_scanning_items_table(conn):
    """Tabel DETAIL scanning item untuk Devices (master item dengan quantity)"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS devices_scanning_items (
                id_item SERIAL PRIMARY KEY,
                preparation_id INTEGER REFERENCES devices_scanning_preparations(id_preparation) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                device_name VARCHAR(255) NOT NULL,
                device_detail TEXT,
                brand VARCHAR(100),
                vendor VARCHAR(255),
                model VARCHAR(100),
                specifications TEXT,
                quantity INTEGER NOT NULL DEFAULT 1,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep ON devices_scanning_items(preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_user ON devices_scanning_items(user_id)")
        conn.commit()
        print("✓ Tabel devices_scanning_items berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating devices_scanning_items table: {e}")

def create_devices_items_preparation_table(conn):
    """Tabel untuk menyimpan setiap item individual Devices (hasil dari quantity)"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS devices_items_preparation (
                id_item_preparation SERIAL PRIMARY KEY,
                scanning_item_id INTEGER REFERENCES devices_scanning_items(id_item) ON DELETE CASCADE,
                preparation_id INTEGER REFERENCES devices_scanning_preparations(id_preparation) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                item_number VARCHAR(50),
                serial_number VARCHAR(100),
                scan_code VARCHAR(100),
                status VARCHAR(50) DEFAULT 'pending',
                scanned_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scanned_at TIMESTAMP,
                department_id INTEGER REFERENCES departments(id_department) ON DELETE SET NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_scanning ON devices_items_preparation(scanning_item_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_prep ON devices_items_preparation(preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_user ON devices_items_preparation(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_serial ON devices_items_preparation(serial_number)")
        conn.commit()
        print("✓ Tabel devices_items_preparation berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating devices_items_preparation table: {e}")

def create_devices_item_departments_table(conn):
    """Tabel untuk distribusi device ke department"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS devices_item_departments (
                id_item_department SERIAL PRIMARY KEY,
                scanning_item_id INTEGER REFERENCES devices_scanning_items(id_item) ON DELETE CASCADE,
                department_id INTEGER REFERENCES departments(id_department) ON DELETE CASCADE,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(scanning_item_id, department_id)
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_item_dept_item ON devices_item_departments(scanning_item_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_item_dept_dept ON devices_item_departments(department_id)")
        conn.commit()
        print("✓ Tabel devices_item_departments berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating devices_item_departments table: {e}")

# ==================== TABEL UNTUK MATERIALS ====================
def create_materials_scanning_preparations_table(conn):
    """Tabel HEADER scanning preparation untuk Materials"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS materials_scanning_preparations (
                id_preparation SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                checking_number VARCHAR(50) UNIQUE NOT NULL,
                checking_name VARCHAR(255) NOT NULL,
                category_id INTEGER REFERENCES asset_categories(id_category) ON DELETE SET NULL,
                location_id INTEGER REFERENCES locations(id_location) ON DELETE SET NULL,
                checking_date DATE NOT NULL,
                remarks TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_prep_user ON materials_scanning_preparations(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_prep_checking_number ON materials_scanning_preparations(checking_number)")
        conn.commit()
        print("✓ Tabel materials_scanning_preparations berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating materials_scanning_preparations table: {e}")

def create_materials_scanning_items_table(conn):
    """Tabel DETAIL scanning item untuk Materials (master item dengan quantity)"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS materials_scanning_items (
                id_item SERIAL PRIMARY KEY,
                preparation_id INTEGER REFERENCES materials_scanning_preparations(id_preparation) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                material_name VARCHAR(255) NOT NULL,
                material_detail TEXT,
                quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
                uom VARCHAR(20) NOT NULL DEFAULT 'PCS',
                vendor VARCHAR(255),
                project_name VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_prep ON materials_scanning_items(preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_user ON materials_scanning_items(user_id)")
        conn.commit()
        print("✓ Tabel materials_scanning_items berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating materials_scanning_items table: {e}")

def create_materials_items_preparation_table(conn):
    """Tabel untuk menyimpan setiap item individual Materials (hasil dari quantity)"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS materials_items_preparation (
                id_item_preparation SERIAL PRIMARY KEY,
                scanning_item_id INTEGER REFERENCES materials_scanning_items(id_item) ON DELETE CASCADE,
                preparation_id INTEGER REFERENCES materials_scanning_preparations(id_preparation) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                item_number VARCHAR(50),
                scan_code VARCHAR(100),
                quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
                uom VARCHAR(20),
                vendor VARCHAR(255),
                project_name VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                scanned_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scanned_at TIMESTAMP,
                department_id INTEGER REFERENCES departments(id_department) ON DELETE SET NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_prep_scanning ON materials_items_preparation(scanning_item_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_prep_prep ON materials_items_preparation(preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_prep_user ON materials_items_preparation(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_prep_scan_code ON materials_items_preparation(scan_code)")
        conn.commit()
        print("✓ Tabel materials_items_preparation berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating materials_items_preparation table: {e}")

def create_materials_item_departments_table(conn):
    """Tabel untuk distribusi material ke department"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS materials_item_departments (
                id_item_department SERIAL PRIMARY KEY,
                scanning_item_id INTEGER REFERENCES materials_scanning_items(id_item) ON DELETE CASCADE,
                department_id INTEGER REFERENCES departments(id_department) ON DELETE CASCADE,
                quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(scanning_item_id, department_id)
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_item_dept_item ON materials_item_departments(scanning_item_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_item_dept_dept ON materials_item_departments(department_id)")
        conn.commit()
        print("✓ Tabel materials_item_departments berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating materials_item_departments table: {e}")

def create_materials_uom_table(conn):
    """Tabel untuk Unit of Measure (UOM)"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS materials_uom (
                id_uom SERIAL PRIMARY KEY,
                uom_code VARCHAR(10) UNIQUE NOT NULL,
                uom_name VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Insert default UOM values
        cur.execute("""
            INSERT INTO materials_uom (uom_code, uom_name) VALUES
            ('PCS', 'Pieces'),
            ('UNIT', 'Unit'),
            ('ROLL', 'Roll'),
            ('PACK', 'Pack'),
            ('BOX', 'Box'),
            ('METER', 'Meter'),
            ('KG', 'Kilogram')
            ON CONFLICT (uom_code) DO NOTHING
        """)
        conn.commit()
        print("✓ Tabel materials_uom berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating materials_uom table: {e}")

def create_scan_results_table(conn):
    """Tabel hasil scan - menyimpan semua data hasil scanning termasuk serial number"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS scan_results (
                id_scan SERIAL PRIMARY KEY,
                item_preparation_id INTEGER REFERENCES items_preparation(id_item_preparation) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scanned_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                scan_category VARCHAR(50),
                scan_value TEXT,
                serial_number VARCHAR(100),
                scan_code VARCHAR(100),
                detection_data JSONB,
                is_valid BOOLEAN DEFAULT FALSE,
                status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_item_prep ON scan_results(item_preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_user ON scan_results(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_scanned_by ON scan_results(scanned_by)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_serial ON scan_results(serial_number)")
        conn.commit()
        print("✓ Tabel scan_results berhasil dibuat (dengan serial_number, scanned_by, scanned_at)")
    except Exception as e:
        conn.rollback()
        print(f"Error creating scan_results table: {e}")

def create_assets_table(conn):
    """Tabel assets - data final setelah validasi"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS assets (
                id_assets SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                category_id INTEGER REFERENCES asset_categories(id_category) ON DELETE SET NULL,
                location_id INTEGER REFERENCES locations(id_location) ON DELETE SET NULL,
                asset_name VARCHAR(255) NOT NULL,
                serial_number VARCHAR(100) UNIQUE,
                scan_code VARCHAR(100) UNIQUE,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number)")
        conn.commit()
        print("✓ Tabel assets berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating assets table: {e}")

def create_validations_table(conn):
    """Tabel validations - verifikasi sebelum masuk ke assets"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS validations (
                id_validation SERIAL PRIMARY KEY,
                scan_id INTEGER REFERENCES scan_results(id_scan) ON DELETE CASCADE,
                item_preparation_id INTEGER REFERENCES items_preparation(id_item_preparation) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                asset_id INTEGER REFERENCES assets(id_assets) ON DELETE SET NULL,
                validation_status VARCHAR(50) DEFAULT 'pending',
                validation_notes TEXT,
                validated_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                validated_at TIMESTAMP,
                unique_code VARCHAR(100) UNIQUE,
                is_approved BOOLEAN DEFAULT FALSE,
                rejection_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_scan ON validations(scan_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_item_prep ON validations(item_preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_status ON validations(validation_status)")
        conn.commit()
        print("✓ Tabel validations berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating validations table: {e}")

def create_history_logs_table(conn):
    """Tabel history logs untuk audit"""
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
        cur.execute("CREATE INDEX IF NOT EXISTS idx_history_user ON history_logs(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_history_asset ON history_logs(asset_id)")
        conn.commit()
        print("✓ Tabel history_logs berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating history_logs table: {e}")

def create_all_tables():
    """Function utama untuk membuat semua tabel"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("🚀 Memulai migrasi database...")
        print("-" * 50)
        
        # Tabel master
        create_users_table(conn)
        create_asset_categories_table(conn)
        create_locations_table(conn)
        create_departments_table(conn)
        
        # Tabel untuk Devices
        create_devices_scanning_preparations_table(conn)
        create_devices_scanning_items_table(conn)
        create_devices_items_preparation_table(conn)
        create_devices_item_departments_table(conn)
        
        # Tabel untuk Materials
        create_materials_uom_table(conn)
        create_materials_scanning_preparations_table(conn)
        create_materials_scanning_items_table(conn)
        create_materials_items_preparation_table(conn)
        create_materials_item_departments_table(conn)
        
        # Tabel hasil (shared untuk devices dan materials)
        create_scan_results_table(conn)
        create_assets_table(conn)
        create_validations_table(conn)
        create_history_logs_table(conn)
        
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
    """Function untuk menghapus semua tabel"""
    conn = get_connection()
    if not conn:
        return False
    
    try:
        print("Menghapus semua tabel...")
        cur = conn.cursor()
    
        tables_to_drop = [
            'history_logs',
            'validations',
            'assets',
            'scan_results',
            'materials_item_departments',
            'materials_items_preparation',
            'materials_scanning_items',
            'materials_scanning_preparations',
            'materials_uom',
            'devices_item_departments',
            'devices_items_preparation',
            'devices_scanning_items',
            'devices_scanning_preparations',
            'departments',
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