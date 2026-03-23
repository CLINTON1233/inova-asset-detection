import psycopg2.extras
from datetime import datetime
import json
from utils.database import get_db_connection

class ScanResultsModel:
    
    @staticmethod
    def create_scan_result(data):
        """Menyimpan hasil scan ke database - SEMUA DATA DISIMPAN DI SCAN_RESULTS"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            user_id = data.get('user_id', 1)
            scanned_by = data.get('scanned_by', user_id)
            scanned_at = data.get('scanned_at', datetime.now())
            
            scan_category = None
            if data.get('item_preparation_id'):
                cur.execute("""
                    SELECT ac.category_name
                    FROM items_preparation ip
                    JOIN scanning_preparations sp ON ip.preparation_id = sp.id_preparation
                    JOIN asset_categories ac ON sp.category_id = ac.id_category
                    WHERE ip.id_item_preparation = %s
                """, (data.get('item_preparation_id'),))
                result = cur.fetchone()
                if result:
                    scan_category = result['category_name']
            
            detection_data = {}
            if data.get('detection_data'):
                detection_data = data.get('detection_data')

            cur.execute("""
                INSERT INTO scan_results (
                    item_preparation_id, user_id, scanned_by, scanned_at,
                    scan_category, scan_value, serial_number, scan_code,
                    detection_data, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_scan
            """, (
                data.get('item_preparation_id'),
                user_id,
                scanned_by,
                scanned_at,
                scan_category,
                data.get('scan_value'),
                data.get('serial_number'),
                data.get('scan_code'),
                json.dumps(detection_data) if detection_data else None,
                data.get('status', 'pending'),
                data.get('notes')
            ))
            
            scan_id = cur.fetchone()[0]
            conn.commit()
            
            if data.get('item_preparation_id'):
                cur.execute("""
                    UPDATE items_preparation 
                    SET status = 'scanned', 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id_item_preparation = %s
                """, (data.get('item_preparation_id'),))
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
            return {'success': False, 'error': str(e)}
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def get_scan_results_by_preparation(preparation_id):
        """Mendapatkan scan results dengan data lengkap via JOIN"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            cur.execute("""
                SELECT 
                    sr.id_scan,
                    sr.item_preparation_id,
                    sr.user_id,
                    sr.scanned_by,
                    sr.scanned_at,
                    sr.scan_category,
                    sr.scan_value,
                    sr.serial_number,
                    sr.scan_code,
                    sr.detection_data,
                    sr.is_valid,
                    sr.status,
                    sr.notes,
                    sr.created_at,
                    ip.item_number,
                    ip.status as item_status,
                    si.item_name,
                    si.brand,
                    si.model,
                    si.specifications,
                    si.quantity,
                    u.username as scanned_by_name,
                    u2.username as user_name,
                    sp.checking_name,
                    sp.checking_number,
                    l.location_name
                FROM scan_results sr
                LEFT JOIN items_preparation ip ON sr.item_preparation_id = ip.id_item_preparation
                LEFT JOIN scanning_items si ON ip.scanning_item_id = si.id_item
                LEFT JOIN scanning_preparations sp ON si.preparation_id = sp.id_preparation
                LEFT JOIN locations l ON sp.location_id = l.id_location
                LEFT JOIN users u ON sr.scanned_by = u.id_user
                LEFT JOIN users u2 ON sr.user_id = u2.id_user
                WHERE sp.id_preparation = %s
                ORDER BY sr.scanned_at DESC
            """, (preparation_id,))
            
            results = cur.fetchall()
            return {
                'success': True,
                'data': [dict(row) for row in results],
                'total': len(results)
            }
            
        except Exception as e:
            print(f"Error getting scan results: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            if conn:
                conn.close()
                
    @staticmethod
    def delete_scan_result(scan_id):
        """Menghapus scan result dari database"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT item_preparation_id FROM scan_results WHERE id_scan = %s", (scan_id,))
            result = cur.fetchone()
            item_preparation_id = result[0] if result else None
            
            cur.execute("DELETE FROM scan_results WHERE id_scan = %s", (scan_id,))

            if item_preparation_id:
                cur.execute("""
                    SELECT COUNT(*) FROM scan_results WHERE item_preparation_id = %s
                """, (item_preparation_id,))
                remaining = cur.fetchone()[0]
                
                if remaining == 0:
                    cur.execute("""
                        UPDATE items_preparation 
                        SET status = 'pending', 
                            scanned_by = NULL,
                            scanned_at = NULL,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id_item_preparation = %s
                    """, (item_preparation_id,))
            
            conn.commit()
            return {'success': True, 'message': 'Scan result deleted successfully'}
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error deleting scan result: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def update_scan_result(scan_id, data):
        """Update scan result - UPDATE SERIAL NUMBER DI SCAN_RESULTS"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            update_fields = []
            values = []
            
            allowed_fields = ['is_valid', 'status', 'notes', 'serial_number', 'scan_code', 'scanned_by', 'scanned_at']
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
            return {'success': False, 'error': str(e)}
        finally:
            if conn:
                conn.close()