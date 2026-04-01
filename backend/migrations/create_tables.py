import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2 import sql
from config import DB_CONFIG

# ==================== DATA PROJECT ====================
PROJECTS = [
    "Gamma",
    "Nederwiek 2",
    "Overhead",
    "FPSO PETROBRAS P-84",
    "FPSO PETROBRAS P-85",
    "Sofia",
    "BP KASKIDA FPU",
    "Empire",
    "Beta",
    "Changhua",
    "Yard Development"
]

# ==================== DATA DEVICES ====================
DEVICES = [
    "Anviz",
    "Converter",
    "Fingerprint",
    "Ipphone",
    "Jabra Speaker",
    "Keyboard",
    "Laptop",
    "Monitor",
    "Mouse",
    "PC",
    "Print Label",
    "Printer",
    "Telepon",
    "TV",
    "Webcam"
]

# ==================== DATA MATERIALS ====================
MATERIALS = [
    "Cable LAN",
    "Flexible",
    "FO",
    "Trunking",
    "Pipa",
    "Klem",
    "Junction Box",
    "RJ45",
    "Modular Jack",
    "Isolasi Rubber",
    "elbow"
]

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

def get_category_id(conn, category_name):
    """Mendapatkan category_id dari asset_categories berdasarkan nama kategori"""
    try:
        cur = conn.cursor()
        cur.execute("SELECT id_category FROM asset_categories WHERE category_name = %s", (category_name,))
        result = cur.fetchone()
        return result[0] if result else None
    except Exception as e:
        print(f"Error getting category_id: {e}")
        return None

# ==================== TABEL UTAMA ====================
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

# ==================== TABEL MASTER ====================
def create_projects_table(conn):
    """Membuat tabel projects"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id_project SERIAL PRIMARY KEY,
                project_code VARCHAR(50) UNIQUE NOT NULL,
                project_name VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(project_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code)")
        
        # Insert project data
        for project in PROJECTS:
            project_code = project.upper().replace(" ", "_").replace("-", "_")
            cur.execute("""
                INSERT INTO projects (project_code, project_name)
                VALUES (%s, %s)
                ON CONFLICT (project_code) DO NOTHING
            """, (project_code, project))
        
        conn.commit()
        print(f"✓ Tabel projects berhasil dibuat dengan {len(PROJECTS)} data project")
    except Exception as e:
        conn.rollback()
        print(f"Error creating projects table: {e}")

def create_master_devices_table(conn):
    """Membuat tabel master_devices"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS master_devices (
                id_device SERIAL PRIMARY KEY,
                device_name VARCHAR(100) UNIQUE NOT NULL,
                category_id INTEGER REFERENCES asset_categories(id_category) ON DELETE SET NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_master_devices_name ON master_devices(device_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_master_devices_category ON master_devices(category_id)")
        
        # Insert device data
        for device in DEVICES:
            cur.execute("""
                INSERT INTO master_devices (device_name)
                VALUES (%s)
                ON CONFLICT (device_name) DO NOTHING
            """, (device,))
        
        conn.commit()
        print(f"✓ Tabel master_devices berhasil dibuat dengan {len(DEVICES)} data device")
    except Exception as e:
        conn.rollback()
        print(f"Error creating master_devices table: {e}")

def create_master_materials_table(conn):
    """Membuat tabel master_materials"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS master_materials (
                id_material SERIAL PRIMARY KEY,
                material_name VARCHAR(100) UNIQUE NOT NULL,
                category_id INTEGER REFERENCES asset_categories(id_category) ON DELETE SET NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_master_materials_name ON master_materials(material_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_master_materials_category ON master_materials(category_id)")
        
        # Insert material data
        for material in MATERIALS:
            cur.execute("""
                INSERT INTO master_materials (material_name)
                VALUES (%s)
                ON CONFLICT (material_name) DO NOTHING
            """, (material,))
        
        conn.commit()
        print(f"✓ Tabel master_materials berhasil dibuat dengan {len(MATERIALS)} data material")
    except Exception as e:
        conn.rollback()
        print(f"Error creating master_materials table: {e}")

def create_master_receivers_table(conn):
    """Membuat tabel master_receivers"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS master_receivers (
                id_receiver SERIAL PRIMARY KEY,
                receiver_name VARCHAR(255) UNIQUE NOT NULL,
                department_id INTEGER REFERENCES departments(id_department) ON DELETE SET NULL,
                receiver_title VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_master_receivers_name ON master_receivers(receiver_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_master_receivers_title ON master_receivers(receiver_title)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_master_receivers_dept ON master_receivers(department_id)")
        
        conn.commit()
        print("✓ Tabel master_receivers berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating master_receivers table: {e}")

# ==================== TABEL DEVICES SCANNING ====================
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
    """Tabel DETAIL scanning item untuk Devices"""
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
                project_name VARCHAR(255),
                receiver_id INTEGER REFERENCES master_receivers(id_receiver) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep ON devices_scanning_items(preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_user ON devices_scanning_items(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_project ON devices_scanning_items(project_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_receiver ON devices_scanning_items(receiver_id)")
        conn.commit()
        print("✓ Tabel devices_scanning_items berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating devices_scanning_items table: {e}")

def create_devices_items_preparation_table(conn):
    """Tabel untuk menyimpan setiap item individual Devices"""
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
                status VARCHAR(50) DEFAULT 'pending',
                scanned_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scanned_at TIMESTAMP,
                department_id INTEGER REFERENCES departments(id_department) ON DELETE SET NULL,
                notes TEXT,
                project_name VARCHAR(255),
                receiver_id INTEGER REFERENCES master_receivers(id_receiver) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_scanning ON devices_items_preparation(scanning_item_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_prep ON devices_items_preparation(preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_user ON devices_items_preparation(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_serial ON devices_items_preparation(serial_number)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_project ON devices_items_preparation(project_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_devices_items_prep_receiver ON devices_items_preparation(receiver_id)")
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

# ==================== TABEL MATERIALS SCANNING ====================
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
    """Tabel DETAIL scanning item untuk Materials"""
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
                receiver_id INTEGER REFERENCES master_receivers(id_receiver) ON DELETE SET NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_prep ON materials_scanning_items(preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_user ON materials_scanning_items(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_receiver ON materials_scanning_items(receiver_id)")
        conn.commit()
        print("✓ Tabel materials_scanning_items berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating materials_scanning_items table: {e}")

def create_materials_items_preparation_table(conn):
    """Tabel untuk menyimpan setiap item individual Materials"""
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
                receiver_id INTEGER REFERENCES master_receivers(id_receiver) ON DELETE SET NULL,
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
        cur.execute("CREATE INDEX IF NOT EXISTS idx_materials_items_prep_receiver ON materials_items_preparation(receiver_id)")
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

# ==================== TABEL SCAN RESULTS ====================
def create_scan_results_devices_table(conn):
    """Tabel hasil scan untuk Devices"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS scan_results_devices (
                id_scan SERIAL PRIMARY KEY,
                item_preparation_id INTEGER REFERENCES devices_items_preparation(id_item_preparation) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scanned_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                scan_category VARCHAR(50),
                scan_value TEXT,
                serial_number VARCHAR(100),
                detection_data JSONB,
                is_valid BOOLEAN DEFAULT FALSE,
                status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                photo_data TEXT,
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_devices_item_prep ON scan_results_devices(item_preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_devices_user ON scan_results_devices(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_devices_scanned_by ON scan_results_devices(scanned_by)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_devices_status ON scan_results_devices(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_devices_serial ON scan_results_devices(serial_number)")
        conn.commit()
        print("✓ Tabel scan_results_devices berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating scan_results_devices table: {e}")

def create_scan_results_materials_table(conn):
    """Tabel hasil scan untuk Materials"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS scan_results_materials (
                id_scan SERIAL PRIMARY KEY,
                item_preparation_id INTEGER REFERENCES materials_items_preparation(id_item_preparation) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scanned_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                scan_category VARCHAR(50),
                scan_value TEXT,
                scan_code VARCHAR(100),
                detection_data JSONB,
                is_valid BOOLEAN DEFAULT FALSE,
                status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                photo_data TEXT,
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_materials_item_prep ON scan_results_materials(item_preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_materials_user ON scan_results_materials(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_materials_scanned_by ON scan_results_materials(scanned_by)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_materials_status ON scan_results_materials(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scan_results_materials_scan_code ON scan_results_materials(scan_code)")
        conn.commit()
        print("✓ Tabel scan_results_materials berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating scan_results_materials table: {e}")

# ==================== TABEL ASSETS DAN VALIDATIONS ====================
def create_validations_table(conn):
    """Tabel validations - verifikasi sebelum masuk ke assets (tanpa referensi ke assets dulu)"""
    try:
        cur = conn.cursor()
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS validations (
                id_validation SERIAL PRIMARY KEY,
                scan_id INTEGER REFERENCES scan_results_devices(id_scan) ON DELETE SET NULL,
                scan_material_id INTEGER REFERENCES scan_results_materials(id_scan) ON DELETE SET NULL,
                item_preparation_id INTEGER REFERENCES devices_items_preparation(id_item_preparation) ON DELETE SET NULL,
                material_item_preparation_id INTEGER REFERENCES materials_items_preparation(id_item_preparation) ON DELETE SET NULL,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                validation_status VARCHAR(50) DEFAULT 'pending',
                validation_notes TEXT,
                validated_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                validated_at TIMESTAMP,
                unique_code VARCHAR(100) UNIQUE,
                is_approved BOOLEAN DEFAULT FALSE,
                rejection_reason TEXT,
                receiver_name VARCHAR(255),
                receiver_title VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Index untuk performa query
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_scan ON validations(scan_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_scan_material ON validations(scan_material_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_item_prep ON validations(item_preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_material_item_prep ON validations(material_item_preparation_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_status ON validations(validation_status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_approved ON validations(is_approved)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_unique_code ON validations(unique_code)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_receiver_name ON validations(receiver_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_receiver_title ON validations(receiver_title)")
        
        conn.commit()
        print("✓ Tabel validations berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating validations table: {e}")

def create_assets_table(conn):
    """Tabel assets - data final setelah validasi (tanpa referensi ke validations dulu)"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS assets (
                id_assets SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
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
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_scan_code ON assets(scan_code)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_receiver ON assets(receiver_name)")
        conn.commit()
        print("✓ Tabel assets berhasil dibuat")
    except Exception as e:
        conn.rollback()
        print(f"Error creating assets table: {e}")

def add_validation_reference_to_assets(conn):
    """Menambahkan referensi ke validations setelah kedua tabel dibuat"""
    try:
        cur = conn.cursor()
        # Cek apakah kolom validation_id sudah ada
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'assets' AND column_name = 'validation_id'
        """)
        if not cur.fetchone():
            cur.execute("""
                ALTER TABLE assets 
                ADD COLUMN validation_id INTEGER REFERENCES validations(id_validation) ON DELETE SET NULL
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_assets_validation ON assets(validation_id)")
            conn.commit()
            print("✓ Referensi validation_id ditambahkan ke tabel assets")
    except Exception as e:
        conn.rollback()
        print(f"Error adding validation reference: {e}")

def add_asset_reference_to_validations(conn):
    """Menambahkan referensi ke assets setelah kedua tabel dibuat"""
    try:
        cur = conn.cursor()
        # Cek apakah kolom asset_id sudah ada
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'validations' AND column_name = 'asset_id'
        """)
        if not cur.fetchone():
            cur.execute("""
                ALTER TABLE validations 
                ADD COLUMN asset_id INTEGER REFERENCES assets(id_assets) ON DELETE SET NULL
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_asset ON validations(asset_id)")
            conn.commit()
            print("✓ Referensi asset_id ditambahkan ke tabel validations")
    except Exception as e:
        conn.rollback()
        print(f"Error adding asset reference: {e}")

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

# ==================== MAIN FUNCTION ====================
def create_all_tables():
    """Function utama untuk membuat semua tabel"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("🚀 Memulai migrasi database...")
        print("-" * 50)
        
        # Tabel master (tanpa dependencies)
        create_users_table(conn)
        create_asset_categories_table(conn)
        create_locations_table(conn)
        create_departments_table(conn)
        create_projects_table(conn)
        create_master_devices_table(conn)
        create_master_materials_table(conn)
        create_master_receivers_table(conn)
        
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
        
        # Tabel hasil scan
        create_scan_results_devices_table(conn)
        create_scan_results_materials_table(conn)
        
        # Tabel validations (tanpa foreign key ke assets dulu)
        create_validations_table(conn)
        
        # Tabel assets (tanpa foreign key ke validations dulu)
        create_assets_table(conn)
        
        # Tambahkan foreign keys setelah kedua tabel selesai dibuat
        add_validation_reference_to_assets(conn)
        add_asset_reference_to_validations(conn)
        
        # Tabel history_logs
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
        
        print("\n📋 Daftar tabel yang berhasil dibuat:")
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
        print("🗑️ Menghapus semua tabel...")
        cur = conn.cursor()
        
        tables_to_drop = [
            'history_logs',
            'validations',
            'assets',
            'scan_results_materials',
            'scan_results_devices',
            'materials_item_departments',
            'materials_items_preparation',
            'materials_scanning_items',
            'materials_scanning_preparations',
            'materials_uom',
            'devices_item_departments',
            'devices_items_preparation',
            'devices_scanning_items',
            'devices_scanning_preparations',
            'master_receivers',
            'master_materials',
            'master_devices',
            'projects',
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

if __name__ == "__main__":
    print("=" * 60)
    print("DATABASE MIGRATION TOOL")
    print("=" * 60)
    
    action = input("Do you want to (create) or (drop) tables? [create/drop]: ").strip().lower()
    
    if action == "create":
        create_all_tables()
    elif action == "drop":
        confirm = input("⚠️ This will delete ALL tables and data. Are you sure? (yes/no): ").strip().lower()
        if confirm == "yes":
            drop_all_tables()
        else:
            print("Operation cancelled.")
    else:
        print("Invalid action. Please choose 'create' or 'drop'")