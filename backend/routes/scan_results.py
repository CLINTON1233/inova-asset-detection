from flask import Blueprint, request, jsonify, current_app
from utils.database import get_db_connection
import psycopg2.extras
import json
from datetime import datetime
import traceback
import base64
import uuid
import os

scan_results_bp = Blueprint('scan_results', __name__)

def handle_error(e, msg="Error"):
    print(f"{msg}: {e}")
    print(traceback.format_exc())
    return jsonify({'success': False, 'error': str(e)}), 500

def get_conn():
    return get_db_connection()

# ==================== RESET SCAN RESULT ====================
@scan_results_bp.route('/api/scan-results/reset/<int:scan_id>', methods=['PUT'])
def reset_scan_result(scan_id):
    """Reset scan result status to pending (for rescan after rejection)"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE scan_results_devices 
            SET status = 'pending', 
                notes = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_scan = %s AND status = 'rejected'
            RETURNING id_scan
        """, (scan_id,))
        
        updated = cur.fetchone()
        
        if not updated:
            cur.execute("""
                UPDATE scan_results_materials 
                SET status = 'pending', 
                    notes = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_scan = %s AND status = 'rejected'
                RETURNING id_scan
            """, (scan_id,))
            updated = cur.fetchone()
        
        if not updated:
            return jsonify({
                'success': False, 
                'error': 'Scan result not found or not in rejected status'
            }), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Scan result reset successfully, ready for rescan'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error resetting scan result: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

# ==================== FUNGSI SAVE PHOTO ====================
def save_photo_base64(image_data):
    """Menyimpan foto dari base64 ke file dan mengembalikan URL"""
    try:
        if not image_data:
            return None, None
        
        # Jika sudah berupa URL atau path, langsung return
        if image_data.startswith('/uploads/') or image_data.startswith('http'):
            return image_data, image_data
        
        # Handle jika image_data adalah dict dengan key 'data'
        if isinstance(image_data, dict):
            if 'data' in image_data:
                image_data = image_data['data']
            elif 'base64' in image_data:
                image_data = image_data['base64']
        
        # Clean the base64 string
        if isinstance(image_data, str):
            # Remove data URL prefix if present
            if 'base64,' in image_data:
                image_data = image_data.split('base64,')[1]
            
            # Remove any whitespace or newlines
            image_data = image_data.strip()
            
            # Try to decode
            try:
                image_bytes = base64.b64decode(image_data)
            except Exception as e:
                print(f"Error decoding base64: {e}")
                # Try with padding
                missing_padding = len(image_data) % 4
                if missing_padding:
                    image_data += '=' * (4 - missing_padding)
                image_bytes = base64.b64decode(image_data)
        else:
            print(f"Unexpected image_data type: {type(image_data)}")
            return None, None
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"scan_{timestamp}_{unique_id}.jpg"
        
        # Gunakan folder uploads/scan_photos
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        upload_folder = os.path.join(base_dir, 'uploads', 'scan_photos')
        os.makedirs(upload_folder, exist_ok=True)
        
        filepath = os.path.join(upload_folder, filename)
        
        # Save file
        with open(filepath, 'wb') as f:
            f.write(image_bytes)
        
        # URL yang dikembalikan
        url = f"/uploads/scan_photos/{filename}"
        print(f"Photo saved at: {filepath}")
        print(f"Photo URL: {url}")
        return url, image_data
        
    except Exception as e:
        print(f"Error saving photo: {e}")
        import traceback
        traceback.print_exc()
        return None, None
    
# ==================== UPDATE PHOTO ====================
@scan_results_bp.route('/api/scan-results/update-photo/<int:scan_id>', methods=['PUT'])
def update_scan_photo(scan_id):
    """Update photo untuk scan result"""
    conn = None
    try:
        data = request.json
        photo_data = data.get('photo_data')
        
        if not photo_data:
            return jsonify({'success': False, 'error': 'No photo data provided'}), 400
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Save photo
        photo_url, saved_photo_data = save_photo_base64(photo_data)
        
        if not photo_url:
            return jsonify({'success': False, 'error': 'Failed to save photo'}), 500
        
        # Coba update di scan_results_devices
        cur.execute("""
            UPDATE scan_results_devices 
            SET photo_url = %s, photo_data = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id_scan = %s
            RETURNING id_scan
        """, (photo_url, saved_photo_data, scan_id))
        
        updated = cur.fetchone()
        
        if not updated:
            # Coba update di scan_results_materials
            cur.execute("""
                UPDATE scan_results_materials 
                SET photo_url = %s, photo_data = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id_scan = %s
                RETURNING id_scan
            """, (photo_url, saved_photo_data, scan_id))
            updated = cur.fetchone()
        
        if not updated:
            return jsonify({'success': False, 'error': f'Scan result with id {scan_id} not found in devices or materials table'}), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'photo_url': photo_url,
            'message': 'Photo updated successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating photo: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()
            
# ==================== GET SCAN RESULT BY ID ====================
@scan_results_bp.route('/api/scan-results/device/<int:scan_id>', methods=['GET'])
def get_scan_result_device(scan_id):
    """Mendapatkan detail scan result device berdasarkan ID"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT * FROM scan_results_devices WHERE id_scan = %s
        """, (scan_id,))
        
        scan = cur.fetchone()
        
        if not scan:
            return jsonify({
                'success': False,
                'error': 'Scan result not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': dict(scan)
        })
        
    except Exception as e:
        return handle_error(e, "Error getting scan result device")
    finally:
        if conn:
            conn.close()

@scan_results_bp.route('/api/scan-results/material/<int:scan_id>', methods=['GET'])
def get_scan_result_material(scan_id):
    """Mendapatkan detail scan result material berdasarkan ID"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT * FROM scan_results_materials WHERE id_scan = %s
        """, (scan_id,))
        
        scan = cur.fetchone()
        
        if not scan:
            return jsonify({
                'success': False,
                'error': 'Scan result not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': dict(scan)
        })
        
    except Exception as e:
        return handle_error(e, "Error getting scan result material")
    finally:
        if conn:
            conn.close()

# ==================== CREATE DEVICE ====================
@scan_results_bp.route('/api/scan-results/create-device', methods=['POST'])
def create_scan_result_device():
    try:
        data = request.json
        print("="*50, "\nSaving DEVICE scan result:", data)
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Save photo if exists
        photo_url = None
        photo_data = None
        if data.get('photo_data'):
            photo_url, photo_data = save_photo_base64(data.get('photo_data'))
            print(f"Saved photo URL: {photo_url}")
        
        cur.execute("""
            INSERT INTO scan_results_devices (
                item_preparation_id, user_id, scanned_by, scanned_at,
                scan_category, scan_value, serial_number,
                detection_data, status, notes, photo_data, photo_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_scan
        """, (
            data.get('item_preparation_id'),
            data.get('user_id', 1),
            data.get('scanned_by', data.get('user_id', 1)),
            data.get('scanned_at', datetime.now()),
            data.get('scan_category'),
            data.get('scan_value'),
            data.get('serial_number'),
            json.dumps(data.get('detection_data', {})),
            data.get('status', 'pending'),
            data.get('notes'),
            photo_data,
            photo_url  
        ))
        
        scan_id = cur.fetchone()[0]
        
        if data.get('item_preparation_id'):
            cur.execute("""
                UPDATE devices_items_preparation 
                SET status = 'scanned', scanned_by = %s, scanned_at = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id_item_preparation = %s
            """, (data.get('scanned_by', data.get('user_id', 1)), data.get('scanned_at', datetime.now()), data.get('item_preparation_id')))
        
        conn.commit()
        return jsonify({'success': True, 'scan_id': scan_id, 'photo_url': photo_url, 'message': 'Device scan result saved successfully'}), 201
        
    except Exception as e:
        return handle_error(e, "Error in create_scan_result_device")
    finally:
        if 'conn' in locals() and conn: conn.close()

# ==================== CREATE MATERIAL ====================
@scan_results_bp.route('/api/scan-results/create-material', methods=['POST'])
def create_scan_result_material():
    try:
        data = request.json
        print("="*50, "\nSaving MATERIAL scan result:", data)
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Save photo if exists
        photo_url = None
        photo_data = None
        if data.get('photo_data'):
            photo_url, photo_data = save_photo_base64(data.get('photo_data'))
        
        cur.execute("""
            INSERT INTO scan_results_materials (
                item_preparation_id, user_id, scanned_by, scanned_at,
                scan_category, scan_value, scan_code,
                detection_data, status, notes, photo_data, photo_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_scan
        """, (
            data.get('item_preparation_id'),
            data.get('user_id', 1),
            data.get('scanned_by', data.get('user_id', 1)),
            data.get('scanned_at', datetime.now()),
            data.get('scan_category'),
            data.get('scan_value'),
            data.get('scan_code'),
            json.dumps(data.get('detection_data', {})),
            data.get('status', 'pending'),
            data.get('notes'),
            photo_data,
            photo_url
        ))
        
        scan_id = cur.fetchone()[0]
        
        if data.get('item_preparation_id'):
            cur.execute("""
                UPDATE materials_items_preparation 
                SET status = 'scanned', scanned_by = %s, scanned_at = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id_item_preparation = %s
            """, (data.get('scanned_by', data.get('user_id', 1)), data.get('scanned_at', datetime.now()), data.get('item_preparation_id')))
        
        conn.commit()
        return jsonify({'success': True, 'scan_id': scan_id, 'photo_url': photo_url, 'message': 'Material scan result saved successfully'}), 201
        
    except Exception as e:
        return handle_error(e, "Error in create_scan_result_material")
    finally:
        if 'conn' in locals() and conn: conn.close()

# ==================== UPDATE ====================
def update_scan_result(table, scan_id, data, allowed_fields):
    try:
        updates = [(f, data[f]) for f in allowed_fields if f in data]
        if not updates:
            return jsonify({'success': False, 'error': 'No fields to update'}), 400
        
        conn = get_conn()
        cur = conn.cursor()
        query = f"UPDATE {table} SET {', '.join([f'{f} = %s' for f, _ in updates])} WHERE id_scan = %s"
        cur.execute(query, [v for _, v in updates] + [scan_id])
        conn.commit()
        return jsonify({'success': True, 'message': f'Scan result updated successfully'})
        
    except Exception as e:
        return handle_error(e, f"Error updating {table}")
    finally:
        if 'conn' in locals() and conn: conn.close()

@scan_results_bp.route('/api/scan-results/device/<int:scan_id>', methods=['PUT'])
def update_scan_result_device(scan_id):
    return update_scan_result('scan_results_devices', scan_id, request.json, ['is_valid', 'status', 'notes', 'serial_number'])

@scan_results_bp.route('/api/scan-results/material/<int:scan_id>', methods=['PUT'])
def update_scan_result_material(scan_id):
    return update_scan_result('scan_results_materials', scan_id, request.json, ['is_valid', 'status', 'notes', 'scan_code'])

# ==================== DELETE ====================
def delete_scan_result(table, scan_id, prep_table, prep_id_field):
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute(f"SELECT id_scan, item_preparation_id FROM {table} WHERE id_scan = %s", (scan_id,))
        scan = cur.fetchone()
        if not scan:
            return jsonify({'success': False, 'error': 'Scan result not found'}), 404
        
        item_prep_id = scan[1] if len(scan) > 1 else None
        
        cur.execute(f"DELETE FROM {table} WHERE id_scan = %s", (scan_id,))
        
        if item_prep_id:
            cur.execute(f"SELECT COUNT(*) FROM {table} WHERE item_preparation_id = %s", (item_prep_id,))
            if cur.fetchone()[0] == 0:
                cur.execute(f"""
                    UPDATE {prep_table} 
                    SET status = 'pending', scanned_by = NULL, scanned_at = NULL, updated_at = CURRENT_TIMESTAMP
                    WHERE {prep_id_field} = %s
                """, (item_prep_id,))
        
        conn.commit()
        return jsonify({'success': True, 'message': f'Scan result deleted successfully'})
        
    except Exception as e:
        if conn: conn.rollback()
        return handle_error(e, f"Error deleting from {table}")
    finally:
        if conn: conn.close()

@scan_results_bp.route('/api/scan-results/device/<int:scan_id>', methods=['DELETE'])
def delete_scan_result_device(scan_id):
    return delete_scan_result('scan_results_devices', scan_id, 'devices_items_preparation', 'id_item_preparation')

@scan_results_bp.route('/api/scan-results/material/<int:scan_id>', methods=['DELETE'])
def delete_scan_result_material(scan_id):
    return delete_scan_result('scan_results_materials', scan_id, 'materials_items_preparation', 'id_item_preparation')

# ==================== CHECK ====================
@scan_results_bp.route('/api/scan-results/check-serial', methods=['GET'])
def check_serial_exists():
    serial = request.args.get('serial')
    if not serial:
        return jsonify({'success': False, 'exists': False, 'error': 'Serial number is required'}), 400
    
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM scan_results_devices WHERE serial_number = %s", (serial,))
        device_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM scan_results_materials WHERE scan_code = %s", (serial,))
        material_count = cur.fetchone()[0]
        
        return jsonify({'success': True, 'exists': device_count > 0 or material_count > 0})
        
    except Exception as e:
        return handle_error(e, "Error checking serial")
    finally:
        if 'conn' in locals() and conn: conn.close()

@scan_results_bp.route('/api/scan-results/check-scan-code', methods=['GET'])
def check_scan_code_exists():
    code = request.args.get('code')
    if not code:
        return jsonify({'success': False, 'exists': False, 'error': 'Scan code is required'}), 400
    
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM scan_results_materials WHERE scan_code = %s", (code,))
        material_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM materials_items_preparation WHERE scan_code = %s AND status = 'scanned'", (code,))
        item_count = cur.fetchone()[0]
        
        return jsonify({'success': True, 'exists': material_count > 0 or item_count > 0})
        
    except Exception as e:
        return handle_error(e, "Error checking scan code")
    finally:
        if 'conn' in locals() and conn: conn.close()