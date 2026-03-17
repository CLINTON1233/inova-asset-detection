import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from config import DB_CONFIG

def insert_locations():
    """Memasukkan data lokasi ke database"""
    locations_data = [
        (1, "Main Office Lv1", "Office"),
        (2, "Main Office Lv2", "Office"),
        (3, "Main Office Lv3", "Office"),
        (4, "Engineering Office Lv1", "Office"),
        (5, "Engineering Office Lv2", "Office"),
        (6, "Engineering Office Lv3", "Office"),
        (7, "Engineering Office Lv4", "Office"),
        (8, "PMT 3", "Office"),
        (9, "PMT 2", "Office"),
        (10, "Site Office 1", "Office"),
        (11, "Site Office 2", "Office"),
        (12, "Site Office 3", "Office"),
        (13, "Training Center", "Facility"),
        (14, "Clinic", "Facility"),
    ]
    
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Hapus data lama (opsional)
        cur.execute("TRUNCATE locations RESTART IDENTITY CASCADE")
        
        # Insert data baru
        for loc in locations_data:
            cur.execute("""
                INSERT INTO locations (id_location, location_name, description)
                VALUES (%s, %s, %s)
                ON CONFLICT (id_location) DO UPDATE 
                SET location_name = EXCLUDED.location_name,
                    description = EXCLUDED.description,
                    updated_at = CURRENT_TIMESTAMP
            """, loc)
        
        conn.commit()
        print(f"✅ Berhasil memasukkan {len(locations_data)} data lokasi!")
        
        # Reset sequence
        cur.execute("SELECT setval('locations_id_location_seq', (SELECT MAX(id_location) FROM locations))")
        conn.commit()
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    insert_locations()