from flask import Blueprint, request, jsonify
from utils.scan_results_model import ScanResultsModel
from utils.database import get_db_connection
import psycopg2.extras
import traceback

scan_results_bp = Blueprint('scan_results', __name__)

@scan_results_bp.route('/api/scan-results/create', methods=['POST'])
def create_scan_result():
    """Menyimpan hasil scan ke database"""
    try:
        data = request.json
        print("="*50)
        print("Saving scan result:", data)
        
        result = ScanResultsModel.create_scan_result(data)
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in create_scan_result:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@scan_results_bp.route('/api/scan-results/preparation/<int:prep_id>', methods=['GET'])
def get_scan_results_by_preparation(prep_id):
    """Mendapatkan semua scan results untuk preparation tertentu"""
    try:
        result = ScanResultsModel.get_scan_results_by_preparation(prep_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in get_scan_results_by_preparation:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@scan_results_bp.route('/api/scan-results/<int:scan_id>', methods=['PUT'])
def update_scan_result(scan_id):
    """Update scan result"""
    try:
        data = request.json
        result = ScanResultsModel.update_scan_result(scan_id, data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in update_scan_result:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
        
@scan_results_bp.route('/api/scan-results/<int:scan_id>', methods=['DELETE'])
def delete_scan_result(scan_id):
    """Menghapus scan result dari database"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_scan, item_preparation_id FROM scan_results WHERE id_scan = %s", (scan_id,))
        scan = cur.fetchone()
        
        if not scan:
            return jsonify({
                'success': False,
                'error': 'Scan result not found'
            }), 404
        
        item_preparation_id = scan[1] if len(scan) > 1 else None
        cur.execute("DELETE FROM scan_results WHERE id_scan = %s", (scan_id,))
    
        if item_preparation_id:
            cur.execute("""
                SELECT COUNT(*) FROM scan_results 
                WHERE item_preparation_id = %s
            """, (item_preparation_id,))
            remaining_scans = cur.fetchone()[0]
            
            if remaining_scans == 0:
                cur.execute("""
                    UPDATE items_preparation 
                    SET status = 'pending', 
                        scanned_by = NULL,
                        scanned_at = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id_item_preparation = %s
                """, (item_preparation_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Scan result deleted successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in delete_scan_result: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scan_results_bp.route('/api/scan-results/pending', methods=['GET'])
def get_pending_scans():
    """Mendapatkan scan results yang pending untuk validasi"""
    try:
        result = ScanResultsModel.get_pending_scans()
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in get_pending_scans:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500