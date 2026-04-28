from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime
import traceback
from routes.reports import create_report_from_validation

validation_bp = Blueprint('validation', __name__)

def get_conn():
    return get_db_connection()

# ==================== UPDATE SESSION STATUS ====================
def check_and_update_session_status(preparation_id, validation_type):
    """Memeriksa apakah semua item dalam session sudah divalidasi, jika ya update status menjadi completed"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        if validation_type == 'device':
            cur.execute("""
                SELECT COUNT(*) as total_items
                FROM devices_items_preparation
                WHERE preparation_id = %s
            """, (preparation_id,))
            total_items = cur.fetchone()['total_items']
            
            cur.execute("""
                SELECT COUNT(DISTINCT dip.id_item_preparation) as validated_items
                FROM devices_items_preparation dip
                INNER JOIN validations v ON dip.id_item_preparation = v.item_preparation_id
                WHERE dip.preparation_id = %s 
                AND v.validation_status = 'approved'
            """, (preparation_id,))
            validated_items = cur.fetchone()['validated_items']
            
            if total_items == validated_items and total_items > 0:
                cur.execute("""
                    UPDATE devices_scanning_preparations 
                    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                    WHERE id_preparation = %s
                """, (preparation_id,))
                conn.commit()
                print(f"✅ Session {preparation_id} (device) updated to completed")
                return True
                
        else:  # material
            # Hitung total item preparation dalam session
            cur.execute("""
                SELECT COUNT(*) as total_items
                FROM materials_items_preparation
                WHERE preparation_id = %s
            """, (preparation_id,))
            total_items = cur.fetchone()['total_items']
            
            # Hitung jumlah item yang sudah divalidasi (approved)
            cur.execute("""
                SELECT COUNT(DISTINCT mip.id_item_preparation) as validated_items
                FROM materials_items_preparation mip
                INNER JOIN validations v ON mip.id_item_preparation = v.material_item_preparation_id
                WHERE mip.preparation_id = %s 
                AND v.validation_status = 'approved'
            """, (preparation_id,))
            validated_items = cur.fetchone()['validated_items']
            
            # Jika semua item sudah divalidasi, update status session menjadi completed
            if total_items == validated_items and total_items > 0:
                cur.execute("""
                    UPDATE materials_scanning_preparations 
                    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                    WHERE id_preparation = %s
                """, (preparation_id,))
                conn.commit()
                print(f"✅ Session {preparation_id} (material) updated to completed")
                return True
                
        return False
        
    except Exception as e:
        print(f"Error checking session status: {e}")
        return False
    finally:
        if conn:
            conn.close()
            
def create_asset_from_validation_id(validation_id, validated_by, existing_conn=None):
    """Helper function to create asset from validation (can use existing connection)"""
    conn = None
    should_close = False
    try:
        if existing_conn:
            conn = existing_conn
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        else:
            conn = get_conn()
            should_close = True
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
                srm.scan_code,
                srm.scan_value as material_name,
                srm.photo_url as material_photo,
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
            print(f"Validation {validation_id} not found or not approved")
            return False
        
        # Ambil data department, receiver, project, brand, vendor dari item preparation
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
                
                department_name = item_data.get('department_name') if item_data else None
                receiver_name = item_data.get('receiver_name') if item_data else None
                project_name = item_data.get('project_name') if item_data else None
            else:
                # Fallback jika tidak ada item_prep
                asset_name = validation.get('device_name')
                serial_number = validation.get('serial_number')
                brand = None
                vendor = None
                model = None
                specifications = None
                photo_url = validation.get('device_photo')
                department_name = None
                receiver_name = None
                project_name = None
                
            location_id = validation.get('device_location_id')
            location_name = validation.get('location_name')
            asset_type = 'device'
            category = 'Device'
            scan_code = None
            uom = None
            quantity = 1
            
        else:  # material
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
                
                department_name = item_data.get('department_name') if item_data else None
                receiver_name = item_data.get('receiver_name') if item_data else None
                project_name = item_data.get('project_name') if item_data else None
            else:
                asset_name = validation.get('material_name')
                scan_code = validation.get('scan_code')
                vendor = None
                uom = 'PCS'
                specifications = None
                photo_url = validation.get('material_photo')
                department_name = None
                receiver_name = None
                project_name = None
                
            location_id = validation.get('material_location_id')
            location_name = validation.get('location_name')
            asset_type = 'material'
            category = 'Material'
            serial_number = None
            brand = None
            model = None
            quantity = 1.0
        
        # Generate asset code
        import random
        import string
        date_str = datetime.now().strftime('%Y%m%d')
        random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        asset_code = f"AST-{date_str}-{random_chars}"
        
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
            1,  # user_id default
            validation_id,
            asset_code,
            asset_name,
            asset_type,
            category,
            serial_number,
            scan_code,
            project_name,
            department_name,
            receiver_name,
            location_id,
            location_name,
            brand,
            vendor,
            model,
            specifications,
            quantity,
            uom,
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
        
        if not existing_conn:
            conn.commit()
        
        print(f"✅ Asset created: {asset_code} for validation {validation_id}")
        return True
        
    except Exception as e:
        print(f"Error in create_asset_from_validation_id: {e}")
        print(traceback.format_exc())
        if existing_conn:
            # Jangan commit, biarkan parent yang handle rollback
            pass
        elif conn:
            conn.rollback()
        return False
    finally:
        if should_close and conn:
            conn.close()

# ==================== GET VALIDATIONS ====================
# ==================== GET VALIDATIONS ====================
@validation_bp.route('/api/validations', methods=['GET'])
def get_validations():
    """Mendapatkan daftar validations dengan lengkap (termasuk receivers)"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Query utama untuk validations
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
            v.asset_id,
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
            srd.item_preparation_id as device_item_prep_id,
            srd.detection_data as device_detection,
            
            -- Material info
            srm.scan_code,
            srm.scan_value as material_name,
            srm.photo_url as material_photo,
            srm.item_preparation_id as material_item_prep_id,
            srm.detection_data as material_detection,
            
            -- Preparation info
            dsp.checking_number as device_checking_number,
            dsp.checking_name as device_checking_name,
            dsp.id_preparation as device_preparation_id,
            dsp.checking_date as device_checking_date,
            dsp.remarks as device_remarks,
            msp.checking_number as material_checking_number,
            msp.checking_name as material_checking_name,
            msp.id_preparation as material_preparation_id,
            msp.checking_date as material_checking_date,
            msp.remarks as material_remarks,
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
        ORDER BY v.created_at DESC
        """)
        
        validations = cur.fetchall()
        
        result = []
        for val in validations:
            val_dict = dict(val)
            
            # Tentukan tipe dan siapkan data dasar
            if val_dict['validation_type'] == 'device':
                val_dict['item_name'] = val_dict.get('device_name')
                val_dict['serial_or_code'] = val_dict.get('serial_number')
                val_dict['checking_number'] = val_dict.get('device_checking_number')
                val_dict['checking_name'] = val_dict.get('device_checking_name')
                val_dict['checking_date'] = val_dict.get('device_checking_date')
                val_dict['photo_url'] = val_dict.get('device_photo')
                val_dict['remarks'] = val_dict.get('device_remarks')
                preparation_id = val_dict.get('device_preparation_id')
                item_prep_id = val_dict.get('device_item_prep_id')
            else:
                val_dict['item_name'] = val_dict.get('material_name')
                val_dict['serial_or_code'] = val_dict.get('scan_code')
                val_dict['checking_number'] = val_dict.get('material_checking_number')
                val_dict['checking_name'] = val_dict.get('material_checking_name')
                val_dict['checking_date'] = val_dict.get('material_checking_date')
                val_dict['photo_url'] = val_dict.get('material_photo')
                val_dict['remarks'] = val_dict.get('material_remarks')
                preparation_id = val_dict.get('material_preparation_id')
                item_prep_id = val_dict.get('material_item_prep_id')
            
            # Default values
            brand = None
            vendor = None
            model = None
            specifications = None
            project_name = None
            department_name = None
            receiver_name = None
            receiver_id = None
            department_id = None
            
            # ========== AMBIL DATA DARI ITEM PREPARATION (untuk receiver) ==========
            if item_prep_id:
                try:
                    if val_dict['validation_type'] == 'device':
                        cur.execute("""
                            SELECT 
                                dip.department_id,
                                d.department_name,
                                dip.receiver_id,
                                mr.receiver_name,
                                dip.project_name,
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
                    else:
                        cur.execute("""
                            SELECT 
                                mip.department_id,
                                d.department_name,
                                mip.receiver_id,
                                mr.receiver_name,
                                mip.project_name,
                                si.vendor,
                                si.material_detail as specifications
                            FROM materials_items_preparation mip
                            LEFT JOIN departments d ON mip.department_id = d.id_department
                            LEFT JOIN master_receivers mr ON mip.receiver_id = mr.id_receiver
                            LEFT JOIN materials_scanning_items si ON mip.scanning_item_id = si.id_item
                            WHERE mip.id_item_preparation = %s
                        """, (item_prep_id,))
                    
                    item_data = cur.fetchone()
                    
                    if item_data:
                        project_name = item_data.get('project_name')
                        department_name = item_data.get('department_name')
                        receiver_name = item_data.get('receiver_name')
                        receiver_id = item_data.get('receiver_id')
                        department_id = item_data.get('department_id')
                        
                        if val_dict['validation_type'] == 'device':
                            brand = item_data.get('brand')
                            vendor = item_data.get('vendor')
                            model = item_data.get('model')
                            specifications = item_data.get('specifications')
                        else:
                            vendor = item_data.get('vendor')
                            specifications = item_data.get('specifications')
                            
                except Exception as e:
                    print(f"Error fetching item data for validation {val_dict['id_validation']}: {e}")
            
            # ========== AMBIL BRAND/VENDOR DARI SCANNING ITEMS JIKA KOSONG ==========
            if not brand and not vendor and preparation_id:
                try:
                    if val_dict['validation_type'] == 'device':
                        cur.execute("""
                            SELECT brand, vendor, model, specifications
                            FROM devices_scanning_items
                            WHERE preparation_id = %s
                            LIMIT 1
                        """, (preparation_id,))
                        scan_item = cur.fetchone()
                        if scan_item:
                            brand = scan_item.get('brand')
                            vendor = scan_item.get('vendor')
                            model = scan_item.get('model')
                            if not specifications:
                                specifications = scan_item.get('specifications')
                    else:
                        cur.execute("""
                            SELECT vendor, material_detail
                            FROM materials_scanning_items
                            WHERE preparation_id = %s
                            LIMIT 1
                        """, (preparation_id,))
                        scan_item = cur.fetchone()
                        if scan_item:
                            vendor = scan_item.get('vendor')
                            if not specifications:
                                specifications = scan_item.get('material_detail')
                except Exception as e:
                    print(f"Error fetching scanning items for preparation {preparation_id}: {e}")
            
            # ========== AMBIL DATA RECEIVER DARI SESSION ==========
            # Untuk memastikan receiver muncul, coba ambil dari validasi yang sudah approve
            receivers_list = []
            
            if receiver_name:
                receivers_list.append({
                    'receiver_id': receiver_id,
                    'receiver_name': receiver_name,
                    'department_name': department_name
                })
            elif validation_id and val_dict['validation_status'] == 'approved':
                # Coba ambil receiver dari validations yang sudah di-approve
                try:
                    if val_dict['validation_type'] == 'device' and val_dict.get('device_item_prep_id'):
                        cur.execute("""
                            SELECT 
                                dip.receiver_id,
                                mr.receiver_name,
                                d.department_name
                            FROM validations v
                            JOIN devices_items_preparation dip ON v.item_preparation_id = dip.id_item_preparation
                            LEFT JOIN master_receivers mr ON dip.receiver_id = mr.id_receiver
                            LEFT JOIN departments d ON dip.department_id = d.id_department
                            WHERE v.id_validation = %s
                            AND dip.receiver_id IS NOT NULL
                        """, (val_dict['id_validation'],))
                    else:
                        cur.execute("""
                            SELECT 
                                mip.receiver_id,
                                mr.receiver_name,
                                d.department_name
                            FROM validations v
                            JOIN materials_items_preparation mip ON v.material_item_preparation_id = mip.id_item_preparation
                            LEFT JOIN master_receivers mr ON mip.receiver_id = mr.id_receiver
                            LEFT JOIN departments d ON mip.department_id = d.id_department
                            WHERE v.id_validation = %s
                            AND mip.receiver_id IS NOT NULL
                        """, (val_dict['id_validation'],))
                    
                    rec_data = cur.fetchone()
                    if rec_data and rec_data.get('receiver_name'):
                        receivers_list.append({
                            'receiver_id': rec_data.get('receiver_id'),
                            'receiver_name': rec_data.get('receiver_name'),
                            'department_name': rec_data.get('department_name')
                        })
                except Exception as e:
                    print(f"Error fetching receiver from validation {validation_id}: {e}")
            
            # Format departments
            departments_list = []
            if department_name:
                departments_list.append({
                    'department_id': department_id,
                    'department_name': department_name,
                    'quantity': 1
                })
            
            # Tambahkan semua data ke response
            val_dict['brand'] = brand
            val_dict['vendor'] = vendor
            val_dict['model'] = model
            val_dict['specifications'] = specifications
            val_dict['project_name'] = project_name
            val_dict['departments'] = departments_list
            val_dict['receivers'] = receivers_list
            val_dict['preparation_id'] = preparation_id
            
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

# ==================== CREATE VALIDATION ====================
@validation_bp.route('/api/validations/create', methods=['POST'])
def create_validation():
    """Membuat record validation baru"""
    conn = None
    try:
        data = request.json
        print("="*50)
        print("Creating validation with data:", data)
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        scan_id = data.get('scan_id')
        scan_material_id = data.get('scan_material_id')
        item_preparation_id = data.get('item_preparation_id')
        material_item_preparation_id = data.get('material_item_preparation_id')
        user_id = data.get('user_id', 1)
        
        print(f"scan_id: {scan_id}")
        print(f"scan_material_id: {scan_material_id}")
        print(f"item_preparation_id: {item_preparation_id}")
        print(f"material_item_preparation_id: {material_item_preparation_id}")
        
        # Generate unique code
        import random
        import string
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        unique_code = f"VAL-{timestamp}-{random_str}"
        
        cur.execute("""
            INSERT INTO validations (
                scan_id, scan_material_id, item_preparation_id, 
                material_item_preparation_id, user_id, unique_code,
                validation_status, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_validation
        """, (
            scan_id,
            scan_material_id,
            item_preparation_id,
            material_item_preparation_id,
            user_id,
            unique_code,
            'pending',
            datetime.now()
        ))
        
        validation_id = cur.fetchone()[0]
        conn.commit()
        
        print(f"✅ Validation created with ID: {validation_id}, unique_code: {unique_code}")
        
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
        
        # Ambil informasi preparation_id dan validation_type sebelum update
        cur.execute("""
            SELECT 
                v.item_preparation_id,
                v.material_item_preparation_id,
                CASE 
                    WHEN v.scan_id IS NOT NULL THEN 'device'
                    WHEN v.scan_material_id IS NOT NULL THEN 'material'
                    ELSE 'unknown'
                END as validation_type
            FROM validations v
            WHERE v.id_validation = %s
        """, (validation_id,))
        val_info = cur.fetchone()
        
        item_preparation_id = val_info[0] if val_info else None
        material_item_preparation_id = val_info[1] if val_info else None
        validation_type = val_info[2] if val_info else None
        
        # Update validation status
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
        
        # COMMIT perubahan validation status TERLEBIH DAHULU
        conn.commit()
        print(f"✅ Validation {validation_id} status updated to {validation_status}")

        # ==================== CREATE ASSET IF APPROVED ====================
        if validation_status == 'approved' and is_approved:
            asset_result = None
            asset_code = None
            asset_id_created = None
            
            # CREATE ASSET
            try:
                from routes.assets import create_asset_from_validation
                from flask import current_app as app
                
                asset_data = {
                    'validation_id': validation_id,
                    'user_id': validated_by,
                    'validated_by': validated_by
                }
                
                with app.app_context():
                    from flask import Request
                    req = Request.from_values(json=asset_data)
                    response = create_asset_from_validation()
                    
                    if hasattr(response, 'get_json'):
                        asset_result = response.get_json()
                    else:
                        asset_result = response
                    
                    if asset_result and asset_result.get('success'):
                        asset_code = asset_result.get('asset_code')
                        asset_id_created = asset_result.get('asset_id')
                        print(f"✅ Asset created for validation {validation_id}: {asset_code}")
                        # Commit asset creation
                        conn.commit()
                    else:
                        print(f"Asset creation failed for validation {validation_id}: {asset_result}")
                        
            except Exception as asset_error:
                print(f"Error creating asset for validation {validation_id}: {asset_error}")
                print(traceback.format_exc())
            
            # ==================== CREATE REPORT ====================
            # Tunggu sebentar agar asset_id terupdate di database
            import time
            time.sleep(0.5)
            
            # Pastikan asset_id sudah terisi di validations
            cur.execute("SELECT asset_id FROM validations WHERE id_validation = %s", (validation_id,))
            check_row = cur.fetchone()
            
            if check_row and check_row[0]:
                print(f"✅ Asset_id found: {check_row[0]}, creating report...")
                
                try:
                    from routes.reports import create_report_from_validation
                    report_created, report_id = create_report_from_validation(validation_id, conn, cur)
                    if report_created:
                        print(f"✅ Report created/updated for validation {validation_id}")
                        conn.commit()
                    else:
                        print(f"Report creation failed for validation {validation_id}")
                except Exception as report_error:
                    print(f"Error creating report for validation {validation_id}: {report_error}")
                    print(traceback.format_exc())
            else:
                print(f"Asset_id still NULL for validation {validation_id}, retrying...")
                # Coba lagi setelah 1 detik
                time.sleep(1)
                cur.execute("SELECT asset_id FROM validations WHERE id_validation = %s", (validation_id,))
                check_row = cur.fetchone()
                if check_row and check_row[0]:
                    try:
                        from routes.reports import create_report_from_validation
                        report_created, report_id = create_report_from_validation(validation_id, conn, cur)
                        if report_created:
                            print(f"✅ Report created after retry for validation {validation_id}")
                            conn.commit()
                    except Exception as report_error:
                        print(f"Error creating report on retry: {report_error}")
                else:
                    print(f"Asset_id still NULL after retry, report not created")
                      
            # ==================== UPDATE SESSION STATUS ====================
            try:
                if validation_type == 'device' and item_preparation_id:
                    cur.execute("""
                        SELECT dip.preparation_id
                        FROM devices_items_preparation dip
                        WHERE dip.id_item_preparation = %s
                    """, (item_preparation_id,))
                    prep = cur.fetchone()
                    if prep:
                        check_and_update_session_status(prep[0], 'device')
                elif validation_type == 'material' and material_item_preparation_id:
                    cur.execute("""
                        SELECT mip.preparation_id
                        FROM materials_items_preparation mip
                        WHERE mip.id_item_preparation = %s
                    """, (material_item_preparation_id,))
                    prep = cur.fetchone()
                    if prep:
                        check_and_update_session_status(prep[0], 'material')
            except Exception as session_error:
                print(f"Error updating session status: {session_error}")
        
        # Final commit untuk semua perubahan
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
        action = data.get('action')
        rejection_reason = data.get('rejection_reason')
        validated_by = data.get('validated_by', 1)
        
        if not validation_ids:
            return jsonify({
                'success': False,
                'error': 'No validation IDs provided'
            }), 400
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        validation_status = 'approved' if action == 'approve' else 'rejected'
        is_approved = action == 'approve'
        
        updated_count = 0
        created_assets = []
        
        for val_id in validation_ids:
            # Ambil informasi validation sebelum update
            cur.execute("""
                SELECT 
                    item_preparation_id,
                    material_item_preparation_id,
                    scan_id,
                    scan_material_id,
                    CASE 
                        WHEN scan_id IS NOT NULL THEN 'device'
                        WHEN scan_material_id IS NOT NULL THEN 'material'
                        ELSE 'unknown'
                    END as validation_type
                FROM validations 
                WHERE id_validation = %s
            """, (val_id,))
            val_info = cur.fetchone()
            
            if not val_info:
                continue
                
            item_prep_id = val_info['item_preparation_id']
            material_item_prep_id = val_info['material_item_preparation_id']
            validation_type = val_info['validation_type']
            
            # Update validation status
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
                
                # ==================== CREATE ASSET IF APPROVED ====================
                if validation_status == 'approved' and is_approved:
                    try:
                        conn.commit()
                        asset_created = create_asset_from_validation_id(val_id, validated_by, conn)
                        
                        if asset_created:
                            created_assets.append(val_id)
                            print(f"✅ Asset created for validation {val_id}")
                        else:
                            print(f"Asset creation failed for validation {val_id}")
                            
                    except Exception as asset_error:
                        print(f"Error creating asset for validation {val_id}: {asset_error}")
                        print(traceback.format_exc())
                
                # Update scan result status if rejected
                if validation_status == 'rejected':
                    try:
                        if val_info['scan_id']:
                            cur.execute("""
                                UPDATE scan_results_devices 
                                SET status = 'rejected', notes = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE id_scan = %s
                            """, (rejection_reason, val_info['scan_id']))
                        elif val_info['scan_material_id']:
                            cur.execute("""
                                UPDATE scan_results_materials 
                                SET status = 'rejected', notes = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE id_scan = %s
                            """, (rejection_reason, val_info['scan_material_id']))
                    except Exception as scan_error:
                        print(f"Error updating scan result: {scan_error}")
                
                # UPDATE SESSION STATUS
                try:
                    if validation_type == 'device' and item_prep_id:
                        cur.execute("""
                            SELECT dip.preparation_id
                            FROM devices_items_preparation dip
                            WHERE dip.id_item_preparation = %s
                        """, (item_prep_id,))
                        prep = cur.fetchone()
                        if prep:
                            check_and_update_session_status(prep['preparation_id'], 'device')
                    elif validation_type == 'material' and material_item_prep_id:
                        cur.execute("""
                            SELECT mip.preparation_id
                            FROM materials_items_preparation mip
                            WHERE mip.id_item_preparation = %s
                        """, (material_item_prep_id,))
                        prep = cur.fetchone()
                        if prep:
                            check_and_update_session_status(prep['preparation_id'], 'material')
                except Exception as session_error:
                    print(f"Error updating session status: {session_error}")
                
                # Commit setiap iterasi untuk asset
                if validation_status == 'approved' and is_approved:
                    conn.commit()
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'{updated_count} validations {validation_status}, {len(created_assets)} assets created',
            'updated_count': updated_count,
            'assets_created': len(created_assets)
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

# ==================== GET DETAIL ====================
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
                srd.serial_number,
                srd.scan_value as device_name,
                srd.detection_data as device_detection,
                srd.photo_url as device_photo,
                srm.scan_code,
                srm.scan_value as material_name,
                srm.detection_data as material_detection,
                srm.photo_url as material_photo,
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
        
        if result['validation_type'] == 'device':
            result['item_name'] = result.get('device_name')
            result['serial_or_code'] = result.get('serial_number')
            result['checking_number'] = result.get('device_checking_number')
            result['checking_name'] = result.get('device_checking_name')
            result['checking_date'] = result.get('device_checking_date')
            result['detection_data'] = result.get('device_detection')
            result['photo_url'] = result.get('device_photo')
            item_prep_id = result.get('item_preparation_id')
        else:
            result['item_name'] = result.get('material_name')
            result['serial_or_code'] = result.get('scan_code')
            result['checking_number'] = result.get('material_checking_number')
            result['checking_name'] = result.get('material_checking_name')
            result['checking_date'] = result.get('material_checking_date')
            result['detection_data'] = result.get('material_detection')
            result['photo_url'] = result.get('material_photo')
            item_prep_id = result.get('material_item_preparation_id')
        
        # ========== AMBIL DATA DEPARTMENT, RECEIVER, PROJECT, BRAND, VENDOR ==========
        department_name = None
        receiver_name = None
        project_name = None
        brand = None
        vendor = None
        model = None
        specifications = None
        
        if item_prep_id:
            if result['validation_type'] == 'device':
                cur.execute("""
                    SELECT 
                        dip.department_id,
                        d.department_name,
                        dip.receiver_id,
                        mr.receiver_name,
                        dip.project_name,
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
            else:
                cur.execute("""
                    SELECT 
                        mip.department_id,
                        d.department_name,
                        mip.receiver_id,
                        mr.receiver_name,
                        mip.project_name,
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
            
            if item_data:
                department_name = item_data.get('department_name')
                receiver_name = item_data.get('receiver_name')
                project_name = item_data.get('project_name')
                
                if result['validation_type'] == 'device':
                    brand = item_data.get('brand')
                    vendor = item_data.get('vendor')
                    model = item_data.get('model')
                    specifications = item_data.get('specifications')
                else:
                    vendor = item_data.get('vendor')
                    specifications = item_data.get('specifications')
        
        # Format departments dan receivers sebagai array
        departments = []
        if department_name:
            departments.append({
                'department_name': department_name,
                'quantity': 1
            })
        
        receivers = []
        if receiver_name:
            receivers.append({
                'receiver_name': receiver_name,
                'department_name': department_name
            })
        
        result['project_name'] = project_name
        result['departments'] = departments
        result['receivers'] = receivers
        result['brand'] = brand
        result['vendor'] = vendor
        result['model'] = model
        result['specifications'] = specifications
        
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
            
# ==================== DELETE VALIDATION ====================
@validation_bp.route('/api/validations/<int:validation_id>', methods=['DELETE'])
def delete_validation(validation_id):
    """Menghapus validation berdasarkan ID"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("SELECT id_validation FROM validations WHERE id_validation = %s", (validation_id,))
        if not cur.fetchone():
            return jsonify({
                'success': False,
                'error': 'Validation not found'
            }), 404
        
        cur.execute("DELETE FROM validations WHERE id_validation = %s", (validation_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Validation deleted successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error deleting validation: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== BULK DELETE VALIDATIONS ====================
@validation_bp.route('/api/validations/bulk-delete', methods=['POST'])
def bulk_delete_validations():
    """Menghapus multiple validations sekaligus"""
    conn = None
    try:
        data = request.json
        validation_ids = data.get('validation_ids', [])
        
        if not validation_ids:
            return jsonify({
                'success': False,
                'error': 'No validation IDs provided'
            }), 400
        
        conn = get_conn()
        cur = conn.cursor()
        
        deleted_count = 0
        
        for val_id in validation_ids:
            cur.execute("DELETE FROM validations WHERE id_validation = %s", (val_id,))
            if cur.rowcount > 0:
                deleted_count += 1
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'{deleted_count} validations deleted successfully',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error bulk deleting validations: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()