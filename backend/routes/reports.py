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
    """Generate unique report code"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"RPT-{date_str}-{random_chars}"

@reports_bp.route('/api/reports', methods=['GET'])
def get_reports():
    """Mendapatkan daftar laporan"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT 
                r.id_report,
                r.report_code,
                r.report_type,
                r.report_date,
                r.report_end_date,
                r.total_scans,
                r.valid_scans,
                r.error_scans,
                r.pending_scans,
                r.devices_count,
                r.materials_count,
                r.locations_count,
                r.users_count,
                r.success_rate,
                r.generated_at,
                u.username as generated_by_name,
                COUNT(ri.id_report_item) as total_items
            FROM asset_reports r
            LEFT JOIN users u ON r.generated_by = u.id_user
            LEFT JOIN report_items ri ON r.id_report = ri.report_id
            GROUP BY r.id_report, u.username
            ORDER BY r.report_date DESC, r.generated_at DESC
        """)
        
        reports = cur.fetchall()
        
        result = []
        for report in reports:
            report_dict = dict(report)
            # Format tanggal untuk tampilan
            if report_dict.get('report_date'):
                report_dict['formatted_date'] = report_dict['report_date'].strftime('%d %b %Y') if hasattr(report_dict['report_date'], 'strftime') else str(report_dict['report_date'])
            result.append(report_dict)
        
        return jsonify({
            'success': True,
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        print(f"Error getting reports: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@reports_bp.route('/api/reports/<int:report_id>', methods=['GET'])
def get_report_detail(report_id):
    """Mendapatkan detail laporan berdasarkan ID"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Ambil info report
        cur.execute("""
            SELECT 
                r.*,
                u.username as generated_by_name
            FROM asset_reports r
            LEFT JOIN users u ON r.generated_by = u.id_user
            WHERE r.id_report = %s
        """, (report_id,))
        
        report = cur.fetchone()
        
        if not report:
            return jsonify({'success': False, 'error': 'Report not found'}), 404
        
        report_dict = dict(report)
        
        # Ambil items dari report
        cur.execute("""
            SELECT 
                ri.id_report_item,
                ri.scan_id,
                ri.asset_code,
                ri.asset_name,
                ri.asset_type,
                ri.category,
                ri.location_name,
                ri.serial_or_code,
                ri.status,
                ri.scan_date,
                ri.scan_time,
                ri.verified_by_name,
                ri.department_name,
                ri.unique_code
            FROM report_items ri
            WHERE ri.report_id = %s
            ORDER BY ri.created_at DESC
        """, (report_id,))
        
        items = cur.fetchall()
        report_dict['items'] = [dict(item) for item in items] if items else []
        
        # Format tanggal
        if report_dict.get('report_date'):
            report_dict['formatted_date'] = report_dict['report_date'].strftime('%d %b %Y') if hasattr(report_dict['report_date'], 'strftime') else str(report_dict['report_date'])
        
        return jsonify({
            'success': True,
            'data': report_dict
        })
        
    except Exception as e:
        print(f"Error getting report detail: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@reports_bp.route('/api/reports/generate', methods=['POST'])
def generate_report():
    """Generate laporan dari data yang ada"""
    conn = None
    try:
        data = request.json
        report_type = data.get('report_type', 'daily')
        report_date = data.get('report_date', datetime.now().strftime('%Y-%m-%d'))
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Tentukan range tanggal berdasarkan tipe laporan
        if report_type == 'daily':
            start_date = report_date
            end_date = report_date
        elif report_type == 'weekly':
            date_obj = datetime.strptime(report_date, '%Y-%m-%d')
            start_date = (date_obj - timedelta(days=date_obj.weekday())).strftime('%Y-%m-%d')
            end_date = (date_obj + timedelta(days=6 - date_obj.weekday())).strftime('%Y-%m-%d')
        else:  # monthly
            date_obj = datetime.strptime(report_date, '%Y-%m-%d')
            start_date = date_obj.replace(day=1).strftime('%Y-%m-%d')
            next_month = date_obj.replace(day=28) + timedelta(days=4)
            end_date = (next_month - timedelta(days=next_month.day)).strftime('%Y-%m-%d')
        
        # Ambil data validasi dalam range tanggal
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
                l.location_name,
                u.username as created_by_name,
                vu.username as validated_by_name,
                a.asset_code
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
            LEFT JOIN assets a ON v.asset_id = a.id_assets
            WHERE DATE(v.created_at) BETWEEN %s AND %s
            ORDER BY v.created_at DESC
        """, (start_date, end_date))
        
        validations = cur.fetchall()
        
        if not validations:
            return jsonify({
                'success': False,
                'error': 'No data found for the specified period'
            }), 404
        
        # Hitung statistik
        total_scans = len(validations)
        valid_scans = sum(1 for v in validations if v['validation_status'] == 'approved')
        error_scans = sum(1 for v in validations if v['validation_status'] == 'rejected')
        pending_scans = sum(1 for v in validations if v['validation_status'] == 'pending')
        devices_count = sum(1 for v in validations if v['validation_type'] == 'device')
        materials_count = sum(1 for v in validations if v['validation_type'] == 'material')
        locations = set(v['location_name'] for v in validations if v['location_name'])
        users = set(v['created_by_name'] for v in validations if v['created_by_name'])
        success_rate = (valid_scans / total_scans * 100) if total_scans > 0 else 0
        
        # Generate report code
        report_code = generate_report_code()
        
        # Insert ke asset_reports
        cur.execute("""
            INSERT INTO asset_reports (
                report_code, report_type, report_date, report_end_date,
                total_scans, valid_scans, error_scans, pending_scans,
                devices_count, materials_count, locations_count, users_count,
                success_rate, generated_by, generated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_report
        """, (
            report_code,
            report_type,
            start_date,
            end_date,
            total_scans,
            valid_scans,
            error_scans,
            pending_scans,
            devices_count,
            materials_count,
            len(locations),
            len(users),
            success_rate,
            1,  # user_id default
            datetime.now()
        ))
        
        report_id = cur.fetchone()[0]
        
        # Insert ke report_items
        for val in validations:
            status_label = 'Valid' if val['validation_status'] == 'approved' else ('Error' if val['validation_status'] == 'rejected' else 'Pending')
            
            cur.execute("""
                INSERT INTO report_items (
                    report_id, scan_id, asset_code, asset_name, asset_type,
                    category, location_name, serial_or_code, status,
                    scan_date, scan_time, verified_by_name, unique_code
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                report_id,
                val['scan_id'],
                val['asset_code'],
                val['device_name'] or val['material_name'] or '-',
                'Device' if val['validation_type'] == 'device' else 'Material',
                'Perangkat' if val['validation_type'] == 'device' else 'Material',
                val['location_name'] or '-',
                val['serial_number'] or val['scan_code'] or '-',
                status_label,
                val['created_at'].date() if val['created_at'] else None,
                val['created_at'].time() if val['created_at'] else None,
                val['validated_by_name'] or val['created_by_name'] or 'System',
                val['unique_code'] or '-'
            ))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Report generated successfully',
            'report_id': report_id,
            'report_code': report_code
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error generating report: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@reports_bp.route('/api/reports/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    """Menghapus report berdasarkan ID"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("SELECT id_report FROM asset_reports WHERE id_report = %s", (report_id,))
        if not cur.fetchone():
            return jsonify({'success': False, 'error': 'Report not found'}), 404
        
        cur.execute("DELETE FROM report_items WHERE report_id = %s", (report_id,))
        cur.execute("DELETE FROM asset_reports WHERE id_report = %s", (report_id,))
        
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Report deleted successfully'})
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error deleting report: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@reports_bp.route('/api/reports/bulk-delete', methods=['POST'])
def bulk_delete_reports():
    """Menghapus multiple reports sekaligus"""
    conn = None
    try:
        data = request.json
        report_ids = data.get('report_ids', [])
        
        if not report_ids:
            return jsonify({'success': False, 'error': 'No report IDs provided'}), 400
        
        conn = get_conn()
        cur = conn.cursor()
        
        deleted_count = 0
        
        for report_id in report_ids:
            cur.execute("DELETE FROM report_items WHERE report_id = %s", (report_id,))
            cur.execute("DELETE FROM asset_reports WHERE id_report = %s", (report_id,))
            if cur.rowcount > 0:
                deleted_count += 1
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'{deleted_count} reports deleted successfully',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error bulk deleting reports: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()