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

def create_validations_table_safe(conn):
    """Membuat atau memperbarui tabel validations dengan aman (tidak menghapus data)"""
    try:
        cur = conn.cursor()
        
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'validations'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        if not table_exists:
            # Buat tabel baru
            cur.execute("""
                CREATE TABLE validations (
                    id_validation SERIAL PRIMARY KEY,
                    scan_id INTEGER REFERENCES scan_results_devices(id_scan) ON DELETE SET NULL,
                    scan_material_id INTEGER REFERENCES scan_results_materials(id_scan) ON DELETE SET NULL,
                    item_preparation_id INTEGER REFERENCES devices_items_preparation(id_item_preparation) ON DELETE SET NULL,
                    material_item_preparation_id INTEGER REFERENCES materials_items_preparation(id_item_preparation) ON DELETE SET NULL,
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
            print("✓ Tabel validations berhasil dibuat")
        else:
            print("✓ Tabel validations sudah ada, melakukan pengecekan kolom...")
        
        columns_to_check = [
            ('rejection_reason', 'TEXT'),
            ('is_approved', 'BOOLEAN DEFAULT FALSE'),
            ('validation_notes', 'TEXT'),
            ('validated_by', 'INTEGER REFERENCES users(id_user) ON DELETE SET NULL'),
            ('validated_at', 'TIMESTAMP'),
            ('unique_code', 'VARCHAR(100) UNIQUE'),
            ('asset_id', 'INTEGER REFERENCES assets(id_assets) ON DELETE SET NULL')
        ]
        
        for column_name, column_type in columns_to_check:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'validations' AND column_name = %s
                )
            """, (column_name,))
            column_exists = cur.fetchone()[0]
            
            if not column_exists:
                try:
                    cur.execute(sql.SQL("ALTER TABLE validations ADD COLUMN {} {}").format(
                        sql.Identifier(column_name),
                        sql.SQL(column_type)
                    ))
                    print(f"  ✓ Kolom {column_name} ditambahkan")
                except Exception as e:
                    print(f"  ⚠ Gagal menambahkan kolom {column_name}: {e}")
            else:
                print(f"  ✓ Kolom {column_name} sudah ada")
        
        indexes_to_check = [
            ('idx_validations_scan', 'scan_id'),
            ('idx_validations_scan_material', 'scan_material_id'),
            ('idx_validations_item_prep', 'item_preparation_id'),
            ('idx_validations_material_item_prep', 'material_item_preparation_id'),
            ('idx_validations_status', 'validation_status'),
            ('idx_validations_approved', 'is_approved')
        ]
        
        for index_name, column_name in indexes_to_check:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM pg_indexes 
                    WHERE indexname = %s
                )
            """, (index_name,))
            index_exists = cur.fetchone()[0]
            
            if not index_exists:
                try:
                    cur.execute(sql.SQL("CREATE INDEX {} ON validations ({})").format(
                        sql.Identifier(index_name),
                        sql.Identifier(column_name)
                    ))
                    print(f"  ✓ Index {index_name} ditambahkan")
                except Exception as e:
                    print(f"  ⚠ Gagal menambahkan index {index_name}: {e}")
            else:
                print(f"  ✓ Index {index_name} sudah ada")
        
        conn.commit()
        print("✓ Migrasi tabel validations selesai")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating/updating validations table: {e}")
        return False

def verify_validations_table(conn):
    """Verifikasi struktur tabel validations"""
    try:
        cur = conn.cursor()
        
        print("\n Verifikasi struktur tabel validations:")
        print("-" * 50)
        
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'validations'
            ORDER BY ordinal_position
        """)
        
        columns = cur.fetchall()
        if columns:
            print(f"{'Column Name':<30} {'Data Type':<20} {'Nullable':<10}")
            print("-" * 60)
            for col in columns:
                print(f"{col[0]:<30} {col[1]:<20} {col[2]:<10}")
        else:
            print("Tabel validations tidak ditemukan!")
            return False
        
        print("\n Statistik data validations:")
        cur.execute("SELECT COUNT(*) FROM validations")
        count = cur.fetchone()[0]
        print(f"Total records: {count}")
        
        if count > 0:
            cur.execute("""
                SELECT validation_status, COUNT(*) 
                FROM validations 
                GROUP BY validation_status
            """)
            status_stats = cur.fetchall()
            print("\nStatus distribution:")
            for status, stat_count in status_stats:
                print(f"  {status}: {stat_count}")
        
        return True
        
    except Exception as e:
        print(f"Error verifying validations table: {e}")
        return False

def add_validation_for_existing_scan_results(conn):
    """Menambahkan record validasi untuk scan results yang belum memiliki validasi"""
    try:
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                sd.id_scan,
                sd.item_preparation_id,
                sd.user_id,
                sd.scanned_by,
                sd.scanned_at,
                sd.serial_number
            FROM scan_results_devices sd
            LEFT JOIN validations v ON sd.id_scan = v.scan_id
            WHERE v.id_validation IS NULL
            AND sd.status != 'validated'
        """)
        
        device_scans = cur.fetchall()
    
        cur.execute("""
            SELECT 
                sm.id_scan,
                sm.item_preparation_id,
                sm.user_id,
                sm.scanned_by,
                sm.scanned_at,
                sm.scan_code
            FROM scan_results_materials sm
            LEFT JOIN validations v ON sm.id_scan = v.scan_material_id
            WHERE v.id_validation IS NULL
            AND sm.status != 'validated'
        """)
        
        material_scans = cur.fetchall()
        
        import random
        import string
        
        added_count = 0
  
        for scan in device_scans:
            scan_id = scan[0]
            item_prep_id = scan[1]
            user_id = scan[2] or 1
            
            unique_code = f"VAL-{datetime.now().strftime('%Y%m%d')}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"
            
            cur.execute("""
                INSERT INTO validations (
                    scan_id, item_preparation_id, user_id, validation_status, unique_code, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (unique_code) DO NOTHING
                RETURNING id_validation
            """, (scan_id, item_prep_id, user_id, 'pending', unique_code, datetime.now()))
            
            if cur.fetchone():
                added_count += 1
        
        for scan in material_scans:
            scan_id = scan[0]
            item_prep_id = scan[1]
            user_id = scan[2] or 1
            
            unique_code = f"VAL-{datetime.now().strftime('%Y%m%d')}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"
            
            cur.execute("""
                INSERT INTO validations (
                    scan_material_id, material_item_preparation_id, user_id, validation_status, unique_code, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (unique_code) DO NOTHING
                RETURNING id_validation
            """, (scan_id, item_prep_id, user_id, 'pending', unique_code, datetime.now()))
            
            if cur.fetchone():
                added_count += 1
        
        conn.commit()
        print(f"✓ Menambahkan {added_count} record validasi untuk scan results yang belum memiliki validasi")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error adding validations: {e}")
        return False

def run_migration():
    """Menjalankan migrasi tabel validations"""
    print("=" * 60)
    print("🚀 Memulai migrasi tabel validations")
    print("=" * 60)
    
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        from datetime import datetime
        
        # Step 1: Buat/update tabel validations
        print("\n Step 1: Membuat/Update tabel validations...")
        if not create_validations_table_safe(conn):
            return False
        
        # Step 2: Verifikasi struktur tabel
        print("\n Step 2: Verifikasi struktur tabel...")
        if not verify_validations_table(conn):
            return False
        
        # Step 3: Tambahkan validasi untuk scan results yang ada (opsional)
        print("\n Step 3: Menambahkan validasi untuk scan results yang ada...")
        add_validation_for_existing_scan_results(conn)
        
        print("\n" + "=" * 60)
        print("✅ Migrasi tabel validations selesai!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"Error during migration: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = run_migration()
    if not success:
        sys.exit(1)