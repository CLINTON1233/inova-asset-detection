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

def insert_departments():
    """Memasukkan data department dari data Excel ke database"""
    # Data department unik dari Excel (berdasarkan kolom DEPT)
    departments_data = [
        ("Secondee", "Secondee Department - Expatriate Staff"),
        ("QA & QC", "Quality Assurance & Quality Control Department"),
        ("IYM", "IYM Department"),
        ("Operation & Maintenance", "Operation & Maintenance Department"),
        ("Works", "Works Department"),
        ("Structure", "Structural Department"),
        ("HR & Admin", "Human Resources & Administration Department"),
        ("Security", "Security Department"),
        ("Procurement", "Procurement Department"),
        ("PMT Gamma", "PMT Gamma Department"),
        ("IT", "Information Technology Department"),
        ("Contract", "Contract Department"),
        ("HSE", "Health, Safety & Environment Department"),
        ("Marketing", "Marketing Department"),
        ("Finance", "Finance Department"),
        ("PMT Petrobas", "PMT Petrobas Department"),
        ("Engineering", "Engineering Department"),
        ("Shipwright", "Shipwright Department"),
        ("Piping & Outfitting", "Piping & Outfitting Department"),
        ("E&I and Automation", "Electrical & Instrumentation and Automation Department"),
        ("Machinery", "Machinery Department"),
        ("Planning", "Planning Department"),
        ("Warehouse", "Warehouse Department"),
        ("Blasting & Painting", "Blasting & Painting Department"),
        ("OM ELECTRICAL", "Operation Maintenance Electrical Department"),
        ("Canteen", "Canteen Department"),
        ("TRISEA", "TRISEA Department"),
        ("Sub Contractor PT HASKONING INDONESIA", "Sub Contractor Haskoning Indonesia"),
        ("Sub Contractor CASTLAB", "Sub Contractor CASTLAB"),
        ("Sub Contractor PT. HITEK", "Sub Contractor HITEK"),
        ("Sub Contractor NEXELITE", "Sub Contractor NEXELITE"),
        ("Subcon PT Ably Metal Indonesia", "Sub Contractor Ably Metal Indonesia"),
        ("SUBCONT PT. ALEXINDO BANGUN", "Sub Contractor Alexindo Bangun"),
        ("Subcon PT Citra Lautan Biru", "Sub Contractor Citra Lautan Biru"),
        ("Sub Contractor PT Batam Konektra Jaya", "Sub Contractor Batam Konektra Jaya"),
        ("Sub Contractor Lancang Kuning Sukses", "Sub Contractor Lancang Kuning Sukses"),
        ("Subcont PT International Paint Singapore Ltd", "Sub Contractor International Paint"),
        ("PT Jotun Indonesia", "PT Jotun Indonesia"),
        ("PT. ALLBEST MARINE", "PT Allbest Marine"),
        ("PT. Vinnex Coatindo", "PT Vinnex Coatindo"),
        ("Subcontractor Sarens", "Subcontractor Sarens"),
        ("PT Sindo Marine", "PT Sindo Marine"),
        ("GE", "GE Department"),
        ("Sub Contractor Jaya Bersama Alexindo", "Sub Contractor Jaya Bersama Alexindo"),
        ("SUBCONT PT WILLINDO LAUT PERKASA", "Sub Contractor Willindo Laut Perkasa"),
        ("SUBCONT PT LINK PANGESTU UTAMA", "Sub Contractor Link Pangestu Utama"),
        ("Sub Contractor (Alkatra)", "Sub Contractor Alkatra"),
        ("SUBCONT PT SANY", "Sub Contractor SANY"),
        ("Sub Contractor MECH FLEUR", "Sub Contractor Mech Fleur"),
        ("SUBCONT PT CITRA ADI SURYA", "Sub Contractor Citra Adi Surya"),
        ("SUBCONT RENTOKIL", "Sub Contractor Rentokil"),
        ("SUBCONT TOKO SINAR CAHAYA", "Sub Contractor Toko Sinar Cahaya"),
        ("SUBCONT PT SANPRO ENERGY", "Sub Contractor Sanpro Energy"),
        ("SUBCONT PT AMCOWELD INDONESIA", "Sub Contractor Amcoweld Indonesia"),
        ("PT UT Quality Indonesia", "PT UT Quality Indonesia"),
        ("SUBCONT PT GOODWILL ENGINEERING & INSPECTION", "Sub Contractor Goodwill Engineering"),
        ("Subcontractor PT Rol Lif Indonesia", "Sub Contractor Rol Lif Indonesia"),
        ("PT Adyawinsa Dinamika", "PT Adyawinsa Dinamika"),
        ("Internship", "Internship Department"),
        ("Yard Development", "Yard Development Department"),
        ("PMT Nederwiek-Beta", "PMT Nederwiek-Beta Department"),
        ("PMT Sofia", "PMT Sofia Department"),
        ("PMT Gamma", "PMT Gamma Department"),
        ("PMT Petrobas", "PMT Petrobas Department"),
        ("Secondee", "Secondee Department"),
    ]
    
    # Menghapus duplikat (menggunakan dictionary untuk unique berdasarkan department_name)
    unique_departments = {}
    for dept_name, dept_desc in departments_data:
        if dept_name not in unique_departments:
            unique_departments[dept_name] = dept_desc
    
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Truncate table
        cur.execute("TRUNCATE TABLE departments RESTART IDENTITY CASCADE")
        
        # Insert departments
        inserted_count = 0
        for dept_name, dept_desc in unique_departments.items():
            try:
                cur.execute("""
                    INSERT INTO departments (department_name, description)
                    VALUES (%s, %s)
                    ON CONFLICT (department_name) DO UPDATE 
                    SET description = EXCLUDED.description,
                        updated_at = CURRENT_TIMESTAMP
                """, (dept_name, dept_desc))
                inserted_count += 1
            except Exception as e:
                print(f"  Warning: Could not insert {dept_name}: {e}")
        
        conn.commit()
        print(f"✅ Berhasil memasukkan {inserted_count} data department unik!")
        
        # Reset sequence
        cur.execute("SELECT setval('departments_id_department_seq', (SELECT MAX(id_department) FROM departments))")
        conn.commit()
        
        return True
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error: {e}")
        return False
    finally:
        if conn:
            conn.close()

def get_department_id(conn, department_name):
    """Mendapatkan department_id berdasarkan nama department"""
    try:
        cur = conn.cursor()
        cur.execute("SELECT id_department FROM departments WHERE department_name = %s", (department_name,))
        result = cur.fetchone()
        if result:
            return result[0]
        return None
    except Exception as e:
        print(f"Error getting department_id: {e}")
        return None

if __name__ == "__main__":
    insert_departments()