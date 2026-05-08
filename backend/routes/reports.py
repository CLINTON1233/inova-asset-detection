from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime, timedelta
import traceback
import random
import string
import re

reports_bp = Blueprint('reports', __name__)

def get_conn():
    return get_db_connection()

def generate_report_code():
    """Generate unique report code format: RPT-YYYYMMDD-XXXX"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"RPT-{date_str}-{random_chars}"

# ==================== FUNGSI BARU UNTUK WEEKLY ====================
def get_week_range(year, week_num):
    """
    Mendapatkan range tanggal untuk minggu tertentu (ISO week)
    Minggu dimulai dari Senin dan berakhir Minggu
    """
    # Cari hari Kamis di minggu tersebut (ISO week definition)
    first_day_of_year = datetime(year, 1, 1)
    # Cari hari Kamis pertama di tahun itu
    days_to_first_thursday = (3 - first_day_of_year.weekday()) % 7
    first_thursday = first_day_of_year + timedelta(days=days_to_first_thursday)
    # Minggu 1 adalah minggu yang berisi Kamis pertama
    week1_thursday = first_thursday
    # Target minggu
    target_thursday = week1_thursday + timedelta(weeks=week_num - 1)
    # Senin = Kamis - 3 hari
    start_date = target_thursday - timedelta(days=3)
    # Minggu = Senin + 6 hari
    end_date = start_date + timedelta(days=6)
    return start_date, end_date

# Tambahkan fungsi ini setelah fungsi get_week_range()

def get_weeks_in_month(year, month):
    """
    Mendapatkan semua minggu (ISO week) yang berada dalam bulan tertentu
    """
    from datetime import datetime, timedelta
    
    # Tanggal pertama bulan
    first_date = datetime(year, month, 1)
    # Tanggal terakhir bulan
    if month == 12:
        last_date = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_date = datetime(year, month + 1, 1) - timedelta(days=1)
    
    weeks = set()
    current_date = first_date
    
    while current_date <= last_date:
        week_num = current_date.isocalendar()[1]
        week_year = current_date.isocalendar()[0]
        weeks.add((week_year, week_num))
        current_date += timedelta(days=7)
    
    return weeks

def sync_verification_status(report):
    """
    Sinkronisasi status verifikasi antara monthly dan weekly reports
    """
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        period_type = report.get('period_type')
        period_key = report.get('period_key')
        verification_status = report.get('verification_status')
        verification_notes = report.get('verification_notes')
        verified_by = report.get('verified_by')
        
        if period_type == 'monthly':
            # Parse year dan month dari period_key (format: YYYY-MM)
            match = re.match(r'(\d+)-(\d+)', period_key)
            if match:
                year = int(match.group(1))
                month = int(match.group(2))
                
                # Dapatkan semua minggu dalam bulan ini
                weeks = get_weeks_in_month(year, month)
                
                # Update semua weekly report dalam bulan ini
                for week_year, week_num in weeks:
                    week_key = f"{week_year}-W{week_num:02d}"
                    cur.execute("""
                        UPDATE reports 
                        SET verification_status = %s,
                            verification_notes = %s,
                            verified_by = %s,
                            verified_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE period_key = %s AND report_type = 'weekly'
                    """, (verification_status, verification_notes, verified_by, week_key))
                    
        elif period_type == 'weekly':
            # Parse year dan week_num dari period_key (format: YYYY-WXX)
            match = re.match(r'(\d+)-W(\d+)', period_key)
            if match:
                year = int(match.group(1))
                week_num = int(match.group(2))
                
                # Dapatkan bulan dari minggu ini
                start_date, _ = get_week_range(year, week_num)
                month = start_date.month
                month_key = f"{year}-{month:02d}"
                
                # Update monthly report yang sesuai
                cur.execute("""
                    UPDATE reports 
                    SET verification_status = %s,
                        verification_notes = %s,
                        verified_by = %s,
                        verified_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE period_key = %s AND report_type = 'monthly'
                """, (verification_status, verification_notes, verified_by, month_key))
        
        conn.commit()
        
    except Exception as e:
        print(f"Error syncing verification status: {e}")
        print(traceback.format_exc())
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

# ==================== ENSURE REPORT EXISTS ====================
@reports_bp.route('/api/reports/ensure', methods=['POST'])
def ensure_report():
    """Memastikan report untuk periode tertentu sudah ada di database"""
    conn = None
    try:
        data = request.get_json()
        period_type = data.get('period_type', 'monthly')
        period_key = data.get('period_key', '')
        year = data.get('year')
        month = data.get('month')
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Cek apakah report sudah ada
        cur.execute("""
            SELECT id_report, report_code, verification_status
            FROM reports
            WHERE period_key = %s AND report_type = %s
        """, (period_key, period_type))
        
        existing = cur.fetchone()
        
        if existing:
            return jsonify({
                'success': True,
                'data': {
                    'id_report': existing['id_report'],
                    'report_code': existing['report_code'],
                    'verification_status': existing['verification_status']
                },
                'exists': True
            })
        
        # Buat report baru jika belum ada
        report_code = generate_report_code()
        report_name = f"{period_type.capitalize()} Report - {period_key}"
        
        # Tentukan tanggal berdasarkan periode
        start_date = None
        end_date = None
        
        if period_type == 'weekly' and period_key:
            match = re.match(r'(\d+)-W(\d+)', period_key)
            if match:
                year = int(match.group(1))
                week_num = int(match.group(2))
                start_date, end_date = get_week_range(year, week_num)
        elif period_type == 'monthly' and year and month:
            start_date = datetime(int(year), int(month), 1)
            if int(month) == 12:
                end_date = datetime(int(year) + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(int(year), int(month) + 1, 1) - timedelta(days=1)
        
        cur.execute("""
            INSERT INTO reports (
                report_code, report_name, report_type, period_key, period_label,
                year, month, start_date, end_date, verification_status, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id_report, report_code
        """, (
            report_code, report_name, period_type, period_key, period_key,
            int(year) if year else None,
            int(month) if month else None,
            start_date, end_date, 'pending_review'
        ))
        
        result = cur.fetchone()
        conn.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id_report': result[0],
                'report_code': result[1],
                'verification_status': 'pending_review'
            },
            'exists': False
        })
        
    except Exception as e:
        print(f"Error ensuring report: {e}")
        print(traceback.format_exc())
        if conn:
            conn.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== BULK VERIFY SESSIONS ====================
@reports_bp.route('/api/reports/bulk-verify-sessions', methods=['POST'])
def bulk_verify_sessions():
    """Bulk verification untuk multiple sessions dalam satu report"""
    conn = None
    try:
        data = request.get_json()
        session_ids = data.get('session_ids', [])
        report_id = data.get('report_id')
        verification_status = data.get('verification_status')
        verification_notes = data.get('verification_notes', '')
        verified_by = data.get('verified_by')
        
        if verification_status not in ['approved', 'rejected', 'on_review']:
            return jsonify({
                'success': False,
                'error': 'Invalid verification status'
            }), 400
        
        if not session_ids:
            return jsonify({
                'success': False,
                'error': 'No sessions selected'
            }), 400
        
        conn = get_conn()
        cur = conn.cursor()
        
        for session_id in session_ids:
            cur.execute("""
                UPDATE report_items 
                SET verification_status = %s,
                    verification_notes = %s,
                    verified_by = %s,
                    verified_at = CURRENT_TIMESTAMP
                WHERE report_id = %s AND session_id = %s
            """, (verification_status, verification_notes, verified_by, report_id, session_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'{len(session_ids)} sessions have been updated',
            'data': {
                'updated_count': len(session_ids),
                'verification_status': verification_status
            }
        })
        
    except Exception as e:
        print(f"Error bulk verifying sessions: {e}")
        print(traceback.format_exc())
        if conn:
            conn.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== GET REPORTS LIST (GROUPED BY PERIOD) ====================
@reports_bp.route('/api/reports', methods=['GET'])
def get_reports():
    """Mendapatkan daftar report yang sudah memiliki asset, dikelompokkan berdasarkan periode (mingguan/bulanan)"""
    conn = None
    try:
        period = request.args.get('period', 'monthly')
        year = request.args.get('year', None)
        month = request.args.get('month', None)
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Device sessions
        cur.execute("""
            SELECT 
                dsp.id_preparation,
                dsp.checking_number,
                dsp.checking_name,
                dsp.checking_date,
                dsp.location_id,
                l.location_name,
                dsp.created_at,
                'device' as type,
                COUNT(DISTINCT a.id_assets) as total_items,
                COALESCE(SUM(CASE WHEN a.asset_type = 'device' THEN a.quantity ELSE 0 END), 0) as device_count,
                COALESCE(SUM(CASE WHEN a.asset_type = 'material' THEN a.quantity ELSE 0 END), 0) as material_count
            FROM devices_scanning_preparations dsp
            LEFT JOIN devices_items_preparation dip ON dsp.id_preparation = dip.preparation_id
            LEFT JOIN validations v ON dip.id_item_preparation = v.item_preparation_id AND v.validation_status = 'approved'
            LEFT JOIN assets a ON v.id_validation = a.validation_id
            LEFT JOIN locations l ON dsp.location_id = l.id_location
            GROUP BY dsp.id_preparation, dsp.checking_number, dsp.checking_name, 
                     dsp.checking_date, dsp.location_id, l.location_name, dsp.created_at
            HAVING COUNT(DISTINCT a.id_assets) > 0
        """)
        devices_sessions = cur.fetchall()
        
        # Material sessions
        cur.execute("""
            SELECT 
                msp.id_preparation,
                msp.checking_number,
                msp.checking_name,
                msp.checking_date,
                msp.location_id,
                l.location_name,
                msp.created_at,
                'material' as type,
                COUNT(DISTINCT a.id_assets) as total_items,
                COALESCE(SUM(CASE WHEN a.asset_type = 'device' THEN a.quantity ELSE 0 END), 0) as device_count,
                COALESCE(SUM(CASE WHEN a.asset_type = 'material' THEN a.quantity ELSE 0 END), 0) as material_count
            FROM materials_scanning_preparations msp
            LEFT JOIN materials_items_preparation mip ON msp.id_preparation = mip.preparation_id
            LEFT JOIN validations v ON mip.id_item_preparation = v.material_item_preparation_id AND v.validation_status = 'approved'
            LEFT JOIN assets a ON v.id_validation = a.validation_id
            LEFT JOIN locations l ON msp.location_id = l.id_location
            GROUP BY msp.id_preparation, msp.checking_number, msp.checking_name, 
                     msp.checking_date, msp.location_id, l.location_name, msp.created_at
            HAVING COUNT(DISTINCT a.id_assets) > 0
        """)
        materials_sessions = cur.fetchall()
        
        # Gabungkan semua sessions
        all_sessions = []
        for prep in devices_sessions:
            prep_dict = dict(prep)
            cur.execute("""
                SELECT DISTINCT project_name 
                FROM devices_scanning_items 
                WHERE preparation_id = %s 
                AND project_name IS NOT NULL 
                LIMIT 1
            """, (prep_dict['id_preparation'],))
            project = cur.fetchone()
            prep_dict['project_name'] = project['project_name'] if project else None
            all_sessions.append(prep_dict)
            
        for prep in materials_sessions:
            prep_dict = dict(prep)
            cur.execute("""
                SELECT DISTINCT project_name 
                FROM materials_scanning_items 
                WHERE preparation_id = %s 
                AND project_name IS NOT NULL 
                LIMIT 1
            """, (prep_dict['id_preparation'],))
            project = cur.fetchone()
            prep_dict['project_name'] = project['project_name'] if project else None
            all_sessions.append(prep_dict)
        
        # ==================== PERUBAHAN: WEEKLY FILTER DIHAPUS ====================
        # Filter berdasarkan periode
        filtered_sessions = []
        
        if period == 'weekly':
            # UNTUK WEEKLY: TIDAK ADA FILTER TANGGAL
            # Semua session langsung dimasukkan untuk dikelompokkan per minggu
            for session in all_sessions:
                checking_date = session.get('checking_date')
                if not checking_date:
                    continue
                filtered_sessions.append(session)
                
        elif period == 'monthly':
            # UNTUK MONTHLY: TETAP SAMA SEPERTI SEBELUMNYA
            for session in all_sessions:
                checking_date = session.get('checking_date')
                if not checking_date:
                    continue
                
                date_obj = checking_date if isinstance(checking_date, datetime) else datetime.strptime(str(checking_date), '%Y-%m-%d')
                
                if year and month:
                    if date_obj.year == int(year) and date_obj.month == int(month):
                        filtered_sessions.append(session)
                else:
                    if date_obj.year == datetime.now().year and date_obj.month == datetime.now().month:
                        filtered_sessions.append(session)
        else:
            filtered_sessions = all_sessions
        
        # Kelompokkan berdasarkan periode untuk tampilan ringkasan
        reports_grouped = {}
        
        for session in filtered_sessions:
            checking_date = session.get('checking_date')
            if not checking_date:
                continue
            
            date_obj = checking_date if isinstance(checking_date, datetime) else datetime.strptime(str(checking_date), '%Y-%m-%d')
            
            if period == 'weekly':
                # Gunakan ISO week number untuk pengelompokan
                week_num = date_obj.isocalendar()[1]
                week_year = date_obj.isocalendar()[0]
                week_key = f"{week_year}-W{week_num:02d}"
                week_label = f"Week {week_num} - {week_year}"
                
                if week_key not in reports_grouped:
                    start_date, end_date = get_week_range(week_year, week_num)
                    reports_grouped[week_key] = {
                        'period_key': week_key,
                        'period_label': week_label,
                        'period_type': 'weekly',
                        'year': week_year,
                        'start_date': start_date.strftime('%Y-%m-%d'),
                        'end_date': end_date.strftime('%Y-%m-%d'),
                        'sessions': [],
                        'total_devices': 0,
                        'total_materials': 0,
                        'total_items': 0,
                        'session_count': 0
                    }
                
                reports_grouped[week_key]['sessions'].append(session)
                reports_grouped[week_key]['session_count'] += 1
                reports_grouped[week_key]['total_items'] += int(session.get('total_items', 0) or 0)
                reports_grouped[week_key]['total_devices'] += int(session.get('device_count', 0) or 0)
                reports_grouped[week_key]['total_materials'] += int(session.get('material_count', 0) or 0)
                
            else:  # monthly
                month_key = f"{date_obj.year}-{date_obj.month:02d}"
                month_label = f"{date_obj.strftime('%B')} {date_obj.year}"
                
                if month_key not in reports_grouped:
                    reports_grouped[month_key] = {
                        'period_key': month_key,
                        'period_label': month_label,
                        'period_type': 'monthly',
                        'month': date_obj.month,
                        'year': date_obj.year,
                        'sessions': [],
                        'total_devices': 0,
                        'total_materials': 0,
                        'total_items': 0,
                        'session_count': 0
                    }
                
                reports_grouped[month_key]['sessions'].append(session)
                reports_grouped[month_key]['session_count'] += 1
                reports_grouped[month_key]['total_items'] += session.get('total_items', 0)
                reports_grouped[month_key]['total_devices'] += session.get('device_count', 0)
                reports_grouped[month_key]['total_materials'] += session.get('material_count', 0)
        
        reports_list = list(reports_grouped.values())
        reports_list.sort(key=lambda x: x['period_key'], reverse=True)
        

        for report in reports_list:
            try:
                cur.execute("""
                    SELECT verification_status, verification_notes, verified_at, verified_by, id_report
                    FROM reports
                    WHERE period_key = %s AND report_type = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (report['period_key'], period))
                existing = cur.fetchone()
                
                if existing:
                    report['verification_status'] = existing['verification_status']
                    report['verification_notes'] = existing['verification_notes']
                    report['verified_at'] = existing['verified_at']
                    report['verified_by'] = existing['verified_by']
                    report['id_report'] = existing['id_report']
                else:
                    # Jika belum ada di reports table, buat baru
                    # Tapi untuk weekly, kita tetap set default
                    report['verification_status'] = 'pending_review'
                    report['verification_notes'] = None
                    report['verified_at'] = None
                    report['verified_by'] = None
                    report['id_report'] = None
                    
                    # Opsional: buat report entry baru
                    # (kode untuk insert bisa ditambahkan di sini jika perlu)
                    
            except Exception as e:
                print(f"Error getting verification status for report {report['period_key']}: {e}")
                report['verification_status'] = 'pending_review'
                report['verification_notes'] = None
                report['verified_at'] = None
                report['verified_by'] = None
                report['id_report'] = None
        
        return jsonify({
            'success': True,
            'data': reports_list,
            'count': len(reports_list),
            'period': period
        })
        
    except Exception as e:
        print(f"Error getting reports: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== GET REPORT DETAIL BY PERIOD ====================
@reports_bp.route('/api/reports/detail', methods=['GET'])
def get_report_detail():
    """Mendapatkan detail report untuk periode tertentu"""
    conn = None
    try:
        period_type = request.args.get('period_type', 'monthly')
        period_key = request.args.get('period_key', '')
        year = request.args.get('year', None)
        month = request.args.get('month', None)
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Tentukan rentang tanggal berdasarkan periode
        start_date = None
        end_date = None
        
        if period_type == 'weekly' and period_key:
            # ==================== PERUBAHAN: MENGGUNAKAN FUNGSI get_week_range ====================
            match = re.match(r'(\d+)-W(\d+)', period_key)
            if match:
                year = int(match.group(1))
                week_num = int(match.group(2))
                start_date, end_date = get_week_range(year, week_num)
        elif period_type == 'monthly' and year and month:
            # ==================== TIDAK BERUBAH ====================
            start_date = datetime(int(year), int(month), 1)
            if int(month) == 12:
                end_date = datetime(int(year) + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(int(year), int(month) + 1, 1) - timedelta(days=1)
        
        # Ambil semua sessions yang memiliki assets berdasarkan rentang tanggal
        sessions_data = []
        
        if start_date and end_date:
            # Device sessions
            cur.execute("""
                SELECT 
                    dsp.id_preparation,
                    dsp.checking_number,
                    dsp.checking_name,
                    dsp.checking_date,
                    dsp.location_id,
                    l.location_name,
                    dsp.created_at,
                    'device' as type,
                    COUNT(DISTINCT a.id_assets) as total_items,
                    COALESCE(SUM(CASE WHEN a.asset_type = 'device' THEN a.quantity ELSE 0 END), 0) as device_count,
                    COALESCE(SUM(CASE WHEN a.asset_type = 'material' THEN a.quantity ELSE 0 END), 0) as material_count,
                    (SELECT DISTINCT project_name FROM devices_scanning_items 
                     WHERE preparation_id = dsp.id_preparation AND project_name IS NOT NULL LIMIT 1) as project_name
                FROM devices_scanning_preparations dsp
                LEFT JOIN devices_items_preparation dip ON dsp.id_preparation = dip.preparation_id
                LEFT JOIN validations v ON dip.id_item_preparation = v.item_preparation_id AND v.validation_status = 'approved'
                LEFT JOIN assets a ON v.id_validation = a.validation_id
                LEFT JOIN locations l ON dsp.location_id = l.id_location
                WHERE dsp.checking_date BETWEEN %s AND %s
                GROUP BY dsp.id_preparation, dsp.checking_number, dsp.checking_name, 
                         dsp.checking_date, dsp.location_id, l.location_name, dsp.created_at
                HAVING COUNT(DISTINCT a.id_assets) > 0
                ORDER BY dsp.checking_date DESC
            """, (start_date, end_date))
            device_sessions = cur.fetchall()
            
            # Material sessions
            cur.execute("""
                SELECT 
                    msp.id_preparation,
                    msp.checking_number,
                    msp.checking_name,
                    msp.checking_date,
                    msp.location_id,
                    l.location_name,
                    msp.created_at,
                    'material' as type,
                    COUNT(DISTINCT a.id_assets) as total_items,
                    COALESCE(SUM(CASE WHEN a.asset_type = 'device' THEN a.quantity ELSE 0 END), 0) as device_count,
                    COALESCE(SUM(CASE WHEN a.asset_type = 'material' THEN a.quantity ELSE 0 END), 0) as material_count,
                    (SELECT DISTINCT project_name FROM materials_scanning_items 
                     WHERE preparation_id = msp.id_preparation AND project_name IS NOT NULL LIMIT 1) as project_name
                FROM materials_scanning_preparations msp
                LEFT JOIN materials_items_preparation mip ON msp.id_preparation = mip.preparation_id
                LEFT JOIN validations v ON mip.id_item_preparation = v.material_item_preparation_id AND v.validation_status = 'approved'
                LEFT JOIN assets a ON v.id_validation = a.validation_id
                LEFT JOIN locations l ON msp.location_id = l.id_location
                WHERE msp.checking_date BETWEEN %s AND %s
                GROUP BY msp.id_preparation, msp.checking_number, msp.checking_name, 
                         msp.checking_date, msp.location_id, l.location_name, msp.created_at
                HAVING COUNT(DISTINCT a.id_assets) > 0
                ORDER BY msp.checking_date DESC
            """, (start_date, end_date))
            material_sessions = cur.fetchall()
            
            # Gabungkan
            for session in device_sessions:
                session_dict = dict(session)
                if not session_dict.get('project_name'):
                    session_dict['project_name'] = '-'
                sessions_data.append(session_dict)
            for session in material_sessions:
                session_dict = dict(session)
                if not session_dict.get('project_name'):
                    session_dict['project_name'] = '-'
                sessions_data.append(session_dict)
            
            # Urutkan berdasarkan tanggal
            sessions_data.sort(key=lambda x: x.get('checking_date', ''), reverse=True)
        
        # Hitung total keseluruhan
        total_devices = sum(int(s.get('device_count', 0)) for s in sessions_data)
        total_materials = sum(int(s.get('material_count', 0)) for s in sessions_data)
        total_items = sum(int(s.get('total_items', 0)) for s in sessions_data)
        
        return jsonify({
            'success': True,
            'data': {
                'period_type': period_type,
                'period_key': period_key,
                'start_date': start_date.strftime('%Y-%m-%d') if start_date else None,
                'end_date': end_date.strftime('%Y-%m-%d') if end_date else None,
                'sessions': sessions_data,
                'total_devices': int(total_devices),
                'total_materials': int(total_materials),
                'total_items': int(total_items),
                'session_count': len(sessions_data)
            }
        })
        
    except Exception as e:
        print(f"Error getting report detail: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== EXPORT REPORT TO EXCEL ====================
@reports_bp.route('/api/reports/export', methods=['GET'])
def export_report():
    """Export report ke Excel"""
    conn = None
    try:
        period_type = request.args.get('period_type', 'monthly')
        period_key = request.args.get('period_key', '')
        year = request.args.get('year', None)
        month = request.args.get('month', None)
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Tentukan rentang tanggal
        start_date = None
        end_date = None
        
        if period_type == 'weekly' and period_key:
            match = re.match(r'(\d+)-W(\d+)', period_key)
            if match:
                year = int(match.group(1))
                week_num = int(match.group(2))
                start_date, end_date = get_week_range(year, week_num)
        elif period_type == 'monthly' and year and month:
            start_date = datetime(int(year), int(month), 1)
            if int(month) == 12:
                end_date = datetime(int(year) + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(int(year), int(month) + 1, 1) - timedelta(days=1)
        
        # Ambil semua asset details dalam periode
        assets_data = []
        
        if start_date and end_date:
            # Device assets
            cur.execute("""
                SELECT 
                    a.asset_code,
                    a.asset_name,
                    a.asset_type,
                    a.category,
                    a.serial_number,
                    a.brand,
                    a.vendor,
                    a.model,
                    a.project_name,
                    a.department_name,
                    a.receiver_name,
                    a.location_name,
                    a.status,
                    a.quantity,
                    a.uom,
                    a.validated_at,
                    dsp.checking_name as session_name,
                    dsp.checking_number as session_number,
                    dsp.checking_date
                FROM assets a
                INNER JOIN validations v ON a.validation_id = v.id_validation
                INNER JOIN devices_items_preparation dip ON v.item_preparation_id = dip.id_item_preparation
                INNER JOIN devices_scanning_preparations dsp ON dip.preparation_id = dsp.id_preparation
                WHERE dsp.checking_date BETWEEN %s AND %s
                AND a.asset_type = 'device'
                ORDER BY dsp.checking_date DESC, a.asset_name ASC
            """, (start_date, end_date))
            device_assets = cur.fetchall()
            
            # Material assets
            cur.execute("""
                SELECT 
                    a.asset_code,
                    a.asset_name,
                    a.asset_type,
                    a.category,
                    a.scan_code,
                    a.vendor,
                    a.project_name,
                    a.department_name,
                    a.receiver_name,
                    a.location_name,
                    a.status,
                    a.quantity,
                    a.uom,
                    a.validated_at,
                    msp.checking_name as session_name,
                    msp.checking_number as session_number,
                    msp.checking_date
                FROM assets a
                INNER JOIN validations v ON a.validation_id = v.id_validation
                INNER JOIN materials_items_preparation mip ON v.material_item_preparation_id = mip.id_item_preparation
                INNER JOIN materials_scanning_preparations msp ON mip.preparation_id = msp.id_preparation
                WHERE msp.checking_date BETWEEN %s AND %s
                AND a.asset_type = 'material'
                ORDER BY msp.checking_date DESC, a.asset_name ASC
            """, (start_date, end_date))
            material_assets = cur.fetchall()
            
            for asset in device_assets:
                assets_data.append(dict(asset))
            for asset in material_assets:
                assets_data.append(dict(asset))
        
        return jsonify({
            'success': True,
            'data': assets_data,
            'count': len(assets_data),
            'period': {
                'period_type': period_type,
                'start_date': start_date.strftime('%Y-%m-%d') if start_date else None,
                'end_date': end_date.strftime('%Y-%m-%d') if end_date else None
            }
        })
        
    except Exception as e:
        print(f"Error exporting report: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== GET AVAILABLE YEARS ====================
@reports_bp.route('/api/reports/years', methods=['GET'])
def get_available_years():
    """Mendapatkan daftar tahun yang tersedia untuk report"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        # ==================== PERUBAHAN: MENGHAPUS FILTER status = 'completed' ====================
        cur.execute("""
            SELECT DISTINCT EXTRACT(YEAR FROM checking_date) as year
            FROM devices_scanning_preparations
            UNION
            SELECT DISTINCT EXTRACT(YEAR FROM checking_date) as year
            FROM materials_scanning_preparations
            ORDER BY year DESC
        """)
        
        years = [int(row[0]) for row in cur.fetchall() if row[0]]
        
        return jsonify({
            'success': True,
            'data': years
        })
        
    except Exception as e:
        print(f"Error getting available years: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
# ==================== VERIFY/APPROVE REPORT ====================
@reports_bp.route('/api/reports/verify/<int:report_id>', methods=['PUT'])
def verify_report(report_id):
    """Verifikasi report (Approve/Reject) oleh Super Admin"""
    conn = None
    try:
        data = request.get_json()
        verification_status = data.get('verification_status')
        verification_notes = data.get('verification_notes', '')
        verified_by = data.get('verified_by')
        
        if verification_status not in ['approved', 'rejected', 'on_review']:
            return jsonify({
                'success': False,
                'error': 'Invalid verification status. Must be approved, rejected, or on_review'
            }), 400
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Ambil data report sebelum update
        cur.execute("""
            SELECT id_report, period_key, report_type, verification_status
            FROM reports
            WHERE id_report = %s
        """, (report_id,))
        
        report_before = cur.fetchone()
        
        if not report_before:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
        
        # Update report
        cur.execute("""
            UPDATE reports 
            SET verification_status = %s,
                verification_notes = %s,
                verified_by = %s,
                verified_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_report = %s
            RETURNING id_report, verification_status, period_key, report_type
        """, (verification_status, verification_notes, verified_by, report_id))
        
        result = cur.fetchone()
        conn.commit()
        
        # ==================== SINKRONISASI ====================
        # Buat dictionary report yang sudah diupdate
        updated_report = {
            'period_key': result[2],
            'period_type': result[3],
            'verification_status': result[1],
            'verification_notes': verification_notes,
            'verified_by': verified_by
        }
        
        # Panggil fungsi sinkronisasi (gunakan koneksi terpisah)
        def sync():
            sync_conn = None
            try:
                sync_conn = get_conn()
                sync_cur = sync_conn.cursor()
                
                period_type = updated_report['period_type']
                period_key = updated_report['period_key']
                verification_status = updated_report['verification_status']
                verification_notes = updated_report['verification_notes']
                verified_by = updated_report['verified_by']
                
                if period_type == 'monthly':
                    match = re.match(r'(\d+)-(\d+)', period_key)
                    if match:
                        year = int(match.group(1))
                        month = int(match.group(2))
                        weeks = get_weeks_in_month(year, month)
                        
                        for week_year, week_num in weeks:
                            week_key = f"{week_year}-W{week_num:02d}"
                            sync_cur.execute("""
                                UPDATE reports 
                                SET verification_status = %s,
                                    verification_notes = %s,
                                    verified_by = %s,
                                    verified_at = CURRENT_TIMESTAMP,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE period_key = %s AND report_type = 'weekly'
                            """, (verification_status, verification_notes, verified_by, week_key))
                            
                elif period_type == 'weekly':
                    match = re.match(r'(\d+)-W(\d+)', period_key)
                    if match:
                        year = int(match.group(1))
                        week_num = int(match.group(2))
                        start_date, _ = get_week_range(year, week_num)
                        month = start_date.month
                        month_key = f"{year}-{month:02d}"
                        
                        sync_cur.execute("""
                            UPDATE reports 
                            SET verification_status = %s,
                                verification_notes = %s,
                                verified_by = %s,
                                verified_at = CURRENT_TIMESTAMP,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE period_key = %s AND report_type = 'monthly'
                        """, (verification_status, verification_notes, verified_by, month_key))
                
                sync_conn.commit()
                print(f"Sync completed for {period_type} report {period_key}")
                
            except Exception as e:
                print(f"Error in sync: {e}")
                if sync_conn:
                    sync_conn.rollback()
            finally:
                if sync_conn:
                    sync_conn.close()
        
        # Jalankan sinkronisasi di background thread agar tidak blocking
        import threading
        sync_thread = threading.Thread(target=sync)
        sync_thread.start()
        
        return jsonify({
            'success': True,
            'message': f'Report has been {verification_status} and synced to related reports',
            'data': {
                'id_report': result[0],
                'verification_status': result[1]
            }
        })
        
    except Exception as e:
        print(f"Error verifying report: {e}")
        print(traceback.format_exc())
        if conn:
            conn.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== GET REPORT VERIFICATION STATUS ====================
@reports_bp.route('/api/reports/verification/<int:report_id>', methods=['GET'])
def get_report_verification(report_id):
    """Mendapatkan status verifikasi report"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT 
                r.id_report,
                r.report_code,
                r.verification_status,
                r.verification_notes,
                r.verified_at,
                u.id_user as verified_by_id,
                u.username as verified_by_name
            FROM reports r
            LEFT JOIN users u ON r.verified_by = u.id_user
            WHERE r.id_report = %s
        """, (report_id,))
        
        result = cur.fetchone()
        
        if not result:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': dict(result)
        })
        
    except Exception as e:
        print(f"Error getting report verification: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()