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
        
        # Cek apakah user_id ada
        cur.execute("SELECT id_user FROM users WHERE id_user = %s", (user_id,))
        user_exists = cur.fetchone()
        if not user_exists:
            print(f"User with id {user_id} not found!")
            # Insert default user jika tidak ada
            cur.execute("""
                INSERT INTO users (id_user, username, email, password, role)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id_user) DO NOTHING
            """, (user_id, 'admin', 'admin@example.com', 'password123', 'admin'))
            conn.commit()
            print(f"Created default user with id {user_id}")
        
        checking_number = generate_checking_number()
        print(f"Generated checking number: {checking_number}")
        
        # Insert scanning preparation (HEADER)
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
        
        # Insert items
        for idx, item in enumerate(items):
            print(f"Processing item {idx+1}: {item}")
            
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
                item.get('quantity', 1)
            ))
            
            item_id = cur.fetchone()[0]
            print(f"Created item with ID: {item_id}")
            
            # Insert department distributions
            departments = item.get('departments', [])
            print(f"Department distributions: {departments}")
            
            for dept in departments:
                if dept.get('department_id') and dept.get('quantity', 0) > 0:
                    # Cek apakah department_id ada
                    cur.execute("SELECT id_department FROM departments WHERE id_department = %s", (dept['department_id'],))
                    dept_exists = cur.fetchone()
                    if dept_exists:
                        cur.execute("""
                            INSERT INTO item_departments
                            (item_id, department_id, quantity)
                            VALUES (%s, %s, %s)
                        """, (
                            item_id,
                            dept['department_id'],
                            dept['quantity']
                        ))
                        print(f"Added department {dept['department_id']} with quantity {dept['quantity']}")
                    else:
                        print(f"Warning: Department {dept['department_id']} not found, skipping")
        
        conn.commit()
        print("Transaction committed successfully")
        print("="*50)
        
        return jsonify({
            'success': True,
            'message': 'Scanning preparation created successfully',
            'checking_number': checking_number,
            'preparation_id': preparation_id
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

@scanning_prep_bp.route('/api/departments', methods=['GET'])
def get_departments():
    """Mendapatkan daftar semua department"""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT id_department, department_name, description
            FROM departments
            ORDER BY department_name
        """)
        
        departments = cur.fetchall()
        print(f"Found {len(departments)} departments")  # LOG
        
        return jsonify({
            'success': True,
            'departments': [dict(dept) for dept in departments]
        })
        
    except Exception as e:
        print("Error in get_departments:", str(e))
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
            SELECT sp.*, 
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
                                   'scanned_count', si.scanned_count,
                                   'status', si.status,
                                   'departments', COALESCE(
                                       (
                                           SELECT json_agg(
                                               json_build_object(
                                                   'department_id', d.id_department,
                                                   'department_name', d.department_name,
                                                   'quantity', id.quantity
                                               )
                                           )
                                           FROM item_departments id
                                           JOIN departments d ON id.department_id = d.id_department
                                           WHERE id.item_id = si.id_item
                                       ),
                                       '[]'::json
                                   )
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
        print(f"Found {len(preparations)} preparations")  # LOG
        
        return jsonify({
            'success': True,
            'data': [dict(prep) for prep in preparations]
        })
        
    except Exception as e:
        print("Error in get_scanning_preparations:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/scanning-preparation/<int:prep_id>', methods=['GET'])
def get_scanning_preparation(prep_id):
    """Mendapatkan detail persiapan scanning dengan department distributions"""
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
        
        # Get items with their department distributions
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
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()