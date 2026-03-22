import psycopg2.extras
from datetime import datetime
import random
import string
from utils.database import get_db_connection

class ValidationModel:
    """Model untuk mengelola validations"""
    
    @staticmethod
    def generate_unique_code():
        """Generate unique code untuk validation"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        return f"VAL-{timestamp}-{random_str}"
    
    @staticmethod
    def create_validation(scan_id, user_id, data):
        """Membuat record validasi dari scan result"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            # Get scan result data
            cur.execute("""
                SELECT sr.*, sp.checking_name, sp.checking_number
                FROM scan_results sr
                LEFT JOIN scanning_preparations sp ON sr.preparation_id = sp.id_preparation
                WHERE sr.id_scan = %s
            """, (scan_id,))
            
            scan = cur.fetchone()
            if not scan:
                return {'success': False, 'error': 'Scan result not found'}
            
            unique_code = ValidationModel.generate_unique_code()
            
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
                cur.execute("""
                    UPDATE scan_results 
                    SET status = %s, is_valid = %s
                    WHERE id_scan = %s
                """, (
                    'validated',
                    data.get('is_approved', False),
                    scan_id
                ))
            
            # If approved, create asset
            if data.get('is_approved') and data.get('validation_status') == 'approved':
                # Insert into assets
                cur.execute("""
                    INSERT INTO assets (
                        category_id, asset_name, serial_number, scan_code, lokasi, status
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id_assets
                """, (
                    scan['category_id'],
                    scan['asset_name'] or scan['scan_value'],
                    scan['serial_number'],
                    scan['scan_code'],
                    data.get('location', 'Unknown'),
                    'active'
                ))
                
                asset_id = cur.fetchone()[0]
                
                # Update scan_result with asset_id
                cur.execute("""
                    UPDATE scan_results SET asset_id = %s WHERE id_scan = %s
                """, (asset_id, scan_id))
                
                # Update validation with asset_id
                cur.execute("""
                    UPDATE validations SET asset_id = %s WHERE id_validation = %s
                """, (asset_id, validation_id))
            
            conn.commit()
            
            return {
                'success': True,
                'validation_id': validation_id,
                'unique_code': unique_code,
                'message': 'Validation created successfully'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error creating validation: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def update_validation(validation_id, data):
        """Update validation status"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            update_fields = []
            values = []
            
            allowed_fields = ['validation_status', 'validation_notes', 'is_approved', 'rejection_reason']
            for field in allowed_fields:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    values.append(data[field])
            
            if data.get('validation_status') and data['validation_status'] != 'pending':
                update_fields.append("validated_at = %s")
                values.append(datetime.now())
            
            if not update_fields:
                return {'success': False, 'error': 'No fields to update'}
            
            values.append(validation_id)
            query = f"UPDATE validations SET {', '.join(update_fields)} WHERE id_validation = %s"
            cur.execute(query, values)
            
            # Get scan_id to update scan_result
            cur.execute("SELECT scan_id FROM validations WHERE id_validation = %s", (validation_id,))
            result = cur.fetchone()
            if result:
                scan_id = result[0]
                
                # Update scan_result status based on validation
                if data.get('validation_status') == 'approved':
                    cur.execute("""
                        UPDATE scan_results 
                        SET status = 'validated', is_valid = TRUE
                        WHERE id_scan = %s
                    """, (scan_id,))
                elif data.get('validation_status') == 'rejected':
                    cur.execute("""
                        UPDATE scan_results 
                        SET status = 'rejected', is_valid = FALSE
                        WHERE id_scan = %s
                    """, (scan_id,))
            
            conn.commit()
            
            return {
                'success': True,
                'message': 'Validation updated successfully'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error updating validation: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def get_validations_by_status(status=None):
        """Mendapatkan validations berdasarkan status"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            query = """
                SELECT v.*, 
                       sr.scan_value, sr.serial_number, sr.scan_code, sr.asset_name,
                       sr.brand, sr.model, sr.confidence,
                       sp.checking_name, sp.checking_number,
                       l.location_name,
                       u.username as scanned_by_name,
                       vu.username as validated_by_name
                FROM validations v
                LEFT JOIN scan_results sr ON v.scan_id = sr.id_scan
                LEFT JOIN scanning_preparations sp ON v.preparation_id = sp.id_preparation
                LEFT JOIN locations l ON sp.location_id = l.id_location
                LEFT JOIN users u ON sr.user_id = u.id_user
                LEFT JOIN users vu ON v.validated_by = vu.id_user
            """
            
            params = []
            if status and status != 'all':
                query += " WHERE v.validation_status = %s"
                params.append(status)
            
            query += " ORDER BY v.created_at DESC"
            
            cur.execute(query, params)
            
            results = cur.fetchall()
            return {
                'success': True,
                'data': [dict(row) for row in results],
                'total': len(results)
            }
            
        except Exception as e:
            print(f"Error getting validations: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def get_validation_detail(validation_id):
        """Mendapatkan detail validation"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            cur.execute("""
                SELECT v.*, 
                       sr.scan_value, sr.serial_number, sr.scan_code, sr.asset_name,
                       sr.brand, sr.model, sr.specifications, sr.confidence,
                       sr.photo_proof, sr.scan_time,
                       sp.checking_name, sp.checking_number, sp.checking_date,
                       l.location_name, l.id_location,
                       u.username as scanned_by_name,
                       vu.username as validated_by_name,
                       ip.item_number, ip.status as item_status
                FROM validations v
                LEFT JOIN scan_results sr ON v.scan_id = sr.id_scan
                LEFT JOIN scanning_preparations sp ON v.preparation_id = sp.id_preparation
                LEFT JOIN locations l ON sp.location_id = l.id_location
                LEFT JOIN users u ON sr.user_id = u.id_user
                LEFT JOIN users vu ON v.validated_by = vu.id_user
                LEFT JOIN items_preparation ip ON v.item_preparation_id = ip.id_item_preparation
                WHERE v.id_validation = %s
            """, (validation_id,))
            
            result = cur.fetchone()
            
            if not result:
                return {'success': False, 'error': 'Validation not found'}
            
            return {
                'success': True,
                'data': dict(result)
            }
            
        except Exception as e:
            print(f"Error getting validation detail: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def bulk_validate(validation_ids, data):
        """Bulk validation untuk multiple items"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            success_count = 0
            failed_count = 0
            
            for validation_id in validation_ids:
                result = ValidationModel.update_validation(validation_id, data)
                if result['success']:
                    success_count += 1
                else:
                    failed_count += 1
            
            return {
                'success': True,
                'success_count': success_count,
                'failed_count': failed_count,
                'message': f'{success_count} items validated successfully, {failed_count} failed'
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error in bulk validate: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if conn:
                conn.close()