import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
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

def create_reports_table(conn):
    """Tabel untuk menyimpan laporan pengecekan aset"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS asset_reports (
                id_report SERIAL PRIMARY KEY,
                report_code VARCHAR(50) UNIQUE NOT NULL,
                report_type VARCHAR(20) NOT NULL,
                report_date DATE NOT NULL,
                report_end_date DATE,
                total_scans INTEGER DEFAULT 0,
                valid_scans INTEGER DEFAULT 0,
                error_scans INTEGER DEFAULT 0,
                pending_scans INTEGER DEFAULT 0,
                devices_count INTEGER DEFAULT 0,
                materials_count INTEGER DEFAULT 0,
                locations_count INTEGER DEFAULT 0,
                users_count INTEGER DEFAULT 0,
                success_rate DECIMAL(5,2) DEFAULT 0,
                avg_validation_time DECIMAL(10,2) DEFAULT 0,
                report_data JSONB,
                generated_by INTEGER REFERENCES users(id_user) ON DELETE SET NULL,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_reports_code ON asset_reports(report_code)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_reports_date ON asset_reports(report_date)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_reports_type ON asset_reports(report_type)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON asset_reports(generated_by)")
        conn.commit()
        print("✓ Tabel asset_reports berhasil dibuat")
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error creating asset_reports table: {e}")
        return False

def create_report_details_table(conn):
    """Tabel untuk detail items dalam laporan"""
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS report_items (
                id_report_item SERIAL PRIMARY KEY,
                report_id INTEGER REFERENCES asset_reports(id_report) ON DELETE CASCADE,
                scan_id VARCHAR(100),
                asset_code VARCHAR(100),
                asset_name VARCHAR(255),
                asset_type VARCHAR(100),
                category VARCHAR(50),
                location_name VARCHAR(255),
                serial_or_code VARCHAR(100),
                status VARCHAR(50),
                scan_date DATE,
                scan_time TIME,
                verified_by_name VARCHAR(255),
                department_name VARCHAR(255),
                validation_time VARCHAR(20),
                unique_code VARCHAR(100),
                scan_method VARCHAR(50),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_report_items_report ON report_items(report_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_report_items_status ON report_items(status)")
        conn.commit()
        print("✓ Tabel report_items berhasil dibuat")
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error creating report_items table: {e}")
        return False

def generate_sample_report_data(conn):
    """Generate sample report data dari data yang sudah ada di database"""
    try:
        cur = conn.cursor()
        
        # Cek apakah sudah ada data
        cur.execute("SELECT COUNT(*) FROM asset_reports")
        count = cur.fetchone()[0]
        
        if count > 0:
            print("✓ Data laporan sudah ada, skip generate sample data")
            return True
        
        # Ambil data dari validations, scan_results, dan assets
        cur.execute("""
            SELECT 
                v.id_validation,
                v.unique_code,
                v.validation_status,
                v.created_at,
                v.validated_at,
                COALESCE(v.scan_id, v.scan_material_id) as scan_id,
                CASE 
                    WHEN v.scan_id IS NOT NULL THEN 'device'
                    WHEN v.scan_material_id IS NOT NULL THEN 'material'
                    ELSE 'unknown'
                END as validation_type,
                srd.serial_number,
                srd.scan_value as device_name,
                srm.scan_code,
                srm.scan_value as material_name,
                dsp.checking_name as device_checking_name,
                msp.checking_name as material_checking_name,
                l.location_name,
                u.username as created_by_name,
                vu.username as validated_by_name
            FROM validations v
            LEFT JOIN scan_results_devices srd ON v.scan_id = srd.id_scan
            LEFT JOIN scan_results_materials srm ON v.scan_material_id = srm.id_scan
            LEFT JOIN devices_items_preparation dip ON v.item_preparation_id = dip.id_item_preparation
            LEFT JOIN materials_items_preparation mip ON v.material_item_preparation_id = mip.id_item_preparation
            LEFT JOIN devices_scanning_preparations dsp ON dip.preparation_id = dsp.id_preparation
            LEFT JOIN materials_scanning_preparations msp ON mip.preparation_id = msp.id_preparation
            LEFT JOIN locations l ON COALESCE(dsp.location_id, msp.location_id) = l.id_location
            LEFT JOIN users u ON v.user_id = u.id_user
            LEFT JOIN users vu ON v.validated_by = vu.id_user
            ORDER BY v.created_at DESC
        """)
        
        validations = cur.fetchall()
        
        if not validations:
            print("⚠️ Tidak ada data validasi untuk generate sample report")
            return True
        
        # Group by date
        reports_by_date = {}
        for val in validations:
            created_date = val[3].date() if val[3] else None
            if not created_date:
                continue
                
            date_str = created_date.strftime('%Y-%m-%d')
            if date_str not in reports_by_date:
                reports_by_date[date_str] = {
                    'total_scans': 0,
                    'valid_scans': 0,
                    'error_scans': 0,
                    'pending_scans': 0,
                    'devices_count': 0,
                    'materials_count': 0,
                    'locations': set(),
                    'users': set(),
                    'items': []
                }
            
            report = reports_by_date[date_str]
            report['total_scans'] += 1
            
            status = val[2]  # validation_status
            if status == 'approved':
                report['valid_scans'] += 1
            elif status == 'rejected':
                report['error_scans'] += 1
            else:
                report['pending_scans'] += 1
            
            if val[7] == 'device':  # validation_type
                report['devices_count'] += 1
            else:
                report['materials_count'] += 1
            
            if val[12]:  # location_name
                report['locations'].add(val[12])
            
            if val[14]:  # created_by_name
                report['users'].add(val[14])
            
            # Item detail
            item = {
                'scan_id': val[5],
                'asset_code': val[1] if val[1] else f"SCAN-{val[5]}" if val[5] else None,
                'asset_name': val[8] or val[10] or '-',
                'asset_type': 'Device' if val[7] == 'device' else 'Material',
                'category': 'Perangkat' if val[7] == 'device' else 'Material',
                'location_name': val[12] or '-',
                'serial_or_code': val[9] or val[11] or '-',
                'status': 'Valid' if status == 'approved' else ('Error' if status == 'rejected' else 'Pending'),
                'scan_date': created_date.strftime('%Y-%m-%d'),
                'scan_time': val[3].strftime('%H:%M:%S') if val[3] else '-',
                'verified_by_name': val[15] or val[14] or 'System',
                'department_name': '-',
                'validation_time': '-',
                'unique_code': val[1] or '-',
                'scan_method': 'Auto Scan',
                'notes': ''
            }
            report['items'].append(item)
        
        # Insert ke asset_reports
        import random
        import string
        
        for date_str, report_data in reports_by_date.items():
            report_code = f"RPT-{date_str.replace('-', '')}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"
            
            success_rate = (report_data['valid_scans'] / report_data['total_scans'] * 100) if report_data['total_scans'] > 0 else 0
            
            cur.execute("""
                INSERT INTO asset_reports (
                    report_code, report_type, report_date, total_scans,
                    valid_scans, error_scans, pending_scans,
                    devices_count, materials_count, locations_count, users_count,
                    success_rate, report_data, generated_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_report
            """, (
                report_code,
                'daily',
                date_str,
                report_data['total_scans'],
                report_data['valid_scans'],
                report_data['error_scans'],
                report_data['pending_scans'],
                report_data['devices_count'],
                report_data['materials_count'],
                len(report_data['locations']),
                len(report_data['users']),
                success_rate,
                '[]',
                1  # user_id default
            ))
            
            report_id = cur.fetchone()[0]
            
            # Insert ke report_items
            for item in report_data['items']:
                cur.execute("""
                    INSERT INTO report_items (
                        report_id, scan_id, asset_code, asset_name, asset_type,
                        category, location_name, serial_or_code, status,
                        scan_date, scan_time, verified_by_name, department_name,
                        validation_time, unique_code, scan_method, notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    report_id,
                    item['scan_id'],
                    item['asset_code'],
                    item['asset_name'],
                    item['asset_type'],
                    item['category'],
                    item['location_name'],
                    item['serial_or_code'],
                    item['status'],
                    item['scan_date'],
                    item['scan_time'],
                    item['verified_by_name'],
                    item['department_name'],
                    item['validation_time'],
                    item['unique_code'],
                    item['scan_method'],
                    item['notes']
                ))
        
        conn.commit()
        print(f"✓ Sample report data generated: {len(reports_by_date)} reports")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error generating sample report data: {e}")
        return False

def migrate_reports():
    """Function utama untuk migrasi tabel reports"""
    conn = get_connection()
    if not conn:
        print("Gagal terhubung ke database!")
        return False
    
    try:
        print("🚀 Memulai migrasi tabel Reports...")
        print("-" * 50)
        
        # Buat tabel
        if not create_reports_table(conn):
            return False
        
        if not create_report_details_table(conn):
            return False
        
        # Generate sample data dari existing data
        generate_sample_report_data(conn)
        
        print("-" * 50)
        print("✅ Migrasi tabel Reports selesai!")
        
        # List tabel yang berhasil dibuat
        cur = conn.cursor()
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('asset_reports', 'report_items')
            ORDER BY table_name
        """)
        tables = cur.fetchall()
        
        print("\n📋 Tabel yang berhasil dibuat/diperbarui:")
        for table in tables:
            print(f"   - {table[0]}")
        
        return True
        
    except Exception as e:
        print(f"Error during migration: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("REPORTS TABLE MIGRATION")
    print("=" * 60)
    
    confirm = input("⚠️ This will add reports tables to your database. Continue? (yes/no): ").strip().lower()
    
    if confirm == "yes":
        migrate_reports()
    else:
        print("Operation cancelled.")