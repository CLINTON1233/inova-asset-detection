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
    """Generate item number format: PREP-{preparation_id}-{item_index}-{sub_item_index}"""
    return f"ITEM-{preparation_id}-{item_index + 1}-{sub_item_index + 1}"

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
                sp.created_by,
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
            LEFT JOIN users u ON sp.created_by = u.id_user
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
                   si.item_name as master_item_name
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

        cur.execute("DELETE FROM items_preparation WHERE preparation_id = %s", (prep_id,))
        cur.execute("""
            DELETE FROM item_departments 
            WHERE item_id IN (
                SELECT id_item FROM scanning_items WHERE preparation_id = %s
            )
        """, (prep_id,))

        cur.execute("DELETE FROM scanning_items WHERE preparation_id = %s", (prep_id,))
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
            LEFT JOIN users u ON sp.created_by = u.id_user
            WHERE sp.id_preparation = %s
        """, (prep_id,))
        
        preparation = cur.fetchone()
        
        if not preparation:
            return jsonify({
                'success': False,
                'error': 'Preparation not found'
            }), 404
        
        prep_dict = dict(preparation)
        
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
            LEFT JOIN item_departments id ON si.id_item = id.item_id
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
    """Update persiapan scanning yang sudah ada"""
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
        
        cur.execute("""
            UPDATE scanning_preparations 
            SET checking_name = %s,
                category_id = %s,
                location_id = %s,
                checking_date = %s,
                remarks = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_preparation = %s
        """, (checking_name, category_id, location_id, checking_date, remarks, prep_id))
        
        cur.execute("DELETE FROM items_preparation WHERE preparation_id = %s", (prep_id,))
        cur.execute("""
            DELETE FROM item_departments 
            WHERE item_id IN (SELECT id_item FROM scanning_items WHERE preparation_id = %s)
        """, (prep_id,))
        cur.execute("DELETE FROM scanning_items WHERE preparation_id = %s", (prep_id,))
        
        total_items_created = 0
        
        for idx, item in enumerate(items):
            quantity = item.get('quantity', 1)
            
            cur.execute("""
                INSERT INTO scanning_items
                (preparation_id, item_name, brand, model, specifications, quantity)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id_item
            """, (prep_id, item.get('item_name', ''), item.get('brand', ''),
                  item.get('model', ''), item.get('specifications', ''), quantity))
            
            scanning_item_id = cur.fetchone()[0]
            
            departments = item.get('departments', [])
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    cur.execute("""
                        INSERT INTO item_departments (item_id, department_id, quantity)
                        VALUES (%s, %s, %s)
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
                
                cur.execute("""
                    INSERT INTO items_preparation
                    (scanning_item_id, preparation_id, item_number, item_name, brand, model, 
                     specifications, status, department_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (scanning_item_id, prep_id, item_number, item.get('item_name', ''),
                      item.get('brand', ''), item.get('model', ''), item.get('specifications', ''),
                      'pending', assigned_dept))
                
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
    """Membuat persiapan scanning baru dengan multiple items dan department distribution"""
    conn = None
    try:
        data = request.json
        print("="*50)
        print("RECEIVED DATA:", data)
        print("="*50)
        
        checking_name = data.get('checking_name')
        category_id = data.get('category_id')
        location_id = data.get('location_id')
        checking_date = data.get('checking_date')
        remarks = data.get('remarks')
        items = data.get('items', []) 
        user_id = data.get('user_id', 1) 
        
        print(f"checking_name: {checking_name}")
        print(f"category_id: {category_id} (type: {type(category_id)})")
        print(f"location_id: {location_id} (type: {type(location_id)})")
        print(f"checking_date: {checking_date}")
        print(f"user_id: {user_id}")
        print(f"items count: {len(items)}")
        
        # Validasi
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
        
        cur.execute("SELECT id_user FROM users WHERE id_user = %s", (user_id,))
        user_exists = cur.fetchone()
        if not user_exists:
            print(f"User with id {user_id} not found!")
            cur.execute("""
                INSERT INTO users (id_user, username, email, password, role)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id_user) DO NOTHING
            """, (user_id, 'admin', 'admin@example.com', 'password123', 'admin'))
            conn.commit()
            print(f"Created default user with id {user_id}")
        
        checking_number = generate_checking_number()
        print(f"Generated checking number: {checking_number}")
        
        cur.execute("""
            INSERT INTO scanning_preparations 
            (checking_number, checking_name, category_id, location_id, checking_date, remarks, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id_preparation
        """, (
            checking_number, 
            checking_name,
            category_id,
            location_id,
            checking_date,
            remarks,
            user_id
        ))
        
        preparation_id = cur.fetchone()[0]
        print(f"Created preparation with ID: {preparation_id}")

        total_items_created = 0
        
        for idx, item in enumerate(items):
            print(f"Processing item {idx+1}: {item}")
            quantity = item.get('quantity', 1)
            cur.execute("""
                INSERT INTO scanning_items
                (preparation_id, item_name, brand, model, specifications, quantity)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id_item
            """, (
                preparation_id,
                item.get('item_name', ''),
                item.get('brand', ''),
                item.get('model', ''),
                item.get('specifications', ''),
                quantity
            ))
            
            scanning_item_id = cur.fetchone()[0]
            print(f"Created scanning item with ID: {scanning_item_id}")
            departments = item.get('departments', [])
            print(f"Department distributions: {departments}")
            
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    cur.execute("SELECT id_department FROM departments WHERE id_department = %s", (dept['department_id'],))
                    dept_exists = cur.fetchone()
                    if dept_exists:
                        cur.execute("""
                            INSERT INTO item_departments
                            (item_id, department_id, quantity)
                            VALUES (%s, %s, %s)
                        """, (
                            scanning_item_id,
                            dept['department_id'],
                            dept['quantity']
                        ))
                        print(f"Added department {dept['department_id']} with quantity {dept['quantity']}")
                    else:
                        print(f"Warning: Department {dept['department_id']} not found, skipping")

            dept_allocation = {}
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    dept_allocation[dept['department_id']] = dept['quantity']
            
            items_without_dept = quantity - sum(dept_allocation.values())
            
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
                    (scanning_item_id, preparation_id, item_number, item_name, brand, model, 
                     specifications, status, department_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    scanning_item_id,
                    preparation_id,
                    item_number,
                    item.get('item_name', ''),
                    item.get('brand', ''),
                    item.get('model', ''),
                    item.get('specifications', ''),
                    'pending',
                    assigned_dept
                ))
                
                total_items_created += 1
                print(f"Created individual item {sub_idx + 1}/{quantity} with number: {item_number}")
        
        conn.commit()
        print(f"Transaction committed successfully. Created {total_items_created} individual items")
        print("="*50)
        
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
        print("="*50)
        print("ERROR in create_scanning_preparation:")
        print(traceback.format_exc())
        print("="*50)
        return jsonify({
            'success': False,
            'error': str(e),
            'trace': traceback.format_exc()
        }), 500
    finally:
        if conn:
            conn.close()