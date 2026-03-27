from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime
import random
import string
import traceback

validation_bp = Blueprint('validation', __name__)

def handle_error(e, msg="Error"):
    print(f"{msg}: {e}")
    print(traceback.format_exc())
    return jsonify({'success': False, 'error': str(e)}), 500

def get_conn():
    return get_db_connection()

def generate_unique_code():
    """Generate unique code untuk validation"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"VAL-{timestamp}-{random_str}"

# ==================== CREATE ====================
@validation_bp.route('/api/validations/create', methods=['POST'])
def create_validation():
    """Membuat record validasi dari scan result"""
    try:
        data = request.json
        scan_id = data.get('scan_id')
        user_id = data.get('user_id', 1)
        
        if not scan_id:
            return jsonify({'success': False, 'error': 'scan_id is required'}), 400
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Get scan result data (support both devices & materials)
        cur.execute("""
            SELECT sr.*, sp.checking_name, sp.checking_number
            FROM (
                SELECT id_scan, preparation_id, item_preparation_id, asset_id,
                       user_id, scan_category, scan_value, serial_number, scan_code,
                       detection_data, status, is_valid, notes, created_at,
                       NULL as asset_name, NULL as brand, NULL as model, NULL as category_id
                FROM scan_results_devices
                UNION ALL
                SELECT id_scan, preparation_id, item_preparation_id, asset_id,
                       user_id, scan_category, scan_value, serial_number, scan_code,
                       detection_data, status, is_valid, notes, created_at,
                       scan_value as asset_name, NULL as brand, NULL as model, NULL as category_id
                FROM scan_results_materials
            ) sr
            LEFT JOIN scanning_preparations sp ON sr.preparation_id = sp.id_preparation
            WHERE sr.id_scan = %s
        """, (scan_id,))
        
        scan = cur.fetchone()
        if not scan:
            return jsonify({'success': False, 'error': 'Scan result not found'}), 404
        
        unique_code = generate_unique_code()
        
        cur.execute("""
            INSERT INTO validations (
                scan_id, preparation_id, item_preparation_id, asset_id,
                user_id, validation_status, validation_notes, validated_by,
                validated_at, unique_code, is_approved, rejection_reason
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_validation
        """, (
            scan_id,
            scan['preparation_id'],
            scan['item_preparation_id'],
            scan['asset_id'],
            user_id,
            data.get('validation_status', 'pending'),
            data.get('validation_notes'),
            data.get('validated_by', user_id),
            datetime.now() if data.get('validation_status') != 'pending' else None,
            unique_code,
            data.get('is_approved', False),
            data.get('rejection_reason')
        ))
        
        validation_id = cur.fetchone()[0]
        
        # Update scan_result status
        if data.get('validation_status') != 'pending':
            table = 'scan_results_devices' if scan['scan_category'] == 'device' else 'scan_results_materials'
            cur.execute(f"""
                UPDATE {table} 
                SET status = 'validated', is_valid = %s
                WHERE id_scan = %s
            """, (data.get('is_approved', False), scan_id))
        
        # If approved, create asset
        if data.get('is_approved') and data.get('validation_status') == 'approved':
            cur.execute("""
                INSERT INTO assets (
                    category_id, asset_name, serial_number, scan_code, lokasi, status
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id_assets
            """, (
                scan.get('category_id'),
                scan.get('asset_name') or scan.get('scan_value'),
                scan.get('serial_number'),
                scan.get('scan_code'),
                data.get('location', 'Unknown'),
                'active'
            ))
            
            asset_id = cur.fetchone()[0]
            
            table = 'scan_results_devices' if scan['scan_category'] == 'device' else 'scan_results_materials'
            cur.execute(f"UPDATE {table} SET asset_id = %s WHERE id_scan = %s", (asset_id, scan_id))
            cur.execute("UPDATE validations SET asset_id = %s WHERE id_validation = %s", (asset_id, validation_id))
        
        conn.commit()
        return jsonify({
            'success': True,
            'validation_id': validation_id,
            'unique_code': unique_code,
            'message': 'Validation created successfully'
        }), 201
        
    except Exception as e:
        return handle_error(e, "Error in create_validation")
    finally:
        if 'conn' in locals() and conn: conn.close()

# ==================== UPDATE ====================
@validation_bp.route('/api/validations/<int:validation_id>', methods=['PUT'])
def update_validation(validation_id):
    """Update validation status"""
    try:
        data = request.json
        
        conn = get_conn()
        cur = conn.cursor()
        
        updates = []
        values = []
        
        for field in ['validation_status', 'validation_notes', 'is_approved', 'rejection_reason']:
            if field in data:
                updates.append(f"{field} = %s")
                values.append(data[field])
        
        if data.get('validation_status') and data['validation_status'] != 'pending':
            updates.append("validated_at = %s")
            values.append(datetime.now())
        
        if not updates:
            return jsonify({'success': False, 'error': 'No fields to update'}), 400
        
        values.append(validation_id)
        cur.execute(f"UPDATE validations SET {', '.join(updates)} WHERE id_validation = %s", values)
        
        # Get scan_id and scan_category to update scan_result
        cur.execute("""
            SELECT v.scan_id, sr.scan_category 
            FROM validations v
            LEFT JOIN (
                SELECT id_scan, 'device' as scan_category FROM scan_results_devices
                UNION ALL
                SELECT id_scan, 'material' as scan_category FROM scan_results_materials
            ) sr ON v.scan_id = sr.id_scan
            WHERE v.id_validation = %s
        """, (validation_id,))
        result = cur.fetchone()
        
        if result:
            scan_id, scan_category = result
            table = 'scan_results_devices' if scan_category == 'device' else 'scan_results_materials'
            
            if data.get('validation_status') == 'approved':
                cur.execute(f"UPDATE {table} SET status = 'validated', is_valid = TRUE WHERE id_scan = %s", (scan_id,))
            elif data.get('validation_status') == 'rejected':
                cur.execute(f"UPDATE {table} SET status = 'rejected', is_valid = FALSE WHERE id_scan = %s", (scan_id,))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Validation updated successfully'})
        
    except Exception as e:
        return handle_error(e, "Error in update_validation")
    finally:
        if 'conn' in locals() and conn: conn.close()

# ==================== GET ====================
@validation_bp.route('/api/validations', methods=['GET'])
def get_validations():
    """Mendapatkan daftar validations"""
    try:
        status = request.args.get('status', 'all')
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        query = """
            SELECT v.*, 
                   COALESCE(sr.scan_value, sr_d.scan_value) as scan_value,
                   COALESCE(sr.serial_number, sr_d.serial_number) as serial_number,
                   COALESCE(sr.scan_code, sr_d.scan_code) as scan_code,
                   COALESCE(sr.asset_name, sr_d.scan_value) as asset_name,
                   sr_d.brand, sr_d.model, sr_d.confidence,
                   sp.checking_name, sp.checking_number,
                   l.location_name,
                   u.username as scanned_by_name,
                   vu.username as validated_by_name
            FROM validations v
            LEFT JOIN scan_results_materials sr ON v.scan_id = sr.id_scan
            LEFT JOIN scan_results_devices sr_d ON v.scan_id = sr_d.id_scan
            LEFT JOIN scanning_preparations sp ON v.preparation_id = sp.id_preparation
            LEFT JOIN locations l ON sp.location_id = l.id_location
            LEFT JOIN users u ON COALESCE(sr.user_id, sr_d.user_id) = u.id_user
            LEFT JOIN users vu ON v.validated_by = vu.id_user
        """
        
        params = []
        if status and status != 'all':
            query += " WHERE v.validation_status = %s"
            params.append(status)
        
        query += " ORDER BY v.created_at DESC"
        
        cur.execute(query, params)
        results = cur.fetchall()
        
        return jsonify({
            'success': True,
            'data': [dict(row) for row in results],
            'total': len(results)
        })
        
    except Exception as e:
        return handle_error(e, "Error in get_validations")
    finally:
        if 'conn' in locals() and conn: conn.close()

@validation_bp.route('/api/validations/<int:validation_id>/detail', methods=['GET'])
def get_validation_detail(validation_id):
    """Mendapatkan detail validation"""
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT v.*, 
                   COALESCE(sr.scan_value, sr_d.scan_value) as scan_value,
                   COALESCE(sr.serial_number, sr_d.serial_number) as serial_number,
                   COALESCE(sr.scan_code, sr_d.scan_code) as scan_code,
                   COALESCE(sr.asset_name, sr_d.scan_value) as asset_name,
                   sr_d.brand, sr_d.model, sr_d.specifications, sr_d.confidence,
                   COALESCE(sr.photo_proof, sr_d.photo_proof) as photo_proof,
                   COALESCE(sr.scan_time, sr_d.scan_time) as scan_time,
                   sp.checking_name, sp.checking_number, sp.checking_date,
                   l.location_name, l.id_location,
                   u.username as scanned_by_name,
                   vu.username as validated_by_name,
                   ip.item_number, ip.status as item_status
            FROM validations v
            LEFT JOIN scan_results_materials sr ON v.scan_id = sr.id_scan
            LEFT JOIN scan_results_devices sr_d ON v.scan_id = sr_d.id_scan
            LEFT JOIN scanning_preparations sp ON v.preparation_id = sp.id_preparation
            LEFT JOIN locations l ON sp.location_id = l.id_location
            LEFT JOIN users u ON COALESCE(sr.user_id, sr_d.user_id) = u.id_user
            LEFT JOIN users vu ON v.validated_by = vu.id_user
            LEFT JOIN items_preparation ip ON v.item_preparation_id = ip.id_item_preparation
            WHERE v.id_validation = %s
        """, (validation_id,))
        
        result = cur.fetchone()
        
        if not result:
            return jsonify({'success': False, 'error': 'Validation not found'}), 404
        
        return jsonify({'success': True, 'data': dict(result)})
        
    except Exception as e:
        return handle_error(e, "Error in get_validation_detail")
    finally:
        if 'conn' in locals() and conn: conn.close()

# ==================== BULK ====================
@validation_bp.route('/api/validations/bulk', methods=['POST'])
def bulk_validate():
    """Bulk validation untuk multiple items"""
    try:
        data = request.json
        validation_ids = data.get('validation_ids', [])
        validation_data = data.get('data', {})
        
        if not validation_ids:
            return jsonify({'success': False, 'error': 'validation_ids is required'}), 400
        
        conn = get_conn()
        cur = conn.cursor()
        
        success_count = 0
        failed_count = 0
        errors = []
        
        for validation_id in validation_ids:
            try:
                updates = []
                values = []
                
                for field in ['validation_status', 'validation_notes', 'is_approved', 'rejection_reason']:
                    if field in validation_data:
                        updates.append(f"{field} = %s")
                        values.append(validation_data[field])
                
                if validation_data.get('validation_status') and validation_data['validation_status'] != 'pending':
                    updates.append("validated_at = %s")
                    values.append(datetime.now())
                
                if updates:
                    values.append(validation_id)
                    cur.execute(f"UPDATE validations SET {', '.join(updates)} WHERE id_validation = %s", values)
                    
                    # Update scan_result status
                    cur.execute("""
                        SELECT v.scan_id, COALESCE(sr.scan_category, sr_d.scan_category) as scan_category
                        FROM validations v
                        LEFT JOIN scan_results_materials sr ON v.scan_id = sr.id_scan
                        LEFT JOIN scan_results_devices sr_d ON v.scan_id = sr_d.id_scan
                        WHERE v.id_validation = %s
                    """, (validation_id,))
                    result = cur.fetchone()
                    
                    if result:
                        scan_id, scan_category = result
                        table = 'scan_results_devices' if scan_category == 'device' else 'scan_results_materials'
                        
                        if validation_data.get('validation_status') == 'approved':
                            cur.execute(f"UPDATE {table} SET status = 'validated', is_valid = TRUE WHERE id_scan = %s", (scan_id,))
                        elif validation_data.get('validation_status') == 'rejected':
                            cur.execute(f"UPDATE {table} SET status = 'rejected', is_valid = FALSE WHERE id_scan = %s", (scan_id,))
                
                success_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append({'validation_id': validation_id, 'error': str(e)})
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'success_count': success_count,
            'failed_count': failed_count,
            'errors': errors if errors else None,
            'message': f'{success_count} items validated successfully, {failed_count} failed'
        })
        
    except Exception as e:
        return handle_error(e, "Error in bulk_validate")
    finally:
        if 'conn' in locals() and conn: conn.close()