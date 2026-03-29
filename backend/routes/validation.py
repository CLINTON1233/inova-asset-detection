from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime
import traceback

validation_bp = Blueprint('validation', __name__)

def get_conn():
    return get_db_connection()

# ==================== GET VALIDATIONS ====================
@validation_bp.route('/api/validations', methods=['GET'])
def get_validations():
    """Mendapatkan daftar validations"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Ambil validations dari devices dan materials
        cur.execute("""
            SELECT 
                v.id_validation,
                v.unique_code,
                v.validation_status,
                v.validation_notes,
                v.is_approved,
                v.rejection_reason,
                v.created_at,
                v.validated_at,
                COALESCE(v.scan_id, v.scan_material_id) as scan_id,
                CASE 
                    WHEN v.scan_id IS NOT NULL THEN 'device'
                    WHEN v.scan_material_id IS NOT NULL THEN 'material'
                    ELSE 'unknown'
                END as validation_type,
                
                -- Device info
                srd.serial_number,
                srd.scan_value as device_name,
                srd.photo_url as device_photo,
                
                -- Material info
                srm.scan_code,
                srm.scan_value as material_name,
                srm.photo_url as material_photo,
                
                -- Preparation info
                dsp.checking_number as device_checking_number,
                dsp.checking_name as device_checking_name,
                msp.checking_number as material_checking_number,
                msp.checking_name as material_checking_name,
                l.location_name,
                u.username as created_by_name,
                vu.username as validated_by_name
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
            ORDER BY v.created_at DESC
        """)
        
        validations = cur.fetchall()
        
        result = []
        for val in validations:
            val_dict = dict(val)
            
            # Tentukan tipe dan data yang relevan
            if val_dict['validation_type'] == 'device':
                val_dict['item_name'] = val_dict.get('device_name')
                val_dict['serial_or_code'] = val_dict.get('serial_number')
                val_dict['checking_number'] = val_dict.get('device_checking_number')
                val_dict['checking_name'] = val_dict.get('device_checking_name')
                val_dict['photo_url'] = val_dict.get('device_photo')
            else:
                val_dict['item_name'] = val_dict.get('material_name')
                val_dict['serial_or_code'] = val_dict.get('scan_code')
                val_dict['checking_number'] = val_dict.get('material_checking_number')
                val_dict['checking_name'] = val_dict.get('material_checking_name')
                val_dict['photo_url'] = val_dict.get('material_photo')
            
            result.append(val_dict)
        
        return jsonify({
            'success': True,
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        print(f"Error getting validations: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@validation_bp.route('/api/validations/<int:validation_id>/detail', methods=['GET'])
def get_validation_detail(validation_id):
    """Mendapatkan detail validation berdasarkan ID"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT 
                v.*,
                COALESCE(v.scan_id, v.scan_material_id) as scan_id,
                CASE 
                    WHEN v.scan_id IS NOT NULL THEN 'device'
                    WHEN v.scan_material_id IS NOT NULL THEN 'material'
                    ELSE 'unknown'
                END as validation_type,
                -- Device info
                srd.serial_number,
                srd.scan_value as device_name,
                srd.detection_data as device_detection,
                srd.photo_url as device_photo,
                -- Material info
                srm.scan_code,
                srm.scan_value as material_name,
                srm.detection_data as material_detection,
                srm.photo_url as material_photo,
                -- Preparation info
                dsp.checking_number as device_checking_number,
                dsp.checking_name as device_checking_name,
                dsp.checking_date as device_checking_date,
                msp.checking_number as material_checking_number,
                msp.checking_name as material_checking_name,
                msp.checking_date as material_checking_date,
                l.location_name,
                l.id_location,
                u.username as created_by_name,
                vu.username as validated_by_name
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
            WHERE v.id_validation = %s
        """, (validation_id,))
        
        validation = cur.fetchone()
        
        if not validation:
            return jsonify({
                'success': False,
                'error': 'Validation not found'
            }), 404
        
        result = dict(validation)
        
        # Tentukan tipe dan data yang relevan
        if result['validation_type'] == 'device':
            result['item_name'] = result.get('device_name')
            result['serial_or_code'] = result.get('serial_number')
            result['checking_number'] = result.get('device_checking_number')
            result['checking_name'] = result.get('device_checking_name')
            result['checking_date'] = result.get('device_checking_date')
            result['detection_data'] = result.get('device_detection')
            result['photo_url'] = result.get('device_photo')
        else:
            result['item_name'] = result.get('material_name')
            result['serial_or_code'] = result.get('scan_code')
            result['checking_number'] = result.get('material_checking_number')
            result['checking_name'] = result.get('material_checking_name')
            result['checking_date'] = result.get('material_checking_date')
            result['detection_data'] = result.get('material_detection')
            result['photo_url'] = result.get('material_photo')
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        print(f"Error getting validation detail: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== CREATE VALIDATION ====================
@validation_bp.route('/api/validations/create', methods=['POST'])
def create_validation():
    """Membuat record validation baru"""
    conn = None
    try:
        data = request.json
        print("Creating validation:", data)
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Generate unique code
        scan_id = data.get('scan_id')
        scan_material_id = data.get('scan_material_id')
        
        unique_code = None
        checking_number = None
        
        if scan_id:
            # Cari checking_number dari device
            cur.execute("""
                SELECT dsp.checking_number
                FROM scan_results_devices srd
                LEFT JOIN devices_items_preparation dip ON srd.item_preparation_id = dip.id_item_preparation
                LEFT JOIN devices_scanning_preparations dsp ON dip.preparation_id = dsp.id_preparation
                WHERE srd.id_scan = %s
            """, (scan_id,))
            result = cur.fetchone()
            if result:
                checking_number = result['checking_number']
        elif scan_material_id:
            # Cari checking_number dari material
            cur.execute("""
                SELECT msp.checking_number
                FROM scan_results_materials srm
                LEFT JOIN materials_items_preparation mip ON srm.item_preparation_id = mip.id_item_preparation
                LEFT JOIN materials_scanning_preparations msp ON mip.preparation_id = msp.id_preparation
                WHERE srm.id_scan = %s
            """, (scan_material_id,))
            result = cur.fetchone()
            if result:
                checking_number = result['checking_number']
        
        unique_code = checking_number or f"VAL-{scan_id or scan_material_id}"
        
        cur.execute("""
            INSERT INTO validations (
                scan_id, scan_material_id, item_preparation_id, 
                material_item_preparation_id, user_id, unique_code,
                validation_status, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_validation
        """, (
            data.get('scan_id'),
            data.get('scan_material_id'),
            data.get('item_preparation_id'),
            data.get('material_item_preparation_id'),
            data.get('user_id', 1),
            unique_code,
            'pending',
            datetime.now()
        ))
        
        validation_id = cur.fetchone()[0]
        conn.commit()
        
        return jsonify({
            'success': True,
            'validation_id': validation_id,
            'unique_code': unique_code,
            'message': 'Validation created successfully'
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating validation: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== UPDATE VALIDATION ====================
@validation_bp.route('/api/validations/<int:validation_id>', methods=['PUT'])
def update_validation(validation_id):
    """Update status validation (approve/reject)"""
    conn = None
    try:
        data = request.json
        print(f"Updating validation {validation_id}:", data)
        
        conn = get_conn()
        cur = conn.cursor()
        
        validation_status = data.get('validation_status')
        is_approved = data.get('is_approved')
        rejection_reason = data.get('rejection_reason')
        validation_notes = data.get('validation_notes')
        validated_by = data.get('validated_by', 1)
        
        cur.execute("""
            UPDATE validations 
            SET validation_status = %s,
                is_approved = %s,
                rejection_reason = %s,
                validation_notes = %s,
                validated_by = %s,
                validated_at = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_validation = %s
            RETURNING id_validation
        """, (
            validation_status,
            is_approved,
            rejection_reason,
            validation_notes,
            validated_by,
            datetime.now(),
            validation_id
        ))
        
        updated = cur.fetchone()
        
        if not updated:
            return jsonify({
                'success': False,
                'error': 'Validation not found'
            }), 404
        
        # Jika approved, update status di preparation
        if is_approved:
            # Update status di devices_scanning_preparations atau materials_scanning_preparations
            cur.execute("""
                SELECT scan_id, scan_material_id FROM validations WHERE id_validation = %s
            """, (validation_id,))
            val = cur.fetchone()
            
            if val and val[0]:  # device
                cur.execute("""
                    UPDATE devices_scanning_preparations dsp
                    SET validation_status = 'approved', updated_at = CURRENT_TIMESTAMP
                    FROM devices_items_preparation dip
                    JOIN scan_results_devices srd ON dip.id_item_preparation = srd.item_preparation_id
                    WHERE dsp.id_preparation = dip.preparation_id
                    AND srd.id_scan = %s
                """, (val[0],))
            elif val and val[1]:  # material
                cur.execute("""
                    UPDATE materials_scanning_preparations msp
                    SET validation_status = 'approved', updated_at = CURRENT_TIMESTAMP
                    FROM materials_items_preparation mip
                    JOIN scan_results_materials srm ON mip.id_item_preparation = srm.item_preparation_id
                    WHERE msp.id_preparation = mip.preparation_id
                    AND srm.id_scan = %s
                """, (val[1],))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Validation {validation_status} successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating validation: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== BULK UPDATE ====================
@validation_bp.route('/api/validations/bulk', methods=['POST'])
def bulk_update_validations():
    """Bulk update validations (approve/reject multiple)"""
    conn = None
    try:
        data = request.json
        validation_ids = data.get('validation_ids', [])
        action = data.get('action')  # 'approve' or 'reject'
        rejection_reason = data.get('rejection_reason')
        validated_by = data.get('validated_by', 1)
        
        if not validation_ids:
            return jsonify({
                'success': False,
                'error': 'No validation IDs provided'
            }), 400
        
        conn = get_conn()
        cur = conn.cursor()
        
        validation_status = 'approved' if action == 'approve' else 'rejected'
        is_approved = action == 'approve'
        
        updated_count = 0
        
        for val_id in validation_ids:
            cur.execute("""
                UPDATE validations 
                SET validation_status = %s,
                    is_approved = %s,
                    rejection_reason = %s,
                    validated_by = %s,
                    validated_at = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_validation = %s
                RETURNING id_validation
            """, (
                validation_status,
                is_approved,
                rejection_reason if not is_approved else None,
                validated_by,
                datetime.now(),
                val_id
            ))
            
            if cur.fetchone():
                updated_count += 1
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'{updated_count} validations {validation_status}',
            'updated_count': updated_count
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error bulk updating validations: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()