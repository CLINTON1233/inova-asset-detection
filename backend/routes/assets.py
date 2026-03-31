from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime
import traceback
import random
import string

assets_bp = Blueprint('assets', __name__)

def get_conn():
    return get_db_connection()

def generate_asset_code():
    """Generate unique asset code format: AST-YYYYMMDD-XXXX"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"AST-{date_str}-{random_chars}"

# ==================== GET COMPLETED PREPARATIONS ====================
@assets_bp.route('/api/assets/preparations/completed', methods=['GET'])
def get_completed_preparations():
    """Mendapatkan daftar preparation yang sudah completed (semua item sudah divalidasi)"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Ambil semua devices preparations yang completed
        cur.execute("""
            SELECT 
                dsp.id_preparation,
                dsp.checking_number,
                dsp.checking_name,
                dsp.checking_date,
                dsp.location_id,
                l.location_name,
                dsp.created_at,
                'device' as type,
                COUNT(DISTINCT dip.id_item_preparation) as total_items,
                COUNT(DISTINCT a.id_assets) as validated_items
            FROM devices_scanning_preparations dsp
            LEFT JOIN devices_items_preparation dip ON dsp.id_preparation = dip.preparation_id
            LEFT JOIN validations v ON dip.id_item_preparation = v.item_preparation_id AND v.validation_status = 'approved'
            LEFT JOIN assets a ON v.id_validation = a.validation_id
            LEFT JOIN locations l ON dsp.location_id = l.id_location
            WHERE dsp.status = 'completed'
            GROUP BY dsp.id_preparation, dsp.checking_number, dsp.checking_name, 
                     dsp.checking_date, dsp.location_id, l.location_name, dsp.created_at
            HAVING COUNT(DISTINCT dip.id_item_preparation) = COUNT(DISTINCT a.id_assets)
            ORDER BY dsp.created_at DESC
        """)
        
        devices_preparations = cur.fetchall()
        
        # Ambil semua materials preparations yang completed
        cur.execute("""
            SELECT 
                msp.id_preparation,
                msp.checking_number,
                msp.checking_name,
                msp.checking_date,
                msp.location_id,
                l.location_name,
                msp.created_at,
                'material' as type,
                COUNT(DISTINCT mip.id_item_preparation) as total_items,
                COUNT(DISTINCT a.id_assets) as validated_items
            FROM materials_scanning_preparations msp
            LEFT JOIN materials_items_preparation mip ON msp.id_preparation = mip.preparation_id
            LEFT JOIN validations v ON mip.id_item_preparation = v.material_item_preparation_id AND v.validation_status = 'approved'
            LEFT JOIN assets a ON v.id_validation = a.validation_id
            LEFT JOIN locations l ON msp.location_id = l.id_location
            WHERE msp.status = 'completed'
            GROUP BY msp.id_preparation, msp.checking_number, msp.checking_name, 
                     msp.checking_date, msp.location_id, l.location_name, msp.created_at
            HAVING COUNT(DISTINCT mip.id_item_preparation) = COUNT(DISTINCT a.id_assets)
            ORDER BY msp.created_at DESC
        """)
        
        materials_preparations = cur.fetchall()
        
        # Gabungkan dan urutkan
        all_preparations = []
        for prep in devices_preparations:
            all_preparations.append(dict(prep))
        for prep in materials_preparations:
            all_preparations.append(dict(prep))
        
        # Urutkan berdasarkan created_at
        all_preparations.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'data': all_preparations,
            'count': len(all_preparations)
        })
        
    except Exception as e:
        print(f"Error getting completed preparations: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== GET ASSETS BY PREPARATION ====================
@assets_bp.route('/api/assets/by-preparation/<int:prep_id>', methods=['GET'])
def get_assets_by_preparation(prep_id):
    """Mendapatkan semua assets berdasarkan preparation ID"""
    conn = None
    try:
        prep_type = request.args.get('type', 'device')
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        if prep_type == 'device':
            cur.execute("""
                SELECT 
                    a.*,
                    u.username as created_by_name,
                    vu.username as validated_by_name,
                    dip.item_number,
                    dip.serial_number,
                    dip.department_id,
                    dip.receiver_id,
                    d.department_name,
                    mr.receiver_name,
                    si.device_name,
                    si.brand,
                    si.model,
                    si.specifications,
                    dsp.checking_name as session_name,
                    dsp.checking_number as session_number,
                    dsp.checking_date as session_date,
                    l.location_name
                FROM assets a
                LEFT JOIN validations v ON a.validation_id = v.id_validation
                LEFT JOIN devices_items_preparation dip ON v.item_preparation_id = dip.id_item_preparation
                LEFT JOIN devices_scanning_items si ON dip.scanning_item_id = si.id_item
                LEFT JOIN devices_scanning_preparations dsp ON dip.preparation_id = dsp.id_preparation
                LEFT JOIN departments d ON dip.department_id = d.id_department
                LEFT JOIN master_receivers mr ON dip.receiver_id = mr.id_receiver
                LEFT JOIN locations l ON dsp.location_id = l.id_location
                LEFT JOIN users u ON a.user_id = u.id_user
                LEFT JOIN users vu ON a.validated_by = vu.id_user
                WHERE dsp.id_preparation = %s AND a.validation_id IS NOT NULL
                ORDER BY dip.id_item_preparation ASC
            """, (prep_id,))
        else:
            cur.execute("""
                SELECT 
                    a.*,
                    u.username as created_by_name,
                    vu.username as validated_by_name,
                    mip.item_number,
                    mip.scan_code,
                    mip.department_id,
                    mip.receiver_id,
                    d.department_name,
                    mr.receiver_name,
                    si.material_name,
                    si.vendor,
                    si.uom,
                    si.material_detail as specifications,
                    msp.checking_name as session_name,
                    msp.checking_number as session_number,
                    msp.checking_date as session_date,
                    l.location_name
                FROM assets a
                LEFT JOIN validations v ON a.validation_id = v.id_validation
                LEFT JOIN materials_items_preparation mip ON v.material_item_preparation_id = mip.id_item_preparation
                LEFT JOIN materials_scanning_items si ON mip.scanning_item_id = si.id_item
                LEFT JOIN materials_scanning_preparations msp ON mip.preparation_id = msp.id_preparation
                LEFT JOIN departments d ON mip.department_id = d.id_department
                LEFT JOIN master_receivers mr ON mip.receiver_id = mr.id_receiver
                LEFT JOIN locations l ON msp.location_id = l.id_location
                LEFT JOIN users u ON a.user_id = u.id_user
                LEFT JOIN users vu ON a.validated_by = vu.id_user
                WHERE msp.id_preparation = %s AND a.validation_id IS NOT NULL
                ORDER BY mip.id_item_preparation ASC
            """, (prep_id,))
        
        assets = cur.fetchall()
        
        # Ambil informasi session
        session_info = None
        if assets:
            session_info = {
                'session_name': assets[0].get('session_name'),
                'session_number': assets[0].get('session_number'),
                'session_date': assets[0].get('session_date'),
                'location_name': assets[0].get('location_name')
            }
        
        return jsonify({
            'success': True,
            'data': [dict(asset) for asset in assets],
            'session_info': session_info,
            'count': len(assets)
        })
        
    except Exception as e:
        print(f"Error getting assets by preparation: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== CREATE ASSET FROM VALIDATION ====================
@assets_bp.route('/api/assets/create-from-validation', methods=['POST'])
def create_asset_from_validation():
    """Membuat asset dari validation yang sudah di-approve"""
    conn = None
    try:
        data = request.json
        validation_id = data.get('validation_id')
        user_id = data.get('user_id', 1)
        validated_by = data.get('validated_by', 1)
        
        if not validation_id:
            return jsonify({
                'success': False,
                'error': 'Validation ID is required'
            }), 400
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Ambil data validation yang sudah di-approve
        cur.execute("""
            SELECT 
                v.*,
                COALESCE(v.scan_id, v.scan_material_id) as scan_id,
                CASE 
                    WHEN v.scan_id IS NOT NULL THEN 'device'
                    WHEN v.scan_material_id IS NOT NULL THEN 'material'
                    ELSE 'unknown'
                END as validation_type,
                srd.serial_number,
                srd.scan_value as device_name,
                srd.photo_url as device_photo,
                srd.detection_data as device_detection,
                srm.scan_code,
                srm.scan_value as material_name,
                srm.photo_url as material_photo,
                srm.detection_data as material_detection,
                dsp.checking_number as device_checking_number,
                dsp.checking_name as device_checking_name,
                dsp.location_id as device_location_id,
                msp.checking_number as material_checking_number,
                msp.checking_name as material_checking_name,
                msp.location_id as material_location_id,
                l.location_name
            FROM validations v
            LEFT JOIN scan_results_devices srd ON v.scan_id = srd.id_scan
            LEFT JOIN scan_results_materials srm ON v.scan_material_id = srm.id_scan
            LEFT JOIN devices_items_preparation dip ON v.item_preparation_id = dip.id_item_preparation
            LEFT JOIN materials_items_preparation mip ON v.material_item_preparation_id = mip.id_item_preparation
            LEFT JOIN devices_scanning_preparations dsp ON dip.preparation_id = dsp.id_preparation
            LEFT JOIN materials_scanning_preparations msp ON mip.preparation_id = msp.id_preparation
            LEFT JOIN locations l ON COALESCE(dsp.location_id, msp.location_id) = l.id_location
            WHERE v.id_validation = %s AND v.validation_status = 'approved'
        """, (validation_id,))
        
        validation = cur.fetchone()
        
        if not validation:
            return jsonify({
                'success': False,
                'error': 'Validation not found or not approved'
            }), 404
        
        # Ambil data department, receiver, project dari item preparation
        if validation['validation_type'] == 'device':
            item_prep_id = validation.get('item_preparation_id')
            if item_prep_id:
                cur.execute("""
                    SELECT 
                        dip.department_id,
                        d.department_name,
                        dip.receiver_id,
                        mr.receiver_name,
                        dip.project_name,
                        dip.scanning_item_id,
                        si.device_name,
                        si.brand,
                        si.vendor,
                        si.model,
                        si.specifications
                    FROM devices_items_preparation dip
                    LEFT JOIN departments d ON dip.department_id = d.id_department
                    LEFT JOIN master_receivers mr ON dip.receiver_id = mr.id_receiver
                    LEFT JOIN devices_scanning_items si ON dip.scanning_item_id = si.id_item
                    WHERE dip.id_item_preparation = %s
                """, (item_prep_id,))
                item_data = cur.fetchone()
                
                asset_name = validation.get('device_name') or (item_data.get('device_name') if item_data else None)
                serial_number = validation.get('serial_number')
                brand = item_data.get('brand') if item_data else None
                vendor = item_data.get('vendor') if item_data else None
                model = item_data.get('model') if item_data else None
                specifications = item_data.get('specifications') if item_data else None
                photo_url = validation.get('device_photo')
                detection_data = validation.get('device_detection')
                
            else:
                asset_name = validation.get('device_name')
                serial_number = validation.get('serial_number')
                brand = None
                vendor = None
                model = None
                specifications = None
                photo_url = validation.get('device_photo')
                detection_data = validation.get('device_detection')
                item_data = None
        else:
            item_prep_id = validation.get('material_item_preparation_id')
            if item_prep_id:
                cur.execute("""
                    SELECT 
                        mip.department_id,
                        d.department_name,
                        mip.receiver_id,
                        mr.receiver_name,
                        mip.project_name,
                        mip.scanning_item_id,
                        si.material_name,
                        si.vendor,
                        si.uom,
                        si.material_detail as specifications
                    FROM materials_items_preparation mip
                    LEFT JOIN departments d ON mip.department_id = d.id_department
                    LEFT JOIN master_receivers mr ON mip.receiver_id = mr.id_receiver
                    LEFT JOIN materials_scanning_items si ON mip.scanning_item_id = si.id_item
                    WHERE mip.id_item_preparation = %s
                """, (item_prep_id,))
                item_data = cur.fetchone()
                
                asset_name = validation.get('material_name') or (item_data.get('material_name') if item_data else None)
                scan_code = validation.get('scan_code')
                vendor = item_data.get('vendor') if item_data else None
                uom = item_data.get('uom') if item_data else 'PCS'
                specifications = item_data.get('specifications') if item_data else None
                photo_url = validation.get('material_photo')
                detection_data = validation.get('material_detection')
                
            else:
                asset_name = validation.get('material_name')
                scan_code = validation.get('scan_code')
                vendor = None
                uom = 'PCS'
                specifications = None
                photo_url = validation.get('material_photo')
                detection_data = validation.get('material_detection')
                item_data = None
        
        # Ambil data dari item_data
        department_name = item_data.get('department_name') if item_data else None
        receiver_name = item_data.get('receiver_name') if item_data else None
        project_name = item_data.get('project_name') if item_data else None
        location_id = validation.get('device_location_id') or validation.get('material_location_id')
        location_name = validation.get('location_name')
        
        # Generate asset code
        asset_code = generate_asset_code()
        
        # Insert ke assets
        cur.execute("""
            INSERT INTO assets (
                user_id, validation_id, asset_code, asset_name, asset_type, category,
                serial_number, scan_code, project_name, department_name, receiver_name,
                location_id, location_name, brand, vendor, model, specifications,
                quantity, uom, status, photo_url, validated_by, validated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_assets
        """, (
            user_id,
            validation_id,
            asset_code,
            asset_name,
            validation.get('validation_type'),
            'Device' if validation['validation_type'] == 'device' else 'Material',
            serial_number,
            scan_code if validation['validation_type'] == 'material' else None,
            project_name,
            department_name,
            receiver_name,
            location_id,
            location_name,
            brand,
            vendor,
            model,
            specifications,
            1.0 if validation['validation_type'] == 'material' else 1,
            uom if validation['validation_type'] == 'material' else None,
            'active',
            photo_url,
            validated_by,
            datetime.now()
        ))
        
        asset_id = cur.fetchone()[0]
        
        # Update validation dengan asset_id
        cur.execute("""
            UPDATE validations 
            SET asset_id = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id_validation = %s
        """, (asset_id, validation_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'asset_id': asset_id,
            'asset_code': asset_code,
            'message': 'Asset created successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating asset from validation: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== GET ALL ASSETS ====================
@assets_bp.route('/api/assets', methods=['GET'])
def get_all_assets():
    """Mendapatkan daftar semua assets"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT 
                a.*,
                u.username as created_by_name,
                vu.username as validated_by_name
            FROM assets a
            LEFT JOIN users u ON a.user_id = u.id_user
            LEFT JOIN users vu ON a.validated_by = vu.id_user
            ORDER BY a.created_at DESC
        """)
        
        assets = cur.fetchall()
        
        result = []
        for asset in assets:
            asset_dict = dict(asset)
            # Parse detection_data jika ada
            result.append(asset_dict)
        
        return jsonify({
            'success': True,
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        print(f"Error getting assets: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== GET ASSET BY ID ====================
@assets_bp.route('/api/assets/<int:asset_id>', methods=['GET'])
def get_asset_by_id(asset_id):
    """Mendapatkan detail asset berdasarkan ID"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT 
                a.*,
                u.username as created_by_name,
                vu.username as validated_by_name
            FROM assets a
            LEFT JOIN users u ON a.user_id = u.id_user
            LEFT JOIN users vu ON a.validated_by = vu.id_user
            WHERE a.id_assets = %s
        """, (asset_id,))
        
        asset = cur.fetchone()
        
        if not asset:
            return jsonify({
                'success': False,
                'error': 'Asset not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': dict(asset)
        })
        
    except Exception as e:
        print(f"Error getting asset: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== UPDATE ASSET ====================
@assets_bp.route('/api/assets/<int:asset_id>', methods=['PUT'])
def update_asset(asset_id):
    """Update asset"""
    conn = None
    try:
        data = request.json
        conn = get_conn()
        cur = conn.cursor()
        
        allowed_fields = ['asset_name', 'location_id', 'location_name', 'department_name', 
                          'receiver_name', 'project_name', 'status', 'brand', 'vendor', 
                          'model', 'specifications']
        
        updates = []
        values = []
        
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = %s")
                values.append(data[field])
        
        if not updates:
            return jsonify({
                'success': False,
                'error': 'No fields to update'
            }), 400
        
        values.append(asset_id)
        values.append(datetime.now())
        
        query = f"""
            UPDATE assets 
            SET {', '.join(updates)}, updated_at = %s
            WHERE id_assets = %s
            RETURNING id_assets
        """
        
        cur.execute(query, values + [datetime.now(), asset_id])
        
        updated = cur.fetchone()
        
        if not updated:
            return jsonify({
                'success': False,
                'error': 'Asset not found'
            }), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Asset updated successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating asset: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== DELETE ASSET ====================
@assets_bp.route('/api/assets/<int:asset_id>', methods=['DELETE'])
def delete_asset(asset_id):
    """Menghapus asset"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("SELECT id_assets FROM assets WHERE id_assets = %s", (asset_id,))
        if not cur.fetchone():
            return jsonify({
                'success': False,
                'error': 'Asset not found'
            }), 404
        
        cur.execute("DELETE FROM assets WHERE id_assets = %s", (asset_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Asset deleted successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error deleting asset: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== BULK DELETE ASSETS ====================
@assets_bp.route('/api/assets/bulk-delete', methods=['POST'])
def bulk_delete_assets():
    """Menghapus multiple assets sekaligus"""
    conn = None
    try:
        data = request.json
        asset_ids = data.get('asset_ids', [])
        
        if not asset_ids:
            return jsonify({
                'success': False,
                'error': 'No asset IDs provided'
            }), 400
        
        conn = get_conn()
        cur = conn.cursor()
        
        deleted_count = 0
        
        for asset_id in asset_ids:
            cur.execute("DELETE FROM assets WHERE id_assets = %s", (asset_id,))
            if cur.rowcount > 0:
                deleted_count += 1
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'{deleted_count} assets deleted successfully',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error bulk deleting assets: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()