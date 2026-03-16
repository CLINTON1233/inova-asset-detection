import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import psycopg2
from config import DB_CONFIG

def seed_asset_categories():
    """Menambahkan data awal ke tabel asset_categories"""
    conn = None
    try:
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            database=DB_CONFIG['database'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port']
        )
        cur = conn.cursor()
        
        # Insert categories
        categories = [
            ('Devices',),
            ('Materials',)
        ]
        
        for category in categories:
            cur.execute("""
                INSERT INTO asset_categories (category_name)
                VALUES (%s)
                ON CONFLICT (category_name) DO NOTHING
            """, category)
        
        conn.commit()
        print("✅ Data kategori berhasil ditambahkan!")
        
        # Tampilkan hasil
        cur.execute("SELECT * FROM asset_categories")
        rows = cur.fetchall()
        print("\n Data asset_categories:")
        for row in rows:
            print(f"   - ID: {row[0]}, Name: {row[1]}")
            
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    seed_asset_categories()