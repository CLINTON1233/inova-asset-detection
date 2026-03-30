import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2 import sql
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

def get_category_id(conn, category_name):
    """Mendapatkan category_id dari asset_categories berdasarkan nama kategori"""
    try:
        cur = conn.cursor()
        cur.execute("SELECT id_category FROM asset_categories WHERE category_name = %s", (category_name,))
        result = cur.fetchone()
        if result:
            return result[0]
        return None
    except Exception as e:
        print(f"Error getting category_id: {e}")
        return None

def add_project_column_to_devices():
    """Menambahkan kolom project_name ke tabel devices_scanning_items"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek dan tambah kolom project_name ke devices_scanning_items
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='devices_scanning_items' AND column_name='project_name'
                ) THEN
                    ALTER TABLE devices_scanning_items 
                    ADD COLUMN project_name VARCHAR(255);
                END IF;
            END $$;
        """)
        
        conn.commit()
        print("✓ Project_name column added to devices_scanning_items")
        return True
        
    except Exception as e:
        print(f"Error adding project_name column to devices: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def add_receiver_fields_to_validations():
    """Menambahkan kolom receiver_name dan receiver_title ke tabel validations"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Tambah kolom receiver_name dan receiver_title ke validations
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='validations' AND column_name='receiver_name'
                ) THEN
                    ALTER TABLE validations 
                    ADD COLUMN receiver_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='validations' AND column_name='receiver_title'
                ) THEN
                    ALTER TABLE validations 
                    ADD COLUMN receiver_title VARCHAR(255);
                END IF;
            END $$;
        """)
        
        conn.commit()
        print("✓ Receiver fields added to validations table")
        return True
        
    except Exception as e:
        print(f"Error adding receiver fields to validations: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def add_project_field_to_devices_items_preparation():
    """Menambahkan kolom project_name ke tabel devices_items_preparation"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek dan tambah kolom project_name ke devices_items_preparation
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='devices_items_preparation' AND column_name='project_name'
                ) THEN
                    ALTER TABLE devices_items_preparation 
                    ADD COLUMN project_name VARCHAR(255);
                END IF;
            END $$;
        """)
        
        conn.commit()
        print("✓ Project_name column added to devices_items_preparation")
        return True
        
    except Exception as e:
        print(f"Error adding project_name column to devices_items_preparation: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def create_projects_table():
    """Membuat tabel projects untuk master data project"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek apakah tabel projects sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'projects'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        if not table_exists:
            print("Creating projects table...")
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
            print(f"✓ Projects table created with {len(PROJECTS)} projects")
        else:
            print("✓ Projects table already exists")
        
        return True
        
    except Exception as e:
        print(f"Error creating projects table: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def create_devices_master_table():
    """Membuat tabel master devices untuk dropdown dengan category dari asset_categories"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek apakah tabel master_devices sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'master_devices'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        if not table_exists:
            print("Creating master_devices table...")
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
            
            # Get category_id untuk Devices
            category_id = get_category_id(conn, 'Devices')
            
            if category_id:
                # Insert device data dengan category_id
                for device in DEVICES:
                    cur.execute("""
                        INSERT INTO master_devices (device_name, category_id)
                        VALUES (%s, %s)
                        ON CONFLICT (device_name) DO NOTHING
                    """, (device, category_id))
                conn.commit()
                print(f"✓ Master_devices table created with {len(DEVICES)} devices (category_id: {category_id})")
            else:
                print("⚠️ Warning: Category 'Devices' not found in asset_categories. Please ensure asset_categories table has 'Devices' category.")
                # Insert tanpa category_id
                for device in DEVICES:
                    cur.execute("""
                        INSERT INTO master_devices (device_name)
                        VALUES (%s)
                        ON CONFLICT (device_name) DO NOTHING
                    """, (device,))
                conn.commit()
                print(f"✓ Master_devices table created with {len(DEVICES)} devices (without category)")
        else:
            print("✓ Master_devices table already exists")
        
        return True
        
    except Exception as e:
        print(f"Error creating master_devices table: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def create_materials_master_table():
    """Membuat tabel master materials untuk dropdown dengan category dari asset_categories"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek apakah tabel master_materials sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'master_materials'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        if not table_exists:
            print("Creating master_materials table...")
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
            
            # Get category_id untuk Materials
            category_id = get_category_id(conn, 'Materials')
            
            if category_id:
                # Insert material data dengan category_id
                for material in MATERIALS:
                    cur.execute("""
                        INSERT INTO master_materials (material_name, category_id)
                        VALUES (%s, %s)
                        ON CONFLICT (material_name) DO NOTHING
                    """, (material, category_id))
                conn.commit()
                print(f"✓ Master_materials table created with {len(MATERIALS)} materials (category_id: {category_id})")
            else:
                print("⚠️ Warning: Category 'Materials' not found in asset_categories. Please ensure asset_categories table has 'Materials' category.")
                # Insert tanpa category_id
                for material in MATERIALS:
                    cur.execute("""
                        INSERT INTO master_materials (material_name)
                        VALUES (%s)
                        ON CONFLICT (material_name) DO NOTHING
                    """, (material,))
                conn.commit()
                print(f"✓ Master_materials table created with {len(MATERIALS)} materials (without category)")
        else:
            print("✓ Master_materials table already exists")
        
        return True
        
    except Exception as e:
        print(f"Error creating master_materials table: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def create_receivers_master_table():
    """Membuat tabel master receivers untuk dropdown name dan title dengan relasi department"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek apakah tabel master_receivers sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'master_receivers'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        if not table_exists:
            print("Creating master_receivers table...")
            # Buat tabel dengan department_id sebagai foreign key
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
            print("✓ Master_receivers table created with department relation")
        else:
            # Cek dan tambah kolom department_id jika belum ada
            cur.execute("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='master_receivers' AND column_name='department_id'
                    ) THEN
                        ALTER TABLE master_receivers 
                        ADD COLUMN department_id INTEGER REFERENCES departments(id_department);
                    END IF;
                END $$;
            """)
            conn.commit()
            print("✓ Master_receivers table updated with department relation")
        
        return True
        
    except Exception as e:
        print(f"Error creating master_receivers table: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()
            
def update_existing_devices_items_with_project():
    """Update existing devices items dengan project_name default"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Update devices_scanning_items yang belum memiliki project_name
        cur.execute("""
            UPDATE devices_scanning_items 
            SET project_name = 'Gamma'
            WHERE project_name IS NULL
        """)
        
        # Update devices_items_preparation yang belum memiliki project_name
        cur.execute("""
            UPDATE devices_items_preparation 
            SET project_name = 'Gamma'
            WHERE project_name IS NULL
        """)
        
        conn.commit()
        print("✓ Existing devices items updated with default project_name")
        return True
        
    except Exception as e:
        print(f"Error updating existing devices items: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def run_full_migration():
    """Menjalankan semua migrasi scanning preparation"""
    print("="*60)
    print("SCANNING PREPARATION MIGRATION")
    print("="*60)
    
    # Step 1: Buat tabel master projects
    if not create_projects_table():
        print("❌ Failed to create projects table")
        return False
    
    # Step 2: Buat tabel master devices
    if not create_devices_master_table():
        print("❌ Failed to create master_devices table")
        return False
    
    # Step 3: Buat tabel master materials
    if not create_materials_master_table():
        print("❌ Failed to create master_materials table")
        return False
    
    # Step 4: Buat tabel master receivers
    if not create_receivers_master_table():
        print("❌ Failed to create master_receivers table")
        return False
    
    # Step 5: Tambah kolom project_name ke devices_scanning_items
    if not add_project_column_to_devices():
        print("⚠️ Warning: Could not add project_name column to devices")
    
    # Step 6: Tambah kolom project_name ke devices_items_preparation
    if not add_project_field_to_devices_items_preparation():
        print("⚠️ Warning: Could not add project_name column to devices_items_preparation")
    
    # Step 7: Tambah receiver fields ke validations
    if not add_receiver_fields_to_validations():
        print("⚠️ Warning: Could not add receiver fields to validations")
    
    # Step 8: Update existing data
    if not update_existing_devices_items_with_project():
        print("⚠️ Warning: Could not update existing devices items")
    
    print("\n" + "="*60)
    print("✅ SCANNING PREPARATION MIGRATION COMPLETED SUCCESSFULLY!")
    print("="*60)
    
    return True

def rollback_migration():
    """Rollback semua migrasi scanning preparation"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        print("Rolling back scanning preparation migration...")
        
        # Hapus tabel master (opsional, hati-hati)
        tables_to_drop = [
            'master_receivers',
            'master_materials',
            'master_devices',
            'projects'
        ]
        
        for table in tables_to_drop:
            cur.execute(sql.SQL("DROP TABLE IF EXISTS {} CASCADE").format(sql.Identifier(table)))
            print(f"   ✓ Dropped table {table}")
        
        # Hapus kolom yang ditambahkan (opsional)
        cur.execute("""
            ALTER TABLE devices_scanning_items DROP COLUMN IF EXISTS project_name;
            ALTER TABLE devices_items_preparation DROP COLUMN IF EXISTS project_name;
            ALTER TABLE validations DROP COLUMN IF EXISTS receiver_name;
            ALTER TABLE validations DROP COLUMN IF EXISTS receiver_title;
        """)
        
        conn.commit()
        print("✅ Rollback completed!")
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
    print("="*50)
    print("SCANNING PREPARATION MIGRATION TOOL")
    print("="*50)
    
    action = input("Do you want to (migrate) or (rollback)? [migrate/rollback]: ").strip().lower()
    
    if action == "migrate":
        run_full_migration()
    elif action == "rollback":
        rollback_migration()
    else:
        print("Invalid action. Please choose 'migrate' or 'rollback'")