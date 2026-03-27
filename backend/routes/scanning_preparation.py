from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime
import random
import string
import traceback

scanning_prep_bp = Blueprint('scanning_prep', __name__)

def generate_checking_number():
    """Generate unique checking number format: SCAN-YYYYMMDD-XXXX"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SCAN-{date_str}-{random_chars}"

def generate_item_number(preparation_id, item_index, sub_item_index):
    """Generate item number format: ITEM-{preparation_id}-{item_index}-{sub_item_index}"""
    return f"ITEM-{preparation_id}-{item_index + 1}-{sub_item_index + 1}"

# ==================== ENDPOINTS UNTUK DEVICES ====================
@scanning_prep_bp.route('/api/devices/scanning-preparation/create', methods=['POST'])
def create_devices_scanning_preparation():
    """Membuat persiapan scanning untuk Devices"""
    conn = None
    try:
        data = request.json
        print("="*50)
        print("CREATE DEVICES PREPARATION:", data)
        
        checking_name = data.get('checking_name')
        category_id = data.get('category_id')
        location_id = data.get('location_id')
        checking_date = data.get('checking_date')
        remarks = data.get('remarks')
        items = data.get('items', []) 
        user_id = data.get('user_id', 1) 
        
        if not all([checking_name, category_id, location_id, checking_date]):
            missing = []
            if not checking_name: missing.append('checking_name')
            if not category_id: missing.append('category_id')
            if not location_id: missing.append('location_id')
            if not checking_date: missing.append('checking_date')
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        if not items or len(items) == 0:
            return jsonify({
                'success': False,
                'error': 'At least one item is required'
            }), 400
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        checking_number = generate_checking_number()
        
        # Insert ke devices_scanning_preparations
        cur.execute("""
            INSERT INTO devices_scanning_preparations 
            (checking_number, checking_name, category_id, location_id, checking_date, remarks, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id_preparation
        """, (checking_number, checking_name, category_id, location_id, checking_date, remarks, user_id))
        
        preparation_id = cur.fetchone()[0]
        print(f"Created devices preparation with ID: {preparation_id}")

        total_items_created = 0
        
        for idx, item in enumerate(items):
            quantity = item.get('quantity', 1)
            
            # Insert ke devices_scanning_items
            cur.execute("""
                INSERT INTO devices_scanning_items
                (preparation_id, device_name, device_detail, brand, vendor, model, specifications, quantity, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_item
            """, (
                preparation_id,
                item.get('device_name', ''),
                item.get('device_detail', ''),
                item.get('brand', ''),
                item.get('vendor', ''),
                item.get('model', ''),
                item.get('specifications', ''),
                quantity,
                user_id
            ))
            
            scanning_item_id = cur.fetchone()[0]
            
            # Insert department distributions
            departments = item.get('departments', [])
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    cur.execute("SELECT id_department FROM departments WHERE id_department = %s", (dept['department_id'],))
                    if cur.fetchone():
                        cur.execute("""
                            INSERT INTO devices_item_departments (scanning_item_id, department_id, quantity)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (scanning_item_id, department_id) 
                            DO UPDATE SET quantity = EXCLUDED.quantity
                        """, (scanning_item_id, dept['department_id'], dept['quantity']))

            # Create individual items
            dept_allocation = {}
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    dept_allocation[dept['department_id']] = dept['quantity']
            
            for sub_idx in range(quantity):
                assigned_dept = None
                for dept_id, qty in dept_allocation.items():
                    if qty > 0:
                        assigned_dept = dept_id
                        dept_allocation[dept_id] -= 1
                        break
                
                item_number = generate_item_number(preparation_id, idx, sub_idx)
                
                cur.execute("""
                    INSERT INTO devices_items_preparation
                    (scanning_item_id, preparation_id, item_number, status, department_id, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    scanning_item_id,
                    preparation_id,
                    item_number,
                    'pending',
                    assigned_dept,
                    user_id
                ))
                
                total_items_created += 1
        
        conn.commit()
        print(f"Created {total_items_created} individual device items")
        
        return jsonify({
            'success': True,
            'message': 'Devices scanning preparation created successfully',
            'checking_number': checking_number,
            'preparation_id': preparation_id,
            'total_items_created': total_items_created
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print("ERROR:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
@scanning_prep_bp.route('/api/devices/scanning-preparation/<int:prep_id>', methods=['PUT'])
def update_devices_scanning_preparation(prep_id):
    """Update persiapan scanning untuk Devices"""
    conn = None
    try:
        data = request.json
        print("="*50)
        print("UPDATE DEVICES PREPARATION ID:", prep_id)
        print("UPDATE DATA:", data)
        
        checking_name = data.get('checking_name')
        category_id = data.get('category_id')
        location_id = data.get('location_id')
        checking_date = data.get('checking_date')
        remarks = data.get('remarks')
        items = data.get('items', [])
        user_id = data.get('user_id', 1)
        
        if not all([checking_name, category_id, location_id, checking_date]):
            missing = []
            if not checking_name: missing.append('checking_name')
            if not category_id: missing.append('category_id')
            if not location_id: missing.append('location_id')
            if not checking_date: missing.append('checking_date')
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        if not items or len(items) == 0:
            return jsonify({
                'success': False,
                'error': 'At least one item is required'
            }), 400
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Update header preparation
        cur.execute("""
            UPDATE devices_scanning_preparations 
            SET checking_name = %s,
                category_id = %s,
                location_id = %s,
                checking_date = %s,
                remarks = %s,
                user_id = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_preparation = %s
            RETURNING id_preparation
        """, (checking_name, category_id, location_id, checking_date, remarks, user_id, prep_id))
        
        updated = cur.fetchone()
        if not updated:
            return jsonify({
                'success': False,
                'error': 'Preparation not found'
            }), 404
        
        # Delete existing items and related data
        # First, get all scanning_item_ids to delete related data
        cur.execute("""
            SELECT id_item FROM devices_scanning_items 
            WHERE preparation_id = %s
        """, (prep_id,))
        old_items = cur.fetchall()
        
        for old_item in old_items:
            item_id = old_item['id_item']
            # Delete department distributions
            cur.execute("DELETE FROM devices_item_departments WHERE scanning_item_id = %s", (item_id,))
            # Delete individual items preparation
            cur.execute("DELETE FROM devices_items_preparation WHERE scanning_item_id = %s", (item_id,))
        
        # Delete all scanning items
        cur.execute("DELETE FROM devices_scanning_items WHERE preparation_id = %s", (prep_id,))
        
        total_items_created = 0
        
        # Create new items
        for idx, item in enumerate(items):
            quantity = item.get('quantity', 1)
            
            # Insert ke devices_scanning_items
            cur.execute("""
                INSERT INTO devices_scanning_items
                (preparation_id, device_name, device_detail, brand, vendor, model, specifications, quantity, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_item
            """, (
                prep_id,
                item.get('device_name', ''),
                item.get('device_detail', ''),
                item.get('brand', ''),
                item.get('vendor', ''),
                item.get('model', ''),
                item.get('specifications', ''),
                quantity,
                user_id
            ))
            
            scanning_item_id = cur.fetchone()[0]
            
            # Insert department distributions
            departments = item.get('departments', [])
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    cur.execute("SELECT id_department FROM departments WHERE id_department = %s", (dept['department_id'],))
                    if cur.fetchone():
                        cur.execute("""
                            INSERT INTO devices_item_departments (scanning_item_id, department_id, quantity)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (scanning_item_id, department_id) 
                            DO UPDATE SET quantity = EXCLUDED.quantity
                        """, (scanning_item_id, dept['department_id'], dept['quantity']))
            
            # Create individual items
            dept_allocation = {}
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    dept_allocation[dept['department_id']] = dept['quantity']
            
            for sub_idx in range(quantity):
                assigned_dept = None
                for dept_id, qty in dept_allocation.items():
                    if qty > 0:
                        assigned_dept = dept_id
                        dept_allocation[dept_id] -= 1
                        break
                
                item_number = generate_item_number(prep_id, idx, sub_idx)
                
                cur.execute("""
                    INSERT INTO devices_items_preparation
                    (scanning_item_id, preparation_id, item_number, status, department_id, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    scanning_item_id,
                    prep_id,
                    item_number,
                    'pending',
                    assigned_dept,
                    user_id
                ))
                
                total_items_created += 1
        
        conn.commit()
        print(f"Updated {total_items_created} individual device items")
        
        return jsonify({
            'success': True,
            'message': 'Devices scanning preparation updated successfully',
            'preparation_id': prep_id,
            'total_items_created': total_items_created
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print("ERROR updating devices preparation:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
@scanning_prep_bp.route('/api/devices/scanning-preparation/<int:prep_id>', methods=['DELETE'])
def delete_devices_scanning_preparation(prep_id):
    """Menghapus persiapan scanning untuk Devices beserta semua data terkait"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Cek apakah preparation exists
        cur.execute("SELECT id_preparation FROM devices_scanning_preparations WHERE id_preparation = %s", (prep_id,))
        if not cur.fetchone():
            return jsonify({
                'success': False,
                'error': 'Preparation not found'
            }), 404
        
        # Delete akan cascade ke devices_scanning_items, devices_items_preparation, devices_item_departments
        # karena foreign key dengan ON DELETE CASCADE
        cur.execute("DELETE FROM devices_scanning_preparations WHERE id_preparation = %s", (prep_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Devices scanning preparation deleted successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print("ERROR deleting devices preparation:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/devices/scanning-preparation/list', methods=['GET'])
def get_devices_scanning_preparations():
    """Mendapatkan daftar persiapan scanning untuk Devices dengan progress yang akurat"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT 
                sp.id_preparation,
                sp.checking_number,
                sp.checking_name,
                sp.category_id,
                sp.location_id,
                sp.checking_date,
                sp.remarks,
                sp.status,
                sp.user_id,
                sp.created_at,
                sp.updated_at,
                ac.category_name,
                l.location_name,
                u.username as created_by_name,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_item', si.id_item,
                                'device_name', si.device_name,
                                'brand', si.brand,
                                'vendor', si.vendor,
                                'model', si.model,
                                'specifications', si.specifications,
                                'device_detail', si.device_detail,
                                'quantity', si.quantity,
                                'scanned_count', COALESCE((
                                    SELECT COUNT(*) 
                                    FROM devices_items_preparation dip 
                                    WHERE dip.scanning_item_id = si.id_item 
                                    AND dip.status = 'scanned'
                                ), 0),
                                'status', si.status
                            )
                        )
                        FROM devices_scanning_items si
                        WHERE si.preparation_id = sp.id_preparation
                    ),
                    '[]'::json
                ) as items
            FROM devices_scanning_preparations sp
            LEFT JOIN asset_categories ac ON sp.category_id = ac.id_category
            LEFT JOIN locations l ON sp.location_id = l.id_location
            LEFT JOIN users u ON sp.user_id = u.id_user
            ORDER BY sp.created_at DESC
        """)
        
        preparations = cur.fetchall()
        print(f"Found {len(preparations)} devices preparations")
        
        result = []
        for prep in preparations:
            prep_dict = dict(prep)
            items = prep_dict.get('items', [])
            total_items = len(items)
            total_qty = sum(item.get('quantity', 0) for item in items)
            
            # PERBAIKAN: Hitung scanned_count dari scan_results_devices
            # Ambil semua scan_results untuk preparation ini
            cur.execute("""
                SELECT COUNT(DISTINCT sr.id_scan) as scanned_count
                FROM scan_results_devices sr
                LEFT JOIN devices_items_preparation dip ON sr.item_preparation_id = dip.id_item_preparation
                WHERE dip.preparation_id = %s OR sr.item_preparation_id IN (
                    SELECT id_item_preparation FROM devices_items_preparation WHERE preparation_id = %s
                )
            """, (prep_dict['id_preparation'], prep_dict['id_preparation']))
            
            scan_result = cur.fetchone()
            total_scanned = scan_result['scanned_count'] if scan_result else 0
            
            # Juga hitung dari items_preparation yang sudah di-scan
            cur.execute("""
                SELECT COUNT(*) as scanned_count
                FROM devices_items_preparation
                WHERE preparation_id = %s AND status = 'scanned'
            """, (prep_dict['id_preparation'],))
            item_result = cur.fetchone()
            total_scanned = max(total_scanned, item_result['scanned_count'] if item_result else 0)

            if total_qty > 0:
                progress = int((total_scanned / total_qty) * 100)
                if progress == 100:
                    status = 'completed'
                elif progress > 0:
                    status = 'in-progress'
                else:
                    status = prep_dict.get('status', 'pending')
            else:
                status = prep_dict.get('status', 'pending')
                progress = 0
            
            prep_dict['totalItems'] = total_items
            prep_dict['totalQty'] = total_qty
            prep_dict['scannedCount'] = total_scanned  # Tambahkan scanned count
            prep_dict['progress'] = progress
            prep_dict['status'] = status
            prep_dict['type'] = 'device'
            
            result.append(prep_dict)
        
        return jsonify({
            'success': True,
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        print("Error in get_devices_scanning_preparations:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch devices scanning preparations'
        }), 500
    finally:
        if conn:
            conn.close()
            
@scanning_prep_bp.route('/api/devices/scanning-preparation/<int:prep_id>', methods=['GET'])
def get_devices_scanning_preparation(prep_id):
    """Mendapatkan detail persiapan scanning untuk Devices"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT sp.*, 
                   ac.category_name,
                   l.location_name,
                   u.username as created_by_name
            FROM devices_scanning_preparations sp
            LEFT JOIN asset_categories ac ON sp.category_id = ac.id_category
            LEFT JOIN locations l ON sp.location_id = l.id_location
            LEFT JOIN users u ON sp.user_id = u.id_user
            WHERE sp.id_preparation = %s
        """, (prep_id,))
        
        preparation = cur.fetchone()
        
        if not preparation:
            return jsonify({
                'success': False,
                'error': 'Preparation not found'
            }), 404
        
        prep_dict = dict(preparation)
        
        # Get items
        cur.execute("""
            SELECT si.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'department_id', d.id_department,
                               'department_name', d.department_name,
                               'quantity', id.quantity
                           )
                       ) FILTER (WHERE id.id_item_department IS NOT NULL),
                       '[]'
                   ) as departments
            FROM devices_scanning_items si
            LEFT JOIN devices_item_departments id ON si.id_item = id.scanning_item_id
            LEFT JOIN departments d ON id.department_id = d.id_department
            WHERE si.preparation_id = %s
            GROUP BY si.id_item
            ORDER BY si.id_item
        """, (prep_id,))
        
        items = cur.fetchall()
        prep_dict['items'] = [dict(item) for item in items]
        prep_dict['type'] = 'device'
        
        return jsonify({
            'success': True,
            'data': prep_dict
        })
        
    except Exception as e:
        print(f"Error in get_devices_scanning_preparation for id {prep_id}:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
@scanning_prep_bp.route('/api/devices/scanning-preparation/<int:prep_id>/progress', methods=['GET'])
def get_devices_preparation_progress(prep_id):
    """Mendapatkan progress scanning untuk preparation Devices"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Get all scanning items
        cur.execute("""
            SELECT si.id_item, si.device_name as item_name, si.brand, si.model, si.quantity
            FROM devices_scanning_items si
            WHERE si.preparation_id = %s
        """, (prep_id,))
        
        items = cur.fetchall()
        
        # Get all scan results for this preparation
        cur.execute("""
            SELECT 
                sr.id_scan,
                sr.item_preparation_id,
                sr.scanned_at,
                sr.scan_category,
                sr.scan_value,
                sr.serial_number,
                sr.status,
                sr.is_valid,
                ip.scanning_item_id,
                ip.item_number,
                si.id_item,
                si.device_name as item_name,
                si.brand,
                si.model,
                si.quantity as item_quantity
            FROM scan_results_devices sr
            LEFT JOIN devices_items_preparation ip ON sr.item_preparation_id = ip.id_item_preparation
            LEFT JOIN devices_scanning_items si ON ip.scanning_item_id = si.id_item
            WHERE si.preparation_id = %s OR ip.preparation_id = %s
            ORDER BY sr.scanned_at DESC
        """, (prep_id, prep_id))
        
        scan_results = cur.fetchall()
        
        # Build progress data
        progress = []
        total_scanned = 0
        total_target = 0
        
        for item in items:
            scanned_count = 0
            for scan in scan_results:
                if scan['scanning_item_id'] == item['id_item']:
                    scanned_count += 1
            total_scanned += scanned_count
            total_target += item['quantity']
            
            progress.append({
                'id_item': item['id_item'],
                'item_name': item['item_name'],
                'brand': item['brand'],
                'model': item['model'],
                'quantity': item['quantity'],
                'scanned': scanned_count,
                'percentage': int((scanned_count / item['quantity']) * 100) if item['quantity'] > 0 else 0
            })
        
        return jsonify({
            'success': True,
            'data': {
                'progress': progress,
                'scan_results': [dict(row) for row in scan_results],
                'total_scanned': total_scanned,
                'total_target': total_target,
                'overall_percentage': int((total_scanned / total_target) * 100) if total_target > 0 else 0,
                'type': 'device'
            }
        })
        
    except Exception as e:
        print(f"Error in get_devices_preparation_progress: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== ENDPOINTS UNTUK MATERIALS ====================
@scanning_prep_bp.route('/api/materials/scanning-preparation/create', methods=['POST'])
def create_materials_scanning_preparation():
    """Membuat persiapan scanning untuk Materials"""
    conn = None
    try:
        data = request.json
        print("="*50)
        print("CREATE MATERIALS PREPARATION:", data)
        
        checking_name = data.get('checking_name')
        category_id = data.get('category_id')
        location_id = data.get('location_id')
        checking_date = data.get('checking_date')
        remarks = data.get('remarks')
        items = data.get('items', []) 
        user_id = data.get('user_id', 1) 
        
        if not all([checking_name, category_id, location_id, checking_date]):
            missing = []
            if not checking_name: missing.append('checking_name')
            if not category_id: missing.append('category_id')
            if not location_id: missing.append('location_id')
            if not checking_date: missing.append('checking_date')
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        if not items or len(items) == 0:
            return jsonify({
                'success': False,
                'error': 'At least one item is required'
            }), 400
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        checking_number = generate_checking_number()
        
        # Insert ke materials_scanning_preparations
        cur.execute("""
            INSERT INTO materials_scanning_preparations 
            (checking_number, checking_name, category_id, location_id, checking_date, remarks, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id_preparation
        """, (checking_number, checking_name, category_id, location_id, checking_date, remarks, user_id))
        
        preparation_id = cur.fetchone()[0]
        print(f"Created materials preparation with ID: {preparation_id}")

        total_items_created = 0
        
        for idx, item in enumerate(items):
            quantity = item.get('quantity', 1)
            uom = item.get('uom', 'PCS')
            vendor = item.get('vendor', '')
            project_name = item.get('project_name', '')
            material_detail = item.get('specifications', '')
            
            # Insert ke materials_scanning_items
            cur.execute("""
                INSERT INTO materials_scanning_items
                (preparation_id, material_name, material_detail, quantity, uom, vendor, project_name, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_item
            """, (
                preparation_id,
                item.get('item_name', ''),
                material_detail,
                quantity,
                uom,
                vendor,
                project_name,
                user_id
            ))
            
            scanning_item_id = cur.fetchone()[0]
            
            # Insert department distributions
            departments = item.get('departments', [])
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    cur.execute("SELECT id_department FROM departments WHERE id_department = %s", (dept['department_id'],))
                    if cur.fetchone():
                        cur.execute("""
                            INSERT INTO materials_item_departments (scanning_item_id, department_id, quantity)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (scanning_item_id, department_id) 
                            DO UPDATE SET quantity = EXCLUDED.quantity
                        """, (scanning_item_id, dept['department_id'], dept['quantity']))

            # Create individual items
            dept_allocation = {}
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    dept_allocation[dept['department_id']] = dept['quantity']
            
            # Untuk material, quantity bisa desimal, jadi kita buat individual items dengan quantity terpisah
            # Karena material mungkin tidak perlu per-unit seperti devices, kita tetap buat individual items
            # untuk tracking per item
            for sub_idx in range(int(quantity) if quantity >= 1 else 1):
                assigned_dept = None
                # Untuk quantity desimal, kita alokasikan berdasarkan proporsi
                if len(dept_allocation) > 0:
                    # Alokasi berdasarkan sisa quantity
                    remaining = quantity - sub_idx
                    for dept_id, qty in dept_allocation.items():
                        if qty > 0 and remaining > 0:
                            assigned_dept = dept_id
                            dept_allocation[dept_id] -= 1
                            break
                
                item_number = generate_item_number(preparation_id, idx, sub_idx)
                
                cur.execute("""
                    INSERT INTO materials_items_preparation
                    (scanning_item_id, preparation_id, item_number, quantity, uom, vendor, project_name, status, department_id, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    scanning_item_id,
                    preparation_id,
                    item_number,
                    1.0,  # Setiap individual item quantity = 1
                    uom,
                    vendor,
                    project_name,
                    'pending',
                    assigned_dept,
                    user_id
                ))
                
                total_items_created += 1
        
        conn.commit()
        print(f"Created {total_items_created} individual material items")
        
        return jsonify({
            'success': True,
            'message': 'Materials scanning preparation created successfully',
            'checking_number': checking_number,
            'preparation_id': preparation_id,
            'total_items_created': total_items_created
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print("ERROR:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
@scanning_prep_bp.route('/api/materials/scanning-preparation/<int:prep_id>', methods=['PUT'])
def update_materials_scanning_preparation(prep_id):
    """Update persiapan scanning untuk Materials"""
    conn = None
    try:
        data = request.json
        print("="*50)
        print("UPDATE MATERIALS PREPARATION ID:", prep_id)
        print("UPDATE DATA:", data)
        
        checking_name = data.get('checking_name')
        category_id = data.get('category_id')
        location_id = data.get('location_id')
        checking_date = data.get('checking_date')
        remarks = data.get('remarks')
        items = data.get('items', [])
        user_id = data.get('user_id', 1)
        
        if not all([checking_name, category_id, location_id, checking_date]):
            missing = []
            if not checking_name: missing.append('checking_name')
            if not category_id: missing.append('category_id')
            if not location_id: missing.append('location_id')
            if not checking_date: missing.append('checking_date')
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        if not items or len(items) == 0:
            return jsonify({
                'success': False,
                'error': 'At least one item is required'
            }), 400
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Update header preparation
        cur.execute("""
            UPDATE materials_scanning_preparations 
            SET checking_name = %s,
                category_id = %s,
                location_id = %s,
                checking_date = %s,
                remarks = %s,
                user_id = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_preparation = %s
            RETURNING id_preparation
        """, (checking_name, category_id, location_id, checking_date, remarks, user_id, prep_id))
        
        updated = cur.fetchone()
        if not updated:
            return jsonify({
                'success': False,
                'error': 'Preparation not found'
            }), 404
        
        # Delete existing items and related data
        cur.execute("""
            SELECT id_item FROM materials_scanning_items 
            WHERE preparation_id = %s
        """, (prep_id,))
        old_items = cur.fetchall()
        
        for old_item in old_items:
            item_id = old_item['id_item']
            # Delete department distributions
            cur.execute("DELETE FROM materials_item_departments WHERE scanning_item_id = %s", (item_id,))
            # Delete individual items preparation
            cur.execute("DELETE FROM materials_items_preparation WHERE scanning_item_id = %s", (item_id,))
        
        # Delete all scanning items
        cur.execute("DELETE FROM materials_scanning_items WHERE preparation_id = %s", (prep_id,))
        
        total_items_created = 0
        
        # Create new items
        for idx, item in enumerate(items):
            quantity = item.get('quantity', 1)
            uom = item.get('uom', 'PCS')
            vendor = item.get('vendor', '')
            project_name = item.get('project_name', '')
            material_detail = item.get('specifications', '')
            
            # Insert ke materials_scanning_items
            cur.execute("""
                INSERT INTO materials_scanning_items
                (preparation_id, material_name, material_detail, quantity, uom, vendor, project_name, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_item
            """, (
                prep_id,
                item.get('item_name', ''),
                material_detail,
                quantity,
                uom,
                vendor,
                project_name,
                user_id
            ))
            
            scanning_item_id = cur.fetchone()[0]
            
            # Insert department distributions
            departments = item.get('departments', [])
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    cur.execute("SELECT id_department FROM departments WHERE id_department = %s", (dept['department_id'],))
                    if cur.fetchone():
                        cur.execute("""
                            INSERT INTO materials_item_departments (scanning_item_id, department_id, quantity)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (scanning_item_id, department_id) 
                            DO UPDATE SET quantity = EXCLUDED.quantity
                        """, (scanning_item_id, dept['department_id'], dept['quantity']))
            
            # Create individual items
            dept_allocation = {}
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    dept_allocation[dept['department_id']] = dept['quantity']
            
            for sub_idx in range(int(quantity) if quantity >= 1 else 1):
                assigned_dept = None
                if len(dept_allocation) > 0:
                    remaining = quantity - sub_idx
                    for dept_id, qty in dept_allocation.items():
                        if qty > 0 and remaining > 0:
                            assigned_dept = dept_id
                            dept_allocation[dept_id] -= 1
                            break
                
                item_number = generate_item_number(prep_id, idx, sub_idx)
                
                cur.execute("""
                    INSERT INTO materials_items_preparation
                    (scanning_item_id, preparation_id, item_number, quantity, uom, vendor, project_name, status, department_id, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    scanning_item_id,
                    prep_id,
                    item_number,
                    1.0,
                    uom,
                    vendor,
                    project_name,
                    'pending',
                    assigned_dept,
                    user_id
                ))
                
                total_items_created += 1
        
        conn.commit()
        print(f"Updated {total_items_created} individual material items")
        
        return jsonify({
            'success': True,
            'message': 'Materials scanning preparation updated successfully',
            'preparation_id': prep_id,
            'total_items_created': total_items_created
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print("ERROR updating materials preparation:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
@scanning_prep_bp.route('/api/materials/scanning-preparation/<int:prep_id>', methods=['DELETE'])
def delete_materials_scanning_preparation(prep_id):
    """Menghapus persiapan scanning untuk Materials beserta semua data terkait"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Cek apakah preparation exists
        cur.execute("SELECT id_preparation FROM materials_scanning_preparations WHERE id_preparation = %s", (prep_id,))
        if not cur.fetchone():
            return jsonify({
                'success': False,
                'error': 'Preparation not found'
            }), 404
        
        # Delete akan cascade ke materials_scanning_items, materials_items_preparation, materials_item_departments
        cur.execute("DELETE FROM materials_scanning_preparations WHERE id_preparation = %s", (prep_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Materials scanning preparation deleted successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print("ERROR deleting materials preparation:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
# ==================== ENDPOINT DETAIL UNTUK MATERIALS ====================
@scanning_prep_bp.route('/api/materials/scanning-preparation/<int:prep_id>', methods=['GET'])
def get_materials_scanning_preparation(prep_id):
    """Mendapatkan detail persiapan scanning untuk Materials"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT sp.*, 
                   ac.category_name,
                   l.location_name,
                   u.username as created_by_name
            FROM materials_scanning_preparations sp
            LEFT JOIN asset_categories ac ON sp.category_id = ac.id_category
            LEFT JOIN locations l ON sp.location_id = l.id_location
            LEFT JOIN users u ON sp.user_id = u.id_user
            WHERE sp.id_preparation = %s
        """, (prep_id,))
        
        preparation = cur.fetchone()
        
        if not preparation:
            return jsonify({
                'success': False,
                'error': 'Preparation not found'
            }), 404
        
        prep_dict = dict(preparation)
        
        # Get items dengan informasi quantity yang benar
        cur.execute("""
            SELECT 
                si.id_item,
                si.material_name as item_name,
                si.material_detail as specifications,
                si.quantity,
                si.uom,
                si.vendor,
                si.project_name,
                si.status,
                si.created_at,
                COALESCE(
                    (
                        SELECT COUNT(*) 
                        FROM materials_items_preparation mip 
                        WHERE mip.scanning_item_id = si.id_item 
                        AND mip.status = 'scanned'
                    ), 0
                ) as scanned_count,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'department_id', d.id_department,
                            'department_name', d.department_name,
                            'quantity', id.quantity
                        )
                    ) FILTER (WHERE id.id_item_department IS NOT NULL),
                    '[]'::json
                ) as departments
            FROM materials_scanning_items si
            LEFT JOIN materials_item_departments id ON si.id_item = id.scanning_item_id
            LEFT JOIN departments d ON id.department_id = d.id_department
            WHERE si.preparation_id = %s
            GROUP BY si.id_item
            ORDER BY si.id_item
        """, (prep_id,))
        
        items = cur.fetchall()
        prep_dict['items'] = [dict(item) for item in items]
        prep_dict['type'] = 'material'
        
        return jsonify({
            'success': True,
            'data': prep_dict
        })
        
    except Exception as e:
        print(f"Error in get_materials_scanning_preparation for id {prep_id}:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/materials/scanning-preparation/list', methods=['GET'])
def get_materials_scanning_preparations():
    """Mendapatkan daftar persiapan scanning untuk Materials dengan progress yang akurat"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT 
                sp.id_preparation,
                sp.checking_number,
                sp.checking_name,
                sp.category_id,
                sp.location_id,
                sp.checking_date,
                sp.remarks,
                sp.status,
                sp.user_id,
                sp.created_at,
                sp.updated_at,
                ac.category_name,
                l.location_name,
                u.username as created_by_name,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_item', si.id_item,
                                'material_name', si.material_name,
                                'material_detail', si.material_detail,
                                'quantity', si.quantity,
                                'uom', si.uom,
                                'vendor', si.vendor,
                                'project_name', si.project_name,
                                'scanned_count', COALESCE((
                                    SELECT COUNT(*) 
                                    FROM materials_items_preparation mip 
                                    WHERE mip.scanning_item_id = si.id_item 
                                    AND mip.status = 'scanned'
                                ), 0),
                                'status', si.status
                            )
                        )
                        FROM materials_scanning_items si
                        WHERE si.preparation_id = sp.id_preparation
                    ),
                    '[]'::json
                ) as items
            FROM materials_scanning_preparations sp
            LEFT JOIN asset_categories ac ON sp.category_id = ac.id_category
            LEFT JOIN locations l ON sp.location_id = l.id_location
            LEFT JOIN users u ON sp.user_id = u.id_user
            ORDER BY sp.created_at DESC
        """)
        
        preparations = cur.fetchall()
        print(f"Found {len(preparations)} materials preparations")
        
        result = []
        for prep in preparations:
            prep_dict = dict(prep)
            items = prep_dict.get('items', [])
            total_items = len(items)
            total_qty = sum(item.get('quantity', 0) for item in items)
            
            # Hitung scanned_count dari scan_results_materials
            cur.execute("""
                SELECT COUNT(DISTINCT sr.id_scan) as scanned_count
                FROM scan_results_materials sr
                LEFT JOIN materials_items_preparation mip ON sr.item_preparation_id = mip.id_item_preparation
                WHERE mip.preparation_id = %s OR sr.item_preparation_id IN (
                    SELECT id_item_preparation FROM materials_items_preparation WHERE preparation_id = %s
                )
            """, (prep_dict['id_preparation'], prep_dict['id_preparation']))
            
            scan_result = cur.fetchone()
            total_scanned = scan_result['scanned_count'] if scan_result else 0
            
            # Juga hitung dari items_preparation yang sudah di-scan
            cur.execute("""
                SELECT COUNT(*) as scanned_count
                FROM materials_items_preparation
                WHERE preparation_id = %s AND status = 'scanned'
            """, (prep_dict['id_preparation'],))
            item_result = cur.fetchone()
            total_scanned = max(total_scanned, item_result['scanned_count'] if item_result else 0)

            if total_qty > 0:
                progress = int((total_scanned / total_qty) * 100)
                if progress == 100:
                    status = 'completed'
                elif progress > 0:
                    status = 'in-progress'
                else:
                    status = prep_dict.get('status', 'pending')
            else:
                status = prep_dict.get('status', 'pending')
                progress = 0
            
            prep_dict['totalItems'] = total_items
            prep_dict['totalQty'] = total_qty
            prep_dict['scannedCount'] = total_scanned
            prep_dict['progress'] = progress
            prep_dict['status'] = status
            prep_dict['type'] = 'material'  # Tambahkan type
            
            result.append(prep_dict)
        
        return jsonify({
            'success': True,
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        print("Error in get_materials_scanning_preparations:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch materials scanning preparations'
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/materials/scanning-preparation/<int:prep_id>/progress', methods=['GET'])
def get_materials_preparation_progress(prep_id):
    """Mendapatkan progress scanning untuk preparation Materials"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Get all scanning items
        cur.execute("""
            SELECT si.id_item, si.material_name as item_name, si.quantity, si.uom
            FROM materials_scanning_items si
            WHERE si.preparation_id = %s
        """, (prep_id,))
        
        items = cur.fetchall()
        
        # Get all scan results for this preparation
        cur.execute("""
            SELECT 
                sr.id_scan,
                sr.item_preparation_id,
                sr.scanned_at,
                sr.scan_category,
                sr.scan_value,
                sr.scan_code,
                sr.status,
                ip.scanning_item_id,
                ip.item_number,
                si.id_item,
                si.material_name as item_name,
                si.quantity as item_quantity,
                si.uom
            FROM scan_results_materials sr
            LEFT JOIN materials_items_preparation ip ON sr.item_preparation_id = ip.id_item_preparation
            LEFT JOIN materials_scanning_items si ON ip.scanning_item_id = si.id_item
            WHERE si.preparation_id = %s OR ip.preparation_id = %s
            ORDER BY sr.scanned_at DESC
        """, (prep_id, prep_id))
        
        scan_results = cur.fetchall()
        
        # Build progress data
        progress = []
        total_scanned = 0
        total_target = 0
        
        for item in items:
            scanned_count = 0
            for scan in scan_results:
                if scan['scanning_item_id'] == item['id_item']:
                    scanned_count += 1
            total_scanned += scanned_count
            total_target += item['quantity']
            
            progress.append({
                'id_item': item['id_item'],
                'item_name': item['item_name'],
                'quantity': item['quantity'],
                'uom': item['uom'],
                'scanned': scanned_count,
                'percentage': int((scanned_count / item['quantity']) * 100) if item['quantity'] > 0 else 0
            })
        
        return jsonify({
            'success': True,
            'data': {
                'progress': progress,
                'scan_results': [dict(row) for row in scan_results],
                'total_scanned': total_scanned,
                'total_target': total_target,
                'overall_percentage': int((total_scanned / total_target) * 100) if total_target > 0 else 0,
                'type': 'material'
            }
        })
        
    except Exception as e:
        print(f"Error in get_materials_preparation_progress: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
# ==================== ENDPOINT UNTUK GET ALL (DEVICES + MATERIALS) ====================
@scanning_prep_bp.route('/api/scanning-preparation/list-all', methods=['GET'])
def get_all_scanning_preparations():
    """Mendapatkan semua persiapan scanning (Devices + Materials)"""
    conn = None
    try:
        # Get devices preparations
        devices_result = get_devices_scanning_preparations()
        devices_data = devices_result.get_json() if hasattr(devices_result, 'get_json') else {}
        
        # Get materials preparations
        materials_result = get_materials_scanning_preparations()
        materials_data = materials_result.get_json() if hasattr(materials_result, 'get_json') else {}
        
        all_data = []
        if devices_data.get('success'):
            all_data.extend(devices_data.get('data', []))
        if materials_data.get('success'):
            all_data.extend(materials_data.get('data', []))
        
        # Sort by created_at
        all_data.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'data': all_data,
            'total': len(all_data),
            'devices_count': len(devices_data.get('data', [])) if devices_data.get('success') else 0,
            'materials_count': len(materials_data.get('data', [])) if materials_data.get('success') else 0
        })
        
    except Exception as e:
        print("Error in get_all_scanning_preparations:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
# ==================== ENDPOINTS ITEMS PREPARATION DEVICES ====================
@scanning_prep_bp.route('/api/devices/items-preparation/<int:prep_id>/item/<int:item_id>/available', methods=['GET'])
def get_devices_available_item(prep_id, item_id):
    """Mendapatkan item preparation devices yang belum di-scan"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT ip.*, si.device_name, si.brand, si.model, si.specifications
            FROM devices_items_preparation ip
            LEFT JOIN devices_scanning_items si ON ip.scanning_item_id = si.id_item
            WHERE ip.preparation_id = %s 
            AND ip.scanning_item_id = %s
            AND ip.status = 'pending'
            ORDER BY ip.id_item_preparation ASC
            LIMIT 1
        """, (prep_id, item_id))
        
        item = cur.fetchone()
        
        if item:
            return jsonify({
                'success': True,
                'data': dict(item)
            })
        else:
            cur.execute("""
                SELECT COUNT(*) as total, 
                       COUNT(CASE WHEN status = 'scanned' THEN 1 END) as scanned
                FROM devices_items_preparation
                WHERE preparation_id = %s AND scanning_item_id = %s
            """, (prep_id, item_id))
            
            stats = cur.fetchone()
            
            if stats and stats['total'] == stats['scanned'] and stats['total'] > 0:
                return jsonify({
                    'success': False,
                    'error': 'All items for this type have been scanned',
                    'all_scanned': True
                }), 404
            else:
                return jsonify({
                    'success': False,
                    'error': 'No available item found'
                }), 404
            
    except Exception as e:
        print(f"Error in get_devices_available_item: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/devices/items-preparation/<int:item_prep_id>', methods=['PUT'])
def update_devices_item_preparation(item_prep_id):
    """Update item preparation devices dengan serial number"""
    conn = None
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE devices_items_preparation 
            SET serial_number = %s, 
                scan_code = %s, 
                status = %s, 
                scanned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_item_preparation = %s
            RETURNING id_item_preparation
        """, (
            data.get('serial_number'),
            data.get('scan_code'),
            data.get('status', 'scanned'),
            item_prep_id
        ))
        
        updated = cur.fetchone()
        
        if not updated:
            return jsonify({
                'success': False,
                'error': 'Item preparation not found'
            }), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Item preparation updated successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in update_devices_item_preparation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

# ==================== ENDPOINTS ITEMS PREPARATION MATERIALS ====================
@scanning_prep_bp.route('/api/materials/items-preparation/<int:prep_id>/item/<int:item_id>/available', methods=['GET'])
def get_materials_available_item(prep_id, item_id):
    """Mendapatkan item preparation materials yang belum di-scan"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT ip.*, si.material_name, si.uom, si.vendor, si.project_name
            FROM materials_items_preparation ip
            LEFT JOIN materials_scanning_items si ON ip.scanning_item_id = si.id_item
            WHERE ip.preparation_id = %s 
            AND ip.scanning_item_id = %s
            AND ip.status = 'pending'
            ORDER BY ip.id_item_preparation ASC
            LIMIT 1
        """, (prep_id, item_id))
        
        item = cur.fetchone()
        
        if item:
            return jsonify({
                'success': True,
                'data': dict(item)
            })
        else:
            cur.execute("""
                SELECT COUNT(*) as total, 
                       COUNT(CASE WHEN status = 'scanned' THEN 1 END) as scanned
                FROM materials_items_preparation
                WHERE preparation_id = %s AND scanning_item_id = %s
            """, (prep_id, item_id))
            
            stats = cur.fetchone()
            
            if stats and stats['total'] == stats['scanned'] and stats['total'] > 0:
                return jsonify({
                    'success': False,
                    'error': 'All items for this type have been scanned',
                    'all_scanned': True
                }), 404
            else:
                return jsonify({
                    'success': False,
                    'error': 'No available item found'
                }), 404
            
    except Exception as e:
        print(f"Error in get_materials_available_item: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/materials/items-preparation/<int:item_prep_id>', methods=['PUT'])
def update_materials_item_preparation(item_prep_id):
    """Update item preparation materials dengan scan_code"""
    conn = None
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE materials_items_preparation 
            SET scan_code = %s, 
                status = %s, 
                scanned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_item_preparation = %s
            RETURNING id_item_preparation
        """, (
            data.get('scan_code'),
            data.get('status', 'scanned'),
            item_prep_id
        ))
        
        updated = cur.fetchone()
        
        if not updated:
            return jsonify({
                'success': False,
                'error': 'Item preparation not found'
            }), 404
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Item preparation updated successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in update_materials_item_preparation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/materials/uom', methods=['GET'])
def get_uom_list():
    """Mendapatkan daftar Unit of Measure"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("SELECT uom_code, uom_name FROM materials_uom ORDER BY uom_code")
        uom_list = cur.fetchall()
        
        return jsonify({
            'success': True,
            'data': [dict(uom) for uom in uom_list]
        })
        
    except Exception as e:
        print(f"Error getting UOM list: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()