from flask import Blueprint, request, jsonify
from utils.scan_results_model import ScanResultsModel
from utils.database import get_db_connection
import psycopg2.extras
import traceback

scan_results_bp = Blueprint('scan_results', __name__)

@scan_results_bp.route('/api/scan-results/create-device', methods=['POST'])
def create_scan_result_device():
    """Menyimpan hasil scan device ke database"""
    try:
        data = request.json
        print("="*50)
        print("Saving DEVICE scan result:", data)
        
        result = ScanResultsModel.create_scan_result_device(data)
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in create_scan_result_device:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@scan_results_bp.route('/api/scan-results/create-material', methods=['POST'])
def create_scan_result_material():
    """Menyimpan hasil scan material ke database"""
    try:
        data = request.json
        print("="*50)
        print("Saving MATERIAL scan result:", data)
        
        result = ScanResultsModel.create_scan_result_material(data)
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in create_scan_result_material:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@scan_results_bp.route('/api/scan-results/device/<int:scan_id>', methods=['PUT'])
def update_scan_result_device(scan_id):
    """Update scan result device"""
    try:
        data = request.json
        result = ScanResultsModel.update_scan_result_device(scan_id, data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in update_scan_result_device:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@scan_results_bp.route('/api/scan-results/material/<int:scan_id>', methods=['PUT'])
def update_scan_result_material(scan_id):
    """Update scan result material"""
    try:
        data = request.json
        result = ScanResultsModel.update_scan_result_material(scan_id, data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in update_scan_result_material:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@scan_results_bp.route('/api/scan-results/device/<int:scan_id>', methods=['DELETE'])
def delete_scan_result_device(scan_id):
    """Menghapus scan result device dari database"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Cek apakah scan result exists
        cur.execute("SELECT id_scan, item_preparation_id FROM scan_results_devices WHERE id_scan = %s", (scan_id,))
        scan = cur.fetchone()
        
        if not scan:
            return jsonify({
                'success': False,
                'error': 'Scan result not found'
            }), 404
        
        item_preparation_id = scan[1] if len(scan) > 1 else None
        
        # Delete scan result
        cur.execute("DELETE FROM scan_results_devices WHERE id_scan = %s", (scan_id,))
    
        # Update items_preparation status jika tidak ada scan lain
        if item_preparation_id:
            cur.execute("""
                SELECT COUNT(*) FROM scan_results_devices 
                WHERE item_preparation_id = %s
            """, (item_preparation_id,))
            remaining_scans = cur.fetchone()[0]
            
            if remaining_scans == 0:
                cur.execute("""
                    UPDATE devices_items_preparation 
                    SET status = 'pending', 
                        scanned_by = NULL,
                        scanned_at = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id_item_preparation = %s
                """, (item_preparation_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device scan result deleted successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in delete_scan_result_device: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scan_results_bp.route('/api/scan-results/material/<int:scan_id>', methods=['DELETE'])
def delete_scan_result_material(scan_id):
    """Menghapus scan result material dari database"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Cek apakah scan result exists
        cur.execute("SELECT id_scan, item_preparation_id FROM scan_results_materials WHERE id_scan = %s", (scan_id,))
        scan = cur.fetchone()
        
        if not scan:
            return jsonify({
                'success': False,
                'error': 'Scan result not found'
            }), 404
        
        item_preparation_id = scan[1] if len(scan) > 1 else None
        
        # Delete scan result
        cur.execute("DELETE FROM scan_results_materials WHERE id_scan = %s", (scan_id,))
    
        # Update items_preparation status jika tidak ada scan lain
        if item_preparation_id:
            cur.execute("""
                SELECT COUNT(*) FROM scan_results_materials 
                WHERE item_preparation_id = %s
            """, (item_preparation_id,))
            remaining_scans = cur.fetchone()[0]
            
            if remaining_scans == 0:
                cur.execute("""
                    UPDATE materials_items_preparation 
                    SET status = 'pending', 
                        scanned_by = NULL,
                        scanned_at = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id_item_preparation = %s
                """, (item_preparation_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Material scan result deleted successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in delete_scan_result_material: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
@scan_results_bp.route('/check-scan-code', methods=['GET'])
def check_scan_code():
    """Cek apakah scan code sudah digunakan"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        scan_code = request.args.get('code')
        if not scan_code:
            return jsonify({'success': False, 'error': 'No scan code provided'}), 400
        
        cur.execute("""
            SELECT EXISTS(
                SELECT 1 FROM scan_results_materials WHERE scan_code = %s
                UNION
                SELECT 1 FROM materials_items_preparation WHERE scan_code = %s AND status = 'scanned'
            ) as exists
        """, (scan_code, scan_code))
        
        result = cur.fetchone()
        exists = result[0] if result else False
        
        return jsonify({
            'success': True,
            'exists': exists
        })
        
    except Exception as e:
        print(f"Error checking scan code: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scan_results_bp.route('/api/scan-results/check-serial', methods=['GET'])
def check_serial_exists():
    """Memeriksa apakah serial number sudah ada di database"""
    conn = None
    try:
        serial_number = request.args.get('serial', '')
        
        if not serial_number:
            return jsonify({
                'success': False,
                'exists': False,
                'error': 'Serial number is required'
            }), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Cek di scan_results_devices
        cur.execute("""
            SELECT COUNT(*) FROM scan_results_devices 
            WHERE serial_number = %s
        """, (serial_number,))
        device_count = cur.fetchone()[0]
        
        # Cek di scan_results_materials (untuk scan_code)
        cur.execute("""
            SELECT COUNT(*) FROM scan_results_materials 
            WHERE scan_code = %s
        """, (serial_number,))
        material_count = cur.fetchone()[0]
        
        exists = device_count > 0 or material_count > 0
        
        return jsonify({
            'success': True,
            'exists': exists,
            'message': 'Serial number check completed'
        })
        
    except Exception as e:
        print(f"Error checking serial exists: {e}")
        return jsonify({
            'success': False,
            'exists': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()