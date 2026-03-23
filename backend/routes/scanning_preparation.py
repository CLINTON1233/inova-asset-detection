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

@scanning_prep_bp.route('/api/scanning-preparation/<int:prep_id>/progress', methods=['GET'])
def get_preparation_progress(prep_id):
    """Mendapatkan progress scanning untuk preparation tertentu"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT si.id_item, si.item_name, si.brand, si.model, si.quantity
            FROM scanning_items si
            WHERE si.preparation_id = %s
        """, (prep_id,))
        
        items = cur.fetchall()
        
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
                si.item_name,
                si.brand,
                si.model,
                si.quantity as item_quantity
            FROM scan_results sr
            LEFT JOIN items_preparation ip ON sr.item_preparation_id = ip.id_item_preparation
            LEFT JOIN scanning_items si ON ip.scanning_item_id = si.id_item
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
                'overall_percentage': int((total_scanned / total_target) * 100) if total_target > 0 else 0
            }
        })
        
    except Exception as e:
        print(f"Error in get_preparation_progress: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
@scanning_prep_bp.route('/api/items-preparation/<int:prep_id>/item/<int:item_id>/available', methods=['GET'])
def get_available_item(prep_id, item_id):
    """Mendapatkan item preparation yang belum di-scan"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT ip.*, si.item_name, si.brand, si.model, si.specifications
            FROM items_preparation ip
            LEFT JOIN scanning_items si ON ip.scanning_item_id = si.id_item
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
                FROM items_preparation
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
        print(f"Error in get_available_item: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/items-preparation/<int:item_prep_id>', methods=['PUT'])
def update_item_preparation(item_prep_id):
    """Update item preparation - HANYA UPDATE STATUS, BUKAN SERIAL NUMBER"""
    conn = None
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE items_preparation 
            SET status = %s, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id_item_preparation = %s
            RETURNING id_item_preparation
        """, (
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
        print(f"Error in update_item_preparation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/scanning-preparation/list', methods=['GET'])
def get_scanning_preparations():
    """Mendapatkan daftar persiapan scanning"""
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
                                'item_name', si.item_name,
                                'brand', si.brand,
                                'model', si.model,
                                'specifications', si.specifications,
                                'quantity', si.quantity,
                                'scanned_count', COALESCE((
                                    SELECT COUNT(*) 
                                    FROM items_preparation ip 
                                    WHERE ip.scanning_item_id = si.id_item 
                                    AND ip.status = 'scanned'
                                ), 0),
                                'status', si.status
                            )
                        )
                        FROM scanning_items si
                        WHERE si.preparation_id = sp.id_preparation
                    ),
                    '[]'::json
                ) as items
            FROM scanning_preparations sp
            LEFT JOIN asset_categories ac ON sp.category_id = ac.id_category
            LEFT JOIN locations l ON sp.location_id = l.id_location
            LEFT JOIN users u ON sp.user_id = u.id_user
            ORDER BY sp.created_at DESC
        """)
        
        preparations = cur.fetchall()
        print(f"Found {len(preparations)} preparations")
        
        result = []
        for prep in preparations:
            prep_dict = dict(prep)
            items = prep_dict.get('items', [])
            total_items = len(items)
            total_qty = sum(item.get('quantity', 0) for item in items)
            total_scanned = sum(item.get('scanned_count', 0) for item in items)

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
            prep_dict['progress'] = progress
            prep_dict['status'] = status
            
            result.append(prep_dict)
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        print("Error in get_scanning_preparations:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch scanning preparations'
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/scanning-preparation/<int:prep_id>/items', methods=['GET'])
def get_preparation_items(prep_id):
    """Mendapatkan semua items individual dari preparation"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT ip.*, 
                   d.department_name,
                   u.username as scanned_by_name,
                   si.item_name as master_item_name,
                   si.brand,
                   si.model,
                   si.specifications
            FROM items_preparation ip
            LEFT JOIN departments d ON ip.department_id = d.id_department
            LEFT JOIN users u ON ip.scanned_by = u.id_user
            LEFT JOIN scanning_items si ON ip.scanning_item_id = si.id_item
            WHERE ip.preparation_id = %s
            ORDER BY ip.id_item_preparation
        """, (prep_id,))
        
        items = cur.fetchall()
        
        return jsonify({
            'success': True,
            'data': [dict(item) for item in items],
            'total': len(items)
        })
        
    except Exception as e:
        print(f"Error in get_preparation_items for id {prep_id}:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()
            
@scanning_prep_bp.route('/api/scanning-preparation/<int:prep_id>', methods=['DELETE'])
def delete_scanning_preparation(prep_id):
    """Menghapus persiapan scanning beserta semua item dan department distributions"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id_preparation FROM scanning_preparations WHERE id_preparation = %s", (prep_id,))
        if not cur.fetchone():
            return jsonify({
                'success': False,
                'error': 'Preparation not found'
            }), 404

        # Hapus items_preparation
        cur.execute("DELETE FROM items_preparation WHERE preparation_id = %s", (prep_id,))
        
        # Hapus item_departments (via scanning_items)
        cur.execute("""
            DELETE FROM item_departments 
            WHERE scanning_item_id IN (
                SELECT id_item FROM scanning_items WHERE preparation_id = %s
            )
        """, (prep_id,))

        # Hapus scanning_items
        cur.execute("DELETE FROM scanning_items WHERE preparation_id = %s", (prep_id,))
        
        # Hapus scanning_preparations
        cur.execute("DELETE FROM scanning_preparations WHERE id_preparation = %s", (prep_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Scanning preparation deleted successfully'
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in delete_scanning_preparation for id {prep_id}:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/scanning-preparation/<int:prep_id>', methods=['GET'])
def get_scanning_preparation(prep_id):
    """Mendapatkan detail persiapan scanning untuk edit"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT sp.*, 
                   ac.category_name,
                   l.location_name,
                   u.username as created_by_name
            FROM scanning_preparations sp
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
        
        # Perbaiki query: ganti item_id dengan scanning_item_id
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
            FROM scanning_items si
            LEFT JOIN item_departments id ON si.id_item = id.scanning_item_id
            LEFT JOIN departments d ON id.department_id = d.id_department
            WHERE si.preparation_id = %s
            GROUP BY si.id_item
            ORDER BY si.id_item
        """, (prep_id,))
        
        items = cur.fetchall()
        prep_dict['items'] = [dict(item) for item in items]
        
        return jsonify({
            'success': True,
            'data': prep_dict
        })
        
    except Exception as e:
        print(f"Error in get_scanning_preparation for id {prep_id}:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/scanning-preparation/<int:prep_id>', methods=['PUT'])
def update_scanning_preparation(prep_id):
    """Update persiapan scanning yang sudah ada dengan user_id"""
    conn = None
    try:
        data = request.json
        print("="*50)
        print("UPDATE DATA:", data)
        print("="*50)
        
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
        cur = conn.cursor()
        
        # Update preparation
        cur.execute("""
            UPDATE scanning_preparations 
            SET checking_name = %s,
                category_id = %s,
                location_id = %s,
                checking_date = %s,
                remarks = %s,
                user_id = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_preparation = %s
        """, (checking_name, category_id, location_id, checking_date, remarks, user_id, prep_id))
        
        # Delete existing data
        cur.execute("DELETE FROM items_preparation WHERE preparation_id = %s", (prep_id,))
        cur.execute("""
            DELETE FROM item_departments 
            WHERE scanning_item_id IN (SELECT id_item FROM scanning_items WHERE preparation_id = %s)
        """, (prep_id,))
        cur.execute("DELETE FROM scanning_items WHERE preparation_id = %s", (prep_id,))
        
        total_items_created = 0
        
        for idx, item in enumerate(items):
            quantity = item.get('quantity', 1)
            
            # Insert scanning_items
            cur.execute("""
                INSERT INTO scanning_items
                (preparation_id, item_name, brand, model, specifications, quantity, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id_item
            """, (prep_id, item.get('item_name', ''), item.get('brand', ''),
                  item.get('model', ''), item.get('specifications', ''), quantity, user_id))
            
            scanning_item_id = cur.fetchone()[0]
            
            departments = item.get('departments', [])
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    cur.execute("""
                        INSERT INTO item_departments (scanning_item_id, department_id, quantity)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (scanning_item_id, department_id) 
                        DO UPDATE SET quantity = EXCLUDED.quantity
                    """, (scanning_item_id, dept['department_id'], dept['quantity']))

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
                
                # Insert items_preparation
                cur.execute("""
                    INSERT INTO items_preparation
                    (scanning_item_id, preparation_id, item_number, status, department_id, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (scanning_item_id, prep_id, item_number, 'pending', assigned_dept, user_id))
                
                total_items_created += 1
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Scanning preparation updated successfully',
            'preparation_id': prep_id,
            'total_items_created': total_items_created
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
        print("ERROR in update_scanning_preparation:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/scanning-preparation/create', methods=['POST'])
def create_scanning_preparation():
    """Membuat persiapan scanning baru"""
    conn = None
    try:
        data = request.json
        print("="*50)
        print("RECEIVED DATA:", data)
        
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
        
        # Insert scanning preparation
        cur.execute("""
            INSERT INTO scanning_preparations 
            (checking_number, checking_name, category_id, location_id, checking_date, remarks, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id_preparation
        """, (checking_number, checking_name, category_id, location_id, checking_date, remarks, user_id))
        
        preparation_id = cur.fetchone()[0]
        print(f"Created preparation with ID: {preparation_id}")

        total_items_created = 0
        
        for idx, item in enumerate(items):
            quantity = item.get('quantity', 1)
            
            # Insert scanning_items (master)
            cur.execute("""
                INSERT INTO scanning_items
                (preparation_id, item_name, brand, model, specifications, quantity, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id_item
            """, (
                preparation_id,
                item.get('item_name', ''),
                item.get('brand', ''),
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
                            INSERT INTO item_departments (scanning_item_id, department_id, quantity)
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
                    INSERT INTO items_preparation
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
        print(f"Created {total_items_created} individual items")
        
        return jsonify({
            'success': True,
            'message': 'Scanning preparation created successfully',
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