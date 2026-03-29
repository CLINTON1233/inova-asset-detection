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

def create_validations_table():
    """Membuat tabel validations dengan struktur yang sederhana dan selaras"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Cek apakah tabel sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'validations'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            print("Table 'validations' already exists, checking columns...")
            
            # Cek dan tambah kolom jika diperlukan
            required_columns = {
                'unique_code': 'VARCHAR(100)',
                'validation_status': 'VARCHAR(50) DEFAULT \'pending\'',
                'validation_notes': 'TEXT',
                'validated_at': 'TIMESTAMP',
                'validated_by': 'INTEGER',
                'is_approved': 'BOOLEAN DEFAULT FALSE',
                'rejection_reason': 'TEXT'
            }
            
            for col_name, col_type in required_columns.items():
                cur.execute(f"""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'validations' AND column_name = '{col_name}'
                    )
                """)
                col_exists = cur.fetchone()[0]
                
                if not col_exists:
                    print(f"  Adding column: {col_name}")
                    cur.execute(f"ALTER TABLE validations ADD COLUMN {col_name} {col_type}")
            
            conn.commit()
            print("✓ Validations table updated successfully")
        else:
            print("Creating validations table...")
            
            # Buat tabel validations dengan struktur sederhana
            cur.execute("""
                CREATE TABLE IF NOT EXISTS validations (
                    id_validation SERIAL PRIMARY KEY,
                    scan_id INTEGER REFERENCES scan_results_devices(id_scan) ON DELETE SET NULL,
                    scan_material_id INTEGER REFERENCES scan_results_materials(id_scan) ON DELETE SET NULL,
                    item_preparation_id INTEGER REFERENCES devices_items_preparation(id_item_preparation) ON DELETE SET NULL,
                    material_item_preparation_id INTEGER REFERENCES materials_items_preparation(id_item_preparation) ON DELETE SET NULL,
                    user_id INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                    asset_id INTEGER REFERENCES assets(id_assets) ON DELETE SET NULL,
                    unique_code VARCHAR(100),
                    validation_status VARCHAR(50) DEFAULT 'pending',
                    validation_notes TEXT,
                    validated_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                    validated_at TIMESTAMP,
                    is_approved BOOLEAN DEFAULT FALSE,
                    rejection_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Buat indexes
            cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_scan ON validations(scan_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_scan_material ON validations(scan_material_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_status ON validations(validation_status)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_validations_unique_code ON validations(unique_code)")
            
            conn.commit()
            print("✓ Validations table created successfully")
        
        return True
        
    except Exception as e:
        print(f"Error creating validations table: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def migrate_existing_scan_results():
    """Migrasi data scan results yang sudah ada ke tabel validations"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        print("\n" + "="*50)
        print("MIGRATING EXISTING SCAN RESULTS TO VALIDATIONS")
        print("="*50)
        
        # 1. Migrasi device scan results yang sudah di-submit
        print("\n1. Migrating device scan results...")
        cur.execute("""
            SELECT 
                sr.id_scan,
                sr.item_preparation_id,
                sr.user_id,
                sr.status,
                sr.serial_number,
                ip.preparation_id,
                sp.checking_number
            FROM scan_results_devices sr
            LEFT JOIN devices_items_preparation ip ON sr.item_preparation_id = ip.id_item_preparation
            LEFT JOIN devices_scanning_preparations sp ON ip.preparation_id = sp.id_preparation
            WHERE sr.status = 'submitted'
            AND NOT EXISTS (
                SELECT 1 FROM validations v WHERE v.scan_id = sr.id_scan
            )
        """)
        
        device_results = cur.fetchall()
        device_count = 0
        
        for result in device_results:
            unique_code = result['checking_number'] or f"VAL-{result['id_scan']}"
            cur.execute("""
                INSERT INTO validations (
                    scan_id, item_preparation_id, user_id, unique_code, 
                    validation_status, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                result['id_scan'],
                result['item_preparation_id'],
                result['user_id'],
                unique_code,
                'pending',
                datetime.now()
            ))
            device_count += 1
        
        print(f"   ✓ Migrated {device_count} device scan results")
        
        # 2. Migrasi material scan results yang sudah di-submit
        print("\n2. Migrating material scan results...")
        cur.execute("""
            SELECT 
                sr.id_scan,
                sr.item_preparation_id,
                sr.user_id,
                sr.status,
                sr.scan_code,
                ip.preparation_id,
                sp.checking_number
            FROM scan_results_materials sr
            LEFT JOIN materials_items_preparation ip ON sr.item_preparation_id = ip.id_item_preparation
            LEFT JOIN materials_scanning_preparations sp ON ip.preparation_id = sp.id_preparation
            WHERE sr.status = 'submitted'
            AND NOT EXISTS (
                SELECT 1 FROM validations v WHERE v.scan_material_id = sr.id_scan
            )
        """)
        
        material_results = cur.fetchall()
        material_count = 0
        
        for result in material_results:
            unique_code = result['checking_number'] or f"VAL-{result['id_scan']}"
            cur.execute("""
                INSERT INTO validations (
                    scan_material_id, material_item_preparation_id, user_id, unique_code,
                    validation_status, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                result['id_scan'],
                result['item_preparation_id'],
                result['user_id'],
                unique_code,
                'pending',
                datetime.now()
            ))
            material_count += 1
        
        print(f"   ✓ Migrated {material_count} material scan results")
        
        conn.commit()
        
        print("\n" + "-"*50)
        print(f"✅ Migration completed!")
        print(f"   Total device validations: {device_count}")
        print(f"   Total material validations: {material_count}")
        print(f"   Total: {device_count + material_count} validations")
        
        return True
        
    except Exception as e:
        print(f"Error migrating scan results: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def add_validation_status_column():
    """Menambahkan kolom validation_status ke tabel yang membutuhkan"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            return False
        
        cur = conn.cursor()
        
        # Tambah kolom validation_status ke devices_scanning_preparations
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='devices_scanning_preparations' AND column_name='validation_status'
                ) THEN
                    ALTER TABLE devices_scanning_preparations 
                    ADD COLUMN validation_status VARCHAR(50) DEFAULT 'pending';
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='materials_scanning_preparations' AND column_name='validation_status'
                ) THEN
                    ALTER TABLE materials_scanning_preparations 
                    ADD COLUMN validation_status VARCHAR(50) DEFAULT 'pending';
                END IF;
            END $$;
        """)
        
        conn.commit()
        print("✓ Validation status columns added to preparation tables")
        return True
        
    except Exception as e:
        print(f"Error adding validation status columns: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def run_full_migration():
    """Menjalankan semua migrasi validations"""
    print("="*60)
    print("VALIDATIONS TABLE MIGRATION")
    print("="*60)
    
    # Step 1: Buat tabel validations
    if not create_validations_table():
        print("❌ Failed to create validations table")
        return False
    
    # Step 2: Tambah kolom validation_status ke preparation tables
    if not add_validation_status_column():
        print("⚠️ Warning: Could not add validation status columns")
    
    # Step 3: Migrasi data existing
    if not migrate_existing_scan_results():
        print("⚠️ Warning: Could not migrate existing data")
    
    print("\n" + "="*60)
    print("✅ VALIDATIONS MIGRATION COMPLETED SUCCESSFULLY!")
    print("="*60)
    
    return True

def rollback_validations():
    """Rollback tabel validations"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        print("Rolling back validations table...")
        
        # Hapus tabel validations
        cur.execute("DROP TABLE IF EXISTS validations CASCADE")
        
        # Hapus kolom validation_status dari preparation tables
        cur.execute("""
            ALTER TABLE devices_scanning_preparations DROP COLUMN IF EXISTS validation_status;
            ALTER TABLE materials_scanning_preparations DROP COLUMN IF EXISTS validation_status;
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
    print("VALIDATIONS MIGRATION TOOL")
    print("="*50)
    
    action = input("Do you want to (migrate) or (rollback)? [migrate/rollback]: ").strip().lower()
    
    if action == "migrate":
        run_full_migration()
    elif action == "rollback":
        rollback_validations()
    else:
        print("Invalid action. Please choose 'migrate' or 'rollback'")