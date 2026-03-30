# migrate_add_receiver_id.py
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

def add_receiver_id_columns():
    """Menambahkan kolom receiver_id ke tabel devices dan materials"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Tambah kolom receiver_id ke devices_scanning_items
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='devices_scanning_items' AND column_name='receiver_id'
                ) THEN
                    ALTER TABLE devices_scanning_items 
                    ADD COLUMN receiver_id INTEGER REFERENCES master_receivers(id_receiver) ON DELETE SET NULL;
                    CREATE INDEX IF NOT EXISTS idx_devices_items_receiver ON devices_scanning_items(receiver_id);
                END IF;
            END $$;
        """)
        
        # Tambah kolom receiver_id ke devices_items_preparation
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='devices_items_preparation' AND column_name='receiver_id'
                ) THEN
                    ALTER TABLE devices_items_preparation 
                    ADD COLUMN receiver_id INTEGER REFERENCES master_receivers(id_receiver) ON DELETE SET NULL;
                    CREATE INDEX IF NOT EXISTS idx_devices_items_prep_receiver ON devices_items_preparation(receiver_id);
                END IF;
            END $$;
        """)
        
        # Tambah kolom receiver_id ke materials_scanning_items
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='materials_scanning_items' AND column_name='receiver_id'
                ) THEN
                    ALTER TABLE materials_scanning_items 
                    ADD COLUMN receiver_id INTEGER REFERENCES master_receivers(id_receiver) ON DELETE SET NULL;
                    CREATE INDEX IF NOT EXISTS idx_materials_items_receiver ON materials_scanning_items(receiver_id);
                END IF;
            END $$;
        """)
        
        # Tambah kolom receiver_id ke materials_items_preparation
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='materials_items_preparation' AND column_name='receiver_id'
                ) THEN
                    ALTER TABLE materials_items_preparation 
                    ADD COLUMN receiver_id INTEGER REFERENCES master_receivers(id_receiver) ON DELETE SET NULL;
                    CREATE INDEX IF NOT EXISTS idx_materials_items_prep_receiver ON materials_items_preparation(receiver_id);
                END IF;
            END $$;
        """)
        
        conn.commit()
        print("✓ Kolom receiver_id berhasil ditambahkan ke semua tabel!")
        return True
        
    except Exception as e:
        print(f"Error adding receiver_id columns: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("="*50)
    print("ADDING RECEIVER_ID COLUMNS")
    print("="*50)
    
    if add_receiver_id_columns():
        print("✅ Migration completed!")
    else:
        print("❌ Migration failed!")