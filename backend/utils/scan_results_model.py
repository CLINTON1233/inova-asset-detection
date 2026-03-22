import psycopg2.extras
from datetime import datetime
import json
from utils.database import get_db_connection

class ScanResultsModel:
    """Model untuk mengelola scan_results"""
    
    @staticmethod
    def create_scan_result(data):
        """Menyimpan hasil scan ke database"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            cur.execute("""
                INSERT INTO scan_results (
                    preparation_id, scanning_item_id, item_preparation_id,
                    user_id, scan_type, scan_value, serial_number, scan_code,
                    asset_name, brand, model, specifications, confidence,
                    bounding_box, photo_proof, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_scan
            """, (
                data.get('preparation_id'),
                data.get('scanning_item_id'),
                data.get('item_preparation_id'),
                data.get('user_id', 1),
                data.get('scan_type'),  # 'device', 'serial', 'manual'
                data.get('scan_value'),
                data.get('serial_number'),
                data.get('scan_code'),
                data.get('asset_name'),
                data.get('brand'),
                data.get('model'),
                data.get('specifications'),
                data.get('confidence', 0),
                json.dumps(data.get('bounding_box')) if data.get('bounding_box') else None,
                data.get('photo_proof'),
                data.get('status', 'pending'),
                data.get('notes')
            ))
            
            scan_id = cur.fetchone()[0]
            conn.commit()
            
            # Update items_preparation status
            if data.get('item_preparation_id'):
                cur.execute("""
                    UPDATE items_preparation 
                    SET status = 'scanned', scanned_at = CURRENT_TIMESTAMP, scanned_by = %s
                    WHERE id_item_preparation = %s
                """, (data.get('user_id', 1), data.get('item_preparation_id')))
                conn.commit()
            
            return {
                'success': True,
                'scan_id': scan_id,
                'message': 'Scan result saved successfully'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error creating scan result: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def get_scan_results_by_preparation(preparation_id):
        """Mendapatkan semua scan results untuk preparation tertentu"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            cur.execute("""
                SELECT sr.*, 
                       u.username as scanned_by_name,
                       ip.item_number,
                       ip.status as item_status
                FROM scan_results sr
                LEFT JOIN users u ON sr.user_id = u.id_user
                LEFT JOIN items_preparation ip ON sr.item_preparation_id = ip.id_item_preparation
                WHERE sr.preparation_id = %s
                ORDER BY sr.scan_time DESC
            """, (preparation_id,))
            
            results = cur.fetchall()
            return {
                'success': True,
                'data': [dict(row) for row in results],
                'total': len(results)
            }
            
        except Exception as e:
            print(f"Error getting scan results: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def update_scan_result(scan_id, data):
        """Update scan result"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            update_fields = []
            values = []
            
            allowed_fields = ['is_valid', 'status', 'notes', 'serial_number', 'scan_code']
            for field in allowed_fields:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    values.append(data[field])
            
            if not update_fields:
                return {'success': False, 'error': 'No fields to update'}
            
            values.append(scan_id)
            query = f"UPDATE scan_results SET {', '.join(update_fields)} WHERE id_scan = %s"
            cur.execute(query, values)
            
            conn.commit()
            return {
                'success': True,
                'message': 'Scan result updated successfully'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error updating scan result: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def get_pending_scans():
        """Mendapatkan scan results yang pending untuk validasi"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            cur.execute("""
                SELECT sr.*, 
                       sp.checking_name,
                       sp.checking_number,
                       l.location_name,
                       u.username as scanned_by_name
                FROM scan_results sr
                LEFT JOIN scanning_preparations sp ON sr.preparation_id = sp.id_preparation
                LEFT JOIN locations l ON sp.location_id = l.id_location
                LEFT JOIN users u ON sr.user_id = u.id_user
                WHERE sr.status = 'pending' OR sr.is_valid = FALSE
                ORDER BY sr.scan_time DESC
            """)
            
            results = cur.fetchall()
            return {
                'success': True,
                'data': [dict(row) for row in results],
                'total': len(results)
            }
            
        except Exception as e:
            print(f"Error getting pending scans: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if conn:
                conn.close()