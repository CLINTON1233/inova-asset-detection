import psycopg2.extras
from datetime import datetime
import json
from utils.database import get_db_connection

class ScanResultsModel:
    
    @staticmethod
    def create_scan_result_device(data):
        """Menyimpan hasil scan device ke database"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            user_id = data.get('user_id', 1)
            scanned_by = data.get('scanned_by', user_id)
            scanned_at = data.get('scanned_at', datetime.now())
            
            detection_data = {}
            if data.get('detection_data'):
                detection_data = data.get('detection_data')

            cur.execute("""
                INSERT INTO scan_results_devices (
                    item_preparation_id, user_id, scanned_by, scanned_at,
                    scan_category, scan_value, serial_number,
                    detection_data, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_scan
            """, (
                data.get('item_preparation_id'),
                user_id,
                scanned_by,
                scanned_at,
                data.get('scan_category'),
                data.get('scan_value'),
                data.get('serial_number'),
                json.dumps(detection_data) if detection_data else None,
                data.get('status', 'pending'),
                data.get('notes')
            ))
            
            scan_id = cur.fetchone()[0]
            conn.commit()
            
            if data.get('item_preparation_id'):
                cur.execute("""
                    UPDATE devices_items_preparation 
                    SET status = 'scanned', 
                        scanned_by = %s,
                        scanned_at = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id_item_preparation = %s
                """, (scanned_by, scanned_at, data.get('item_preparation_id')))
                conn.commit()
            
            return {
                'success': True,
                'scan_id': scan_id,
                'message': 'Device scan result saved successfully'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error creating device scan result: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def create_scan_result_material(data):
        """Menyimpan hasil scan material ke database"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            user_id = data.get('user_id', 1)
            scanned_by = data.get('scanned_by', user_id)
            scanned_at = data.get('scanned_at', datetime.now())
            
            detection_data = {}
            if data.get('detection_data'):
                detection_data = data.get('detection_data')

            cur.execute("""
                INSERT INTO scan_results_materials (
                    item_preparation_id, user_id, scanned_by, scanned_at,
                    scan_category, scan_value, scan_code,
                    detection_data, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_scan
            """, (
                data.get('item_preparation_id'),
                user_id,
                scanned_by,
                scanned_at,
                data.get('scan_category'),
                data.get('scan_value'),
                data.get('scan_code'),
                json.dumps(detection_data) if detection_data else None,
                data.get('status', 'pending'),
                data.get('notes')
            ))
            
            scan_id = cur.fetchone()[0]
            conn.commit()
            
            if data.get('item_preparation_id'):
                cur.execute("""
                    UPDATE materials_items_preparation 
                    SET status = 'scanned', 
                        scanned_by = %s,
                        scanned_at = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id_item_preparation = %s
                """, (scanned_by, scanned_at, data.get('item_preparation_id')))
                conn.commit()
            
            return {
                'success': True,
                'scan_id': scan_id,
                'message': 'Material scan result saved successfully'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error creating material scan result: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def update_scan_result_device(scan_id, data):
        """Update scan result device"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            update_fields = []
            values = []
            
            allowed_fields = ['is_valid', 'status', 'notes', 'serial_number']
            for field in allowed_fields:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    values.append(data[field])
            
            if not update_fields:
                return {'success': False, 'error': 'No fields to update'}
            
            values.append(scan_id)
            query = f"UPDATE scan_results_devices SET {', '.join(update_fields)} WHERE id_scan = %s"
            cur.execute(query, values)
            
            conn.commit()
            return {
                'success': True,
                'message': 'Device scan result updated successfully'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error updating device scan result: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def update_scan_result_material(scan_id, data):
        """Update scan result material"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            update_fields = []
            values = []
            
            allowed_fields = ['is_valid', 'status', 'notes', 'scan_code']
            for field in allowed_fields:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    values.append(data[field])
            
            if not update_fields:
                return {'success': False, 'error': 'No fields to update'}
            
            values.append(scan_id)
            query = f"UPDATE scan_results_materials SET {', '.join(update_fields)} WHERE id_scan = %s"
            cur.execute(query, values)
            
            conn.commit()
            return {
                'success': True,
                'message': 'Material scan result updated successfully'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error updating material scan result: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            if conn:
                conn.close()