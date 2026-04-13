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

# ==================== CREATE REPORT FROM VALIDATION ====================
def create_report_from_validation(validation_id, conn, cur):
    """Membuat atau update report berdasarkan validasi yang di-approve"""
    try:
        # FIRST, refresh the validation data to get the latest asset_id
        cur.execute("""
            SELECT id_validation, asset_id, validated_at, validated_by
            FROM validations 
            WHERE id_validation = %s
        """, (validation_id,))
        val_check = cur.fetchone()
        
        if not val_check:
            print(f"Validation {validation_id} not found")
            return False, None
        
        # If asset_id is still NULL, wait a moment and try again
        if not val_check[1]:  # asset_id is NULL
            print(f"Asset_id for validation {validation_id} is NULL, waiting for asset creation...")
            import time
            time.sleep(0.5)  # Wait 500ms for asset to be created
            cur.execute("SELECT asset_id FROM validations WHERE id_validation = %s", (validation_id,))
            val_check = cur.fetchone()
            if val_check and not val_check[0]:
                print(f"Asset_id still NULL after waiting, skipping report for {validation_id}")
                return False, None
        
        asset_id = val_check[1] if val_check else None
        
        # Now get complete validation data with asset
        cur.execute("""
            SELECT 
                v.id_validation,
                v.unique_code,
                v.created_at,
                v.validated_at,
                v.validation_status,
                v.user_id,
                v.validated_by,
                v.asset_id,
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
                dsp.location_id as device_location_id,
                msp.location_id as material_location_id,
                l.location_name,
                a.id_assets,
                a.asset_code,
                a.asset_name,
                a.category,
                a.brand,
                a.vendor,
                a.model,
                a.specifications,
                a.project_name,
                a.department_name,
                a.receiver_name,
                a.location_name as asset_location
            FROM validations v
            LEFT JOIN scan_results_devices srd ON v.scan_id = srd.id_scan
            LEFT JOIN scan_results_materials srm ON v.scan_material_id = srm.id_scan
            LEFT JOIN devices_items_preparation dip ON v.item_preparation_id = dip.id_item_preparation
            LEFT JOIN materials_items_preparation mip ON v.material_item_preparation_id = mip.id_item_preparation
            LEFT JOIN devices_scanning_preparations dsp ON dip.preparation_id = dsp.id_preparation
            LEFT JOIN materials_scanning_preparations msp ON mip.preparation_id = msp.id_preparation
            LEFT JOIN locations l ON COALESCE(dsp.location_id, msp.location_id) = l.id_location
            LEFT JOIN assets a ON v.asset_id = a.id_assets
            WHERE v.id_validation = %s AND v.validation_status = 'approved'
        """, (validation_id,))
        
        validation = cur.fetchone()
        
        if not validation:
            print(f"No approved validation found for ID {validation_id}")
            return False, None
        
        # Log untuk debugging
        print(f"Processing report for validation {validation_id}:")
        print(f"  - asset_id from validation: {validation['asset_id']}")
        print(f"  - id_assets from assets join: {validation['id_assets']}")
        print(f"  - asset_code: {validation['asset_code']}")
        
        # Use the correct asset ID
        final_asset_id = validation['asset_id'] or validation['id_assets']
        
        if not final_asset_id:
            print(f"WARNING: No asset_id found for validation {validation_id}, report item may not be created")
        
        # Tentukan report_date dari tanggal validasi
        report_date = validation['validated_at'].date() if validation['validated_at'] else datetime.now().date()
        
        # Cek apakah sudah ada report untuk tanggal ini
        cur.execute("""
            SELECT id_report, report_code, total_scans, valid_scans, error_scans, pending_scans,
                   total_assets, devices_count, materials_count, success_rate
            FROM reports
            WHERE report_type = 'daily' AND report_date = %s
        """, (report_date,))
        
        existing_report = cur.fetchone()
        
        # Hitung statistik untuk tanggal ini (dari validations yang approved)
        cur.execute("""
            SELECT 
                COUNT(*) as total_scans,
                SUM(CASE WHEN validation_status = 'approved' THEN 1 ELSE 0 END) as valid_scans,
                SUM(CASE WHEN validation_status = 'rejected' THEN 1 ELSE 0 END) as error_scans,
                SUM(CASE WHEN validation_status = 'pending' THEN 1 ELSE 0 END) as pending_scans,
                COUNT(DISTINCT CASE WHEN scan_id IS NOT NULL THEN id_validation END) as devices_count,
                COUNT(DISTINCT CASE WHEN scan_material_id IS NOT NULL THEN id_validation END) as materials_count,
                COUNT(DISTINCT a.id_assets) as total_assets,
                COUNT(DISTINCT l.id_location) as locations_count,
                COUNT(DISTINCT a.department_name) as departments_count,
                COUNT(DISTINCT a.project_name) as projects_count,
                COUNT(DISTINCT a.receiver_name) as receivers_count
            FROM validations v
            LEFT JOIN assets a ON v.asset_id = a.id_assets
            LEFT JOIN locations l ON a.location_id = l.id_location
            WHERE DATE(v.validated_at) = %s AND v.validation_status = 'approved'
        """, (report_date,))
        
        stats = cur.fetchone()
        
        total_scans = stats['total_scans'] or 0
        valid_scans = stats['valid_scans'] or 0
        error_scans = stats['error_scans'] or 0
        pending_scans = stats['pending_scans'] or 0
        devices_count = stats['devices_count'] or 0
        materials_count = stats['materials_count'] or 0
        total_assets = stats['total_assets'] or 0
        locations_count = stats['locations_count'] or 0
        departments_count = stats['departments_count'] or 0
        projects_count = stats['projects_count'] or 0
        receivers_count = stats['receivers_count'] or 0
        success_rate = (valid_scans / total_scans * 100) if total_scans > 0 else 0
        
        if existing_report:
            # Update existing report
            cur.execute("""
                UPDATE reports 
                SET total_scans = %s,
                    valid_scans = %s,
                    error_scans = %s,
                    pending_scans = %s,
                    success_rate = %s,
                    total_assets = %s,
                    devices_count = %s,
                    materials_count = %s,
                    locations_count = %s,
                    departments_count = %s,
                    projects_count = %s,
                    receivers_count = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_report = %s
                RETURNING id_report
            """, (total_scans, valid_scans, error_scans, pending_scans, success_rate,
                  total_assets, devices_count, materials_count, locations_count,
                  departments_count, projects_count, receivers_count, existing_report['id_report']))
            
            report_id = existing_report['id_report']
            print(f"✅ Report {existing_report['report_code']} updated for {report_date}")
        else:
            # Create new report
            report_code = generate_report_code()
            report_name = f"Daily Report - {report_date.strftime('%d %B %Y')}"
            
            cur.execute("""
                INSERT INTO reports (
                    report_code, report_name, report_type, report_date,
                    total_scans, valid_scans, error_scans, pending_scans, success_rate,
                    total_assets, devices_count, materials_count,
                    locations_count, departments_count, projects_count, receivers_count,
                    generated_by, generated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_report
            """, (report_code, report_name, 'daily', report_date,
                  total_scans, valid_scans, error_scans, pending_scans, success_rate,
                  total_assets, devices_count, materials_count,
                  locations_count, departments_count, projects_count, receivers_count,
                  validation['validated_by'] or 1, datetime.now()))
            
            report_id = cur.fetchone()[0]
            print(f"✅ New report {report_code} created for {report_date}")
        
        # Update atau insert report items untuk asset ini
        if final_asset_id:
            # Cek apakah asset sudah ada di report_items untuk report ini
            cur.execute("""
                SELECT id_report_item FROM report_items 
                WHERE report_id = %s AND asset_id = %s
            """, (report_id, final_asset_id))
            
            if not cur.fetchone():
                # Get asset data from assets table
                cur.execute("""
                    SELECT 
                        asset_code, asset_name, category,
                        serial_number, scan_code, brand, vendor, model, specifications,
                        project_name, department_name, receiver_name, location_name
                    FROM assets 
                    WHERE id_assets = %s
                """, (final_asset_id,))
                asset_data = cur.fetchone()
                
                if asset_data:
                    cur.execute("""
                        INSERT INTO report_items (
                            report_id, asset_id, validation_id,
                            asset_code, asset_name, asset_type, category,
                            serial_number, scan_code, brand, vendor, model, specifications,
                            project_name, department_name, receiver_name, location_name,
                            validation_status, validated_by, validated_at, unique_code
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        report_id, final_asset_id, validation['id_validation'],
                        asset_data['asset_code'], asset_data['asset_name'], validation['validation_type'], asset_data['category'],
                        asset_data['serial_number'], asset_data['scan_code'], asset_data['brand'], asset_data['vendor'],
                        asset_data['model'], asset_data['specifications'],
                        asset_data['project_name'], asset_data['department_name'], asset_data['receiver_name'],
                        asset_data['location_name'],
                        validation['validation_status'], validation['validated_by'], validation['validated_at'],
                        validation['unique_code']
                    ))
                    print(f"✅ Report item added for asset {asset_data['asset_code']}")
        else:
            print(f"⚠️ No asset_id for validation {validation_id}, skipping report item")
        
        return True, report_id
        
    except Exception as e:
        print(f"Error creating/updating report: {e}")
        traceback.print_exc()
        return False, None

# ==================== GET ALL REPORTS ====================
@reports_bp.route('/api/reports', methods=['GET'])
def get_all_reports():
    """Mendapatkan daftar semua reports"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT 
                r.*,
                u.username as generated_by_name
            FROM reports r
            LEFT JOIN users u ON r.generated_by = u.id_user
            ORDER BY r.report_date DESC, r.created_at DESC
        """)
        
        reports = cur.fetchall()
        
        return jsonify({
            'success': True,
            'data': [dict(report) for report in reports],
            'count': len(reports)
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

# ==================== GET REPORT BY ID ====================
@reports_bp.route('/api/reports/<int:report_id>', methods=['GET'])
def get_report_by_id(report_id):
    """Mendapatkan detail report berdasarkan ID"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT 
                r.*,
                u.username as generated_by_name
            FROM reports r
            LEFT JOIN users u ON r.generated_by = u.id_user
            WHERE r.id_report = %s
        """, (report_id,))
        
        report = cur.fetchone()
        
        if not report:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
        
        # Get report items
        cur.execute("""
            SELECT 
                ri.*,
                ri.validated_by as validated_by_name
            FROM report_items ri
            WHERE ri.report_id = %s
            ORDER BY ri.id_report_item ASC
        """, (report_id,))
        
        items = cur.fetchall()
        
        return jsonify({
            'success': True,
            'data': dict(report),
            'items': [dict(item) for item in items],
            'items_count': len(items)
        })
        
    except Exception as e:
        print(f"Error getting report: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== GET REPORTS SUMMARY ====================
@reports_bp.route('/api/reports/summary', methods=['GET'])
def get_reports_summary():
    """Mendapatkan summary untuk dashboard reports"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Total reports
        cur.execute("SELECT COUNT(*) as total FROM reports")
        total_reports = cur.fetchone()['total']
        
        # Total assets from all reports
        cur.execute("SELECT SUM(total_assets) as total_assets FROM reports")
        total_assets = cur.fetchone()['total_assets'] or 0
        
        # Average success rate
        cur.execute("SELECT AVG(success_rate) as avg_success_rate FROM reports WHERE total_scans > 0")
        avg_success_rate = cur.fetchone()['avg_success_rate'] or 0
        
        # Reports last 7 days
        cur.execute("""
            SELECT report_date, total_scans, valid_scans, error_scans, success_rate
            FROM reports
            WHERE report_date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY report_date ASC
        """)
        weekly_data = cur.fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'total_reports': total_reports,
                'total_assets': total_assets,
                'avg_success_rate': round(float(avg_success_rate), 2),
                'weekly_data': [dict(row) for row in weekly_data]
            }
        })
        
    except Exception as e:
        print(f"Error getting reports summary: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== GET REPORTS STATS ====================
@reports_bp.route('/api/reports/stats', methods=['GET'])
def get_reports_stats():
    """Mendapatkan statistik untuk dashboard reports"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Statistik per bulan
        cur.execute("""
            SELECT 
                DATE_TRUNC('month', report_date) as month,
                COUNT(*) as report_count,
                SUM(total_scans) as total_scans,
                SUM(valid_scans) as valid_scans,
                SUM(error_scans) as error_scans,
                SUM(total_assets) as total_assets,
                AVG(success_rate) as avg_success_rate
            FROM reports
            GROUP BY DATE_TRUNC('month', report_date)
            ORDER BY month DESC
            LIMIT 6
        """)
        
        monthly_stats = cur.fetchall()
        
        # Statistik per type
        cur.execute("""
            SELECT 
                SUM(devices_count) as total_devices,
                SUM(materials_count) as total_materials
            FROM reports
        """)
        
        type_stats = cur.fetchone()
        
        return jsonify({
            'success': True,
            'data': {
                'monthly_stats': [dict(row) for row in monthly_stats],
                'type_stats': dict(type_stats) if type_stats else {'total_devices': 0, 'total_materials': 0}
            }
        })
        
    except Exception as e:
        print(f"Error getting reports stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== DELETE REPORT ====================
@reports_bp.route('/api/reports/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    """Menghapus report berdasarkan ID"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("SELECT id_report FROM reports WHERE id_report = %s", (report_id,))
        if not cur.fetchone():
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
        
        # Delete akan cascade ke report_items
        cur.execute("DELETE FROM reports WHERE id_report = %s", (report_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Report deleted successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error deleting report: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()