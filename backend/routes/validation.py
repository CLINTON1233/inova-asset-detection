from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime, timedelta
import traceback
import random
import string

validation_bp = Blueprint('validation', __name__)

def get_conn():
    return get_db_connection()

def generate_report_code():
    """Generate unique report code"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"RPT-{date_str}-{random_chars}"

# ==================== UPDATE OR CREATE REPORT ====================
def update_or_create_report_for_date(scan_date, conn, cur):
    """Update atau create report untuk tanggal tertentu"""
    try:
        # Cek apakah sudah ada report untuk tanggal ini
        cur.execute("""
            SELECT id_report, report_code, total_scans, valid_scans, error_scans, pending_scans,
                   devices_count, materials_count, locations_count, users_count, success_rate
            FROM asset_reports
            WHERE report_type = 'daily' AND report_date = %s
        """, (scan_date,))
        
        existing_report = cur.fetchone()
        
        # Ambil data validasi untuk tanggal tersebut
        cur.execute("""
            SELECT 
                COUNT(*) as total_scans,
                SUM(CASE WHEN v.validation_status = 'approved' THEN 1 ELSE 0 END) as valid_scans,
                SUM(CASE WHEN v.validation_status = 'rejected' THEN 1 ELSE 0 END) as error_scans,
                SUM(CASE WHEN v.validation_status = 'pending' THEN 1 ELSE 0 END) as pending_scans,
                SUM(CASE WHEN v.scan_id IS NOT NULL THEN 1 ELSE 0 END) as devices_count,
                SUM(CASE WHEN v.scan_material_id IS NOT NULL THEN 1 ELSE 0 END) as materials_count,
                COUNT(DISTINCT l.location_name) as locations_count,
                COUNT(DISTINCT u.username) as users_count
            FROM validations v
            LEFT JOIN devices_items_preparation dip ON v.item_preparation_id = dip.id_item_preparation
            LEFT JOIN materials_items_preparation mip ON v.material_item_preparation_id = mip.id_item_preparation
            LEFT JOIN devices_scanning_preparations dsp ON dip.preparation_id = dsp.id_preparation
            LEFT JOIN materials_scanning_preparations msp ON mip.preparation_id = msp.id_preparation
            LEFT JOIN locations l ON COALESCE(dsp.location_id, msp.location_id) = l.id_location
            LEFT JOIN users u ON v.user_id = u.id_user
            WHERE DATE(v.created_at) = %s
        """, (scan_date,))
        
        stats = cur.fetchone()
        
        total_scans = stats[0] or 0
        valid_scans = stats[1] or 0
        error_scans = stats[2] or 0
        pending_scans = stats[3] or 0
        devices_count = stats[4] or 0
        materials_count = stats[5] or 0
        locations_count = stats[6] or 0
        users_count = stats[7] or 0
        success_rate = (valid_scans / total_scans * 100) if total_scans > 0 else 0
        
        if existing_report:
            # Update existing report
            cur.execute("""
                UPDATE asset_reports 
                SET total_scans = %s,
                    valid_scans = %s,
                    error_scans = %s,
                    pending_scans = %s,
                    devices_count = %s,
                    materials_count = %s,
                    locations_count = %s,
                    users_count = %s,
                    success_rate = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id_report = %s
            """, (total_scans, valid_scans, error_scans, pending_scans,
                  devices_count, materials_count, locations_count, users_count,
                  success_rate, existing_report[0]))
            
            report_id = existing_report[0]
            print(f"✅ Report {existing_report[1]} updated for {scan_date}")
        else:
            # Create new report
            report_code = generate_report_code()
            cur.execute("""
                INSERT INTO asset_reports (
                    report_code, report_type, report_date, total_scans,
                    valid_scans, error_scans, pending_scans, devices_count,
                    materials_count, locations_count, users_count, success_rate,
                    generated_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_report
            """, (report_code, 'daily', scan_date, total_scans, valid_scans,
                  error_scans, pending_scans, devices_count, materials_count,
                  locations_count, users_count, success_rate, 1))
            
            report_id = cur.fetchone()[0]
            print(f"✅ New report {report_code} created for {scan_date}")
        
        # Update report_items untuk report ini (hapus yang lama dan insert ulang)
        cur.execute("DELETE FROM report_items WHERE report_id = %s", (report_id,))
        
        # Ambil semua validasi untuk tanggal ini
        cur.execute("""
            SELECT 
                v.id_validation,
                v.unique_code,
                v.validation_status,
                v.created_at,
                v.validated_at,
                COALESCE(v.scan_id, v.scan_material_id) as scan_id,
                CASE 
                    WHEN v.scan_id IS NOT NULL THEN 'device'
                    WHEN v.scan_material_id IS NOT NULL THEN 'material'
                    ELSE 'unknown'
                END as validation_type,
                srd.serial_number,
                srd.scan_value as device_name,
                srm.scan_code,
                srm.scan_value as material_name,
                l.location_name,
                u.username as created_by_name,
                vu.username as validated_by_name,
                a.asset_code
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
            LEFT JOIN assets a ON v.asset_id = a.id_assets
            WHERE DATE(v.created_at) = %s
            ORDER BY v.created_at DESC
        """, (scan_date,))
        
        validations = cur.fetchall()
        
        for val in validations:
            status_label = 'Valid' if val[2] == 'approved' else ('Error' if val[2] == 'rejected' else 'Pending')
            
            cur.execute("""
                INSERT INTO report_items (
                    report_id, scan_id, asset_code, asset_name, asset_type,
                    category, location_name, serial_or_code, status,
                    scan_date, scan_time, verified_by_name, unique_code
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                report_id,
                val[5],  # scan_id
                val[17],  # asset_code
                val[9] or val[11] or '-',  # device_name or material_name
                'Device' if val[6] == 'device' else 'Material',
                'Perangkat' if val[6] == 'device' else 'Material',
                val[13] or '-',  # location_name
                val[8] or val[10] or '-',  # serial_number or scan_code
                status_label,
                val[3].date() if val[3] else None,
                val[3].time() if val[3] else None,
                val[15] or val[14] or 'System',  # validated_by_name or created_by_name
                val[1] or '-'  # unique_code
            ))
        
        return True, report_id
        
    except Exception as e:
        print(f"Error updating/creating report: {e}")
        traceback.print_exc()
        return False, None

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
            cur.execute("""
                SELECT COUNT(*) as total_items
                FROM materials_items_preparation
                WHERE preparation_id = %s
            """, (preparation_id,))
            total_items = cur.fetchone()['total_items']
            
            cur.execute("""
                SELECT COUNT(DISTINCT mip.id_item_preparation) as validated_items
                FROM materials_items_preparation mip
                INNER JOIN validations v ON mip.id_item_preparation = v.material_item_preparation_id
                WHERE mip.preparation_id = %s 
                AND v.validation_status = 'approved'
            """, (preparation_id,))
            validated_items = cur.fetchone()['validated_items']
            
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

# ==================== GET VALIDATIONS ====================
@validation_bp.route('/api/validations', methods=['GET'])
def get_validations():
    """Mendapatkan daftar validations dengan departments, receivers, brand, dan vendor"""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
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
            srd.item_preparation_id as device_item_prep_id,
            
            -- Material info
            srm.scan_code,
            srm.scan_value as material_name,
            srm.photo_url as material_photo,
            srm.item_preparation_id as material_item_prep_id,
            
            -- Preparation info
            dsp.checking_number as device_checking_number,
            dsp.checking_name as device_checking_name,
            dsp.id_preparation as device_preparation_id,
            msp.checking_number as material_checking_number,
            msp.checking_name as material_checking_name,
            msp.id_preparation as material_preparation_id,
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
            
            if val_dict['validation_type'] == 'device':
                val_dict['item_name'] = val_dict.get('device_name')
                val_dict['serial_or_code'] = val_dict.get('serial_number')
                val_dict['checking_number'] = val_dict.get('device_checking_number')
                val_dict['checking_name'] = val_dict.get('device_checking_name')
                val_dict['photo_url'] = val_dict.get('device_photo')
                item_prep_id = val_dict.get('device_item_prep_id')
            else:
                val_dict['item_name'] = val_dict.get('material_name')
                val_dict['serial_or_code'] = val_dict.get('scan_code')
                val_dict['checking_number'] = val_dict.get('material_checking_number')
                val_dict['checking_name'] = val_dict.get('material_checking_name')
                val_dict['photo_url'] = val_dict.get('material_photo')
                item_prep_id = val_dict.get('material_item_prep_id')
            
            project_name = None
            department_name = None
            receiver_name = None
            brand = None
            vendor = None
            model = None
            specifications = None
            
            if item_prep_id:
                if val_dict['validation_type'] == 'device':
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
                else:
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
                
                if item_data:
                    project_name = item_data.get('project_name')
                    department_name = item_data.get('department_name')
                    receiver_name = item_data.get('receiver_name')
                    
                    if val_dict['validation_type'] == 'device':
                        brand = item_data.get('brand')
                        vendor = item_data.get('vendor')
                        model = item_data.get('model')
                        specifications = item_data.get('specifications')
                    else:
                        vendor = item_data.get('vendor')
                        specifications = item_data.get('specifications')
            
            departments = []
            if department_name:
                departments.append({
                    'department_id': item_data.get('department_id') if item_data else None,
                    'department_name': department_name,
                    'quantity': 1
                })
            
            receivers = []
            if receiver_name:
                receivers.append({
                    'receiver_id': item_data.get('receiver_id') if item_data else None,
                    'receiver_name': receiver_name,
                    'department_name': department_name
                })
            
            val_dict['project_name'] = project_name
            val_dict['departments'] = departments
            val_dict['receivers'] = receivers
            val_dict['brand'] = brand
            val_dict['vendor'] = vendor
            val_dict['model'] = model
            val_dict['specifications'] = specifications
            
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
        print("Creating validation:", data)
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        scan_id = data.get('scan_id')
        scan_material_id = data.get('scan_material_id')
        item_preparation_id = data.get('item_preparation_id')
        material_item_preparation_id = data.get('material_item_preparation_id')
        user_id = data.get('user_id', 1)
        
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
            SELECT 
                v.item_preparation_id,
                v.material_item_preparation_id,
                v.created_at,
                CASE 
                    WHEN v.scan_id IS NOT NULL THEN 'device'
                    WHEN v.scan_material_id IS NOT NULL THEN 'material'
                    ELSE 'unknown'
                END as validation_type
            FROM validations v
            WHERE v.id_validation = %s
        """, (validation_id,))
        val_info = cur.fetchone()
        
        if not val_info:
            return jsonify({'success': False, 'error': 'Validation not found'}), 404
            
        item_preparation_id = val_info[0] if val_info else None
        material_item_preparation_id = val_info[1] if val_info else None
        created_at = val_info[2] if val_info else datetime.now()
        validation_type = val_info[3] if val_info else None
        
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
            return jsonify({'success': False, 'error': 'Validation not found'}), 404
        
        conn.commit()
        
        # ==================== CREATE ASSET IF APPROVED ====================
        if validation_status == 'approved' and is_approved:
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
                        print(f"✅ Asset created for validation {validation_id}: {asset_result.get('asset_code')}")
                    else:
                        print(f"⚠️ Asset creation failed for validation {validation_id}: {asset_result}")
                        
            except Exception as asset_error:
                print(f"Error creating asset for validation {validation_id}: {asset_error}")
                print(traceback.format_exc())
            
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
                print(f"Error updating session status for validation {validation_id}: {session_error}")
        
        # ==================== UPDATE OR CREATE REPORT ====================
        # Update report untuk tanggal created_at validation ini
        scan_date = created_at.date() if hasattr(created_at, 'date') else created_at
        report_updated, report_id = update_or_create_report_for_date(scan_date, conn, cur)
        
        if report_updated:
            print(f"✅ Report updated for date {scan_date}")
        else:
            print(f"⚠️ Failed to update report for date {scan_date}")
        
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
        cur = conn.cursor()
        
        validation_status = 'approved' if action == 'approve' else 'rejected'
        is_approved = action == 'approve'
        
        updated_count = 0
        dates_to_update = set()
        
        for val_id in validation_ids:
            cur.execute("""
                SELECT 
                    item_preparation_id,
                    material_item_preparation_id,
                    created_at,
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
                
            item_prep_id = val_info[0] if val_info else None
            material_item_prep_id = val_info[1] if val_info else None
            created_at = val_info[2] if val_info else datetime.now()
            validation_type = val_info[3] if val_info else None
            
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
                dates_to_update.add(created_at.date() if hasattr(created_at, 'date') else created_at)
                
                if validation_status == 'approved' and is_approved:
                    try:
                        from routes.assets import create_asset_from_validation
                        from flask import current_app as app
                        
                        asset_data = {
                            'validation_id': val_id,
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
                                print(f"✅ Asset created for validation {val_id}: {asset_result.get('asset_code')}")
                                
                    except Exception as asset_error:
                        print(f"Error creating asset for validation {val_id}: {asset_error}")
                
                if validation_status == 'rejected':
                    try:
                        cur.execute("""
                            SELECT scan_id, scan_material_id 
                            FROM validations 
                            WHERE id_validation = %s
                        """, (val_id,))
                        scan_info = cur.fetchone()
                        
                        if scan_info and scan_info[0]:  
                            cur.execute("""
                                UPDATE scan_results_devices 
                                SET status = 'rejected', notes = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE id_scan = %s
                            """, (rejection_reason, scan_info[0]))
                        elif scan_info and scan_info[1]:
                            cur.execute("""
                                UPDATE scan_results_materials 
                                SET status = 'rejected', notes = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE id_scan = %s
                            """, (rejection_reason, scan_info[1]))
                    except Exception as scan_error:
                        print(f"Error updating scan result for validation {val_id}: {scan_error}")
                
                try:
                    if validation_type == 'device' and item_prep_id:
                        cur.execute("""
                            SELECT dip.preparation_id
                            FROM devices_items_preparation dip
                            WHERE dip.id_item_preparation = %s
                        """, (item_prep_id,))
                        prep = cur.fetchone()
                        if prep:
                            check_and_update_session_status(prep[0], 'device')
                    elif validation_type == 'material' and material_item_prep_id:
                        cur.execute("""
                            SELECT mip.preparation_id
                            FROM materials_items_preparation mip
                            WHERE mip.id_item_preparation = %s
                        """, (material_item_prep_id,))
                        prep = cur.fetchone()
                        if prep:
                            check_and_update_session_status(prep[0], 'material')
                except Exception as session_error:
                    print(f"Error updating session status for validation {val_id}: {session_error}")
        
        # Update reports untuk semua tanggal yang terpengaruh
        for scan_date in dates_to_update:
            update_or_create_report_for_date(scan_date, conn, cur)
        
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
        
        cur.execute("""
            SELECT created_at FROM validations WHERE id_validation = %s
        """, (validation_id,))
        val = cur.fetchone()
        
        if not val:
            return jsonify({
                'success': False,
                'error': 'Validation not found'
            }), 404
        
        created_at = val[0]
        
        cur.execute("DELETE FROM validations WHERE id_validation = %s", (validation_id,))
        
        # Update report untuk tanggal yang terpengaruh
        scan_date = created_at.date() if hasattr(created_at, 'date') else created_at
        update_or_create_report_for_date(scan_date, conn, cur)
        
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
        
        dates_to_update = set()
        deleted_count = 0
        
        for val_id in validation_ids:
            cur.execute("SELECT created_at FROM validations WHERE id_validation = %s", (val_id,))
            val = cur.fetchone()
            if val:
                dates_to_update.add(val[0].date())
            
            cur.execute("DELETE FROM validations WHERE id_validation = %s", (val_id,))
            if cur.rowcount > 0:
                deleted_count += 1
        
        # Update reports untuk semua tanggal yang terpengaruh
        for scan_date in dates_to_update:
            update_or_create_report_for_date(scan_date, conn, cur)
        
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