from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime, timedelta
import traceback
import random
import string

reports_bp = Blueprint('reports', __name__)

def get_conn():
    return get_db_connection()

def generate_report_code():
    """Generate unique report code format: RPT-YYYYMMDD-XXXX"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"RPT-{date_str}-{random_chars}"

# ==================== GET REPORTS LIST (GROUPED BY PERIOD) ====================
@reports_bp.route('/api/reports', methods=['GET'])
def get_reports():
    """Mendapatkan daftar report yang sudah memiliki asset, dikelompokkan berdasarkan periode (mingguan/bulanan)"""
    conn = None
    try:
        period = request.args.get('period', 'monthly')  # weekly, monthly, or all
        year = request.args.get('year', None)
        month = request.args.get('month', None)
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Ambil semua sessions yang memiliki assets
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
            # Ambil project name
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
        
        # Filter berdasarkan periode
        filtered_sessions = []
        for session in all_sessions:
            checking_date = session.get('checking_date')
            if not checking_date:
                continue
            
            date_obj = checking_date if isinstance(checking_date, datetime) else datetime.strptime(str(checking_date), '%Y-%m-%d')
            
            if period == 'weekly':
                # Cek apakah dalam 7 hari terakhir
                week_ago = datetime.now() - timedelta(days=7)
                if date_obj >= week_ago:
                    filtered_sessions.append(session)
            elif period == 'monthly':
                # Filter berdasarkan tahun dan bulan
                if year and month:
                    if date_obj.year == int(year) and date_obj.month == int(month):
                        filtered_sessions.append(session)
                else:
                    # Default: bulan ini
                    if date_obj.year == datetime.now().year and date_obj.month == datetime.now().month:
                        filtered_sessions.append(session)
            else:
                filtered_sessions.append(session)
        
        # Kelompokkan berdasarkan periode untuk tampilan ringkasan
        reports_grouped = {}
        
        for session in filtered_sessions:
            checking_date = session.get('checking_date')
            if not checking_date:
                continue
            
            date_obj = checking_date if isinstance(checking_date, datetime) else datetime.strptime(str(checking_date), '%Y-%m-%d')
            
            if period == 'weekly':
                # Kelompokkan per minggu (gunakan week number dan year)
                week_key = f"{date_obj.year}-W{date_obj.isocalendar()[1]:02d}"
                week_label = f"Week {date_obj.isocalendar()[1]} - {date_obj.year}"
                
                if week_key not in reports_grouped:
                    reports_grouped[week_key] = {
                        'period_key': week_key,
                        'period_label': week_label,
                        'period_type': 'weekly',
                        'start_date': (date_obj - timedelta(days=date_obj.weekday())).strftime('%Y-%m-%d'),
                        'end_date': (date_obj + timedelta(days=6 - date_obj.weekday())).strftime('%Y-%m-%d'),
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
        
        # Konversi ke list dan urutkan berdasarkan periode (descending)
        reports_list = list(reports_grouped.values())
        reports_list.sort(key=lambda x: x['period_key'], reverse=True)
        
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
            try:
                import re
                match = re.match(r'(\d+)-W(\d+)', period_key)
                if match:
                    year = int(match.group(1))
                    week_num = int(match.group(2))
                    first_day_of_year = datetime(year, 1, 1)
                    days_to_first_week = (7 - first_day_of_year.weekday()) % 7
                    first_week_start = first_day_of_year + timedelta(days=days_to_first_week)
                    start_date = first_week_start + timedelta(weeks=week_num - 1)
                    end_date = start_date + timedelta(days=6)
            except:
                pass
        elif period_type == 'monthly' and year and month:
            start_date = datetime(int(year), int(month), 1)
            if int(month) == 12:
                end_date = datetime(int(year) + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(int(year), int(month) + 1, 1) - timedelta(days=1)
        
        # Ambil semua sessions yang memiliki assets berdasarkan rentang tanggal
        sessions_data = []
        
        if start_date and end_date:
            # Device sessions - TAMBAHKAN project_name
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
                    -- Ambil project_name dari devices_scanning_items
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
            
            # Material sessions - TAMBAHKAN project_name
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
                    -- Ambil project_name dari materials_scanning_items
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
                # Pastikan project_name tidak None
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
            import re
            match = re.match(r'(\d+)-W(\d+)', period_key)
            if match:
                year = int(match.group(1))
                week_num = int(match.group(2))
                first_day_of_year = datetime(year, 1, 1)
                days_to_first_week = (7 - first_day_of_year.weekday()) % 7
                first_week_start = first_day_of_year + timedelta(days=days_to_first_week)
                start_date = first_week_start + timedelta(weeks=week_num - 1)
                end_date = start_date + timedelta(days=6)
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
        
        # Ambil dari device sessions
        cur.execute("""
            SELECT DISTINCT EXTRACT(YEAR FROM checking_date) as year
            FROM devices_scanning_preparations
            WHERE status = 'completed'
            UNION
            SELECT DISTINCT EXTRACT(YEAR FROM checking_date) as year
            FROM materials_scanning_preparations
            WHERE status = 'completed'
            ORDER BY year DESC
        """)
        
        years = [row[0] for row in cur.fetchall() if row[0]]
        
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