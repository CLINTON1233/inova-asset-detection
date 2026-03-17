import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from config import DB_CONFIG

def insert_departments():
    """Memasukkan data department ke database"""
    departments_data = [
        (1, "IT", "Information Technology Department"),
        (2, "HR", "Human Resources Department"),
        (3, "Finance", "Finance Department"),
        (4, "Contract", "Contract Department"),
        (5, "Procurement", "Procurement Department"),
        (6, "Marketing", "Marketing Department"),
        (7, "Engineering", "Engineering Department"),
        (8, "HSE", "Health, Safety & Environment Department"),
        (9, "Security & IYM", "Security & IYM Department"),
        (10, "Planning", "Planning Department"),
        (11, "Warehouse", "Warehouse Department"),
        (12, "Work & Shipwright", "Work & Shipwright Department"),
        (13, "Structure", "Structure Department"),
        (14, "Piping", "Piping Department"),
        (15, "E & I", "Electrical & Instrumentation Department"),
        (16, "Machinery", "Machinery Department"),
        (17, "QA/QC", "Quality Assurance/Quality Control Department"),
        (18, "PMT GAMMA", "PMT GAMMA Department"),
        (19, "PMT NEDERWIEK2", "PMT NEDERWIEK2 Department"),
        (20, "PMT FPSO PETROBRAS", "PMT FPSO PETROBRAS Department"),
    ]
    
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("TRUNCATE departments RESTART IDENTITY CASCADE")
        
        for dept in departments_data:
            cur.execute("""
                INSERT INTO departments (id_department, department_name, description)
                VALUES (%s, %s, %s)
                ON CONFLICT (id_department) DO UPDATE 
                SET department_name = EXCLUDED.department_name,
                    description = EXCLUDED.description,
                    updated_at = CURRENT_TIMESTAMP
            """, dept)
        
        conn.commit()
        print(f"✅ Berhasil memasukkan {len(departments_data)} data department!")
        
        # Reset sequence
        cur.execute("SELECT setval('departments_id_department_seq', (SELECT MAX(id_department) FROM departments))")
        conn.commit()
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    insert_departments()