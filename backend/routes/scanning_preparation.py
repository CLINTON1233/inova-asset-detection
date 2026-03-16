from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime
import random
import string

scanning_prep_bp = Blueprint('scanning_prep', __name__)

def generate_checking_number():
    """Generate unique checking number format: SCAN-YYYYMMDD-XXXX"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SCAN-{date_str}-{random_chars}"

@scanning_prep_bp.route('/api/scanning-preparation/create', methods=['POST'])
def create_scanning_preparation():
    """Membuat persiapan scanning baru dengan multiple items"""
    conn = None
    try:
        data = request.json
        checking_name = data.get('checking_name')
        category_id = data.get('category_id')
        location_id = data.get('location_id')
        checking_date = data.get('checking_date')
        remarks = data.get('remarks')
        items = data.get('items', []) 
        user_id = data.get('user_id', 1) 
        
        if not all([checking_name, category_id, location_id, checking_date, items]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        checking_number = generate_checking_number()
        total_quantity = sum(item.get('quantity', 1) for item in items)
        
        cur.execute("""
            INSERT INTO scanning_preparations 
            (checking_number, checking_name, category_id, item_name, brand, model, 
             specifications, quantity, location_id, checking_date, remarks, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_preparation
        """, (
            checking_number, 
            checking_name,
            category_id,
            items[0]['item_name'] if items else '',  
            items[0].get('brand', '') if items else '',
            items[0].get('model', '') if items else '',
            items[0].get('specifications', '') if items else '',
            total_quantity,
            location_id,
            checking_date,
            remarks,
            user_id
        ))
        
        preparation_id = cur.fetchone()[0]
        
        for item in items:
            cur.execute("""
                INSERT INTO scanning_items
                (preparation_id, item_name, brand, model, specifications, quantity)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                preparation_id,
                item['item_name'],
                item.get('brand', ''),
                item.get('model', ''),
                item.get('specifications', ''),
                item.get('quantity', 1)
            ))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Scanning preparation created successfully',
            'checking_number': checking_number,
            'preparation_id': preparation_id
        })
        
    except Exception as e:
        if conn:
            conn.rollback()
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
                   u.username as created_by_name
            FROM scanning_preparations sp
            LEFT JOIN asset_categories ac ON sp.category_id = ac.id_category
            LEFT JOIN locations l ON sp.location_id = l.id_location
            LEFT JOIN users u ON sp.created_by = u.id_user
            ORDER BY sp.created_at DESC
        """)
        
        preparations = cur.fetchall()
        
        result = []
        for prep in preparations:
            prep_dict = dict(prep)
            
            cur.execute("""
                SELECT * FROM scanning_items 
                WHERE preparation_id = %s
                ORDER BY id_item
            """, (prep['id_preparation'],))
            
            items = cur.fetchall()
            prep_dict['items'] = [dict(item) for item in items]
            
            result.append(prep_dict)
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()

@scanning_prep_bp.route('/api/scanning-preparation/<int:prep_id>', methods=['GET'])
def get_scanning_preparation(prep_id):
    """Mendapatkan detail persiapan scanning"""
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
        
        # Get items
        cur.execute("""
            SELECT * FROM scanning_items 
            WHERE preparation_id = %s
            ORDER BY id_item
        """, (prep_id,))
        
        items = cur.fetchall()
        prep_dict['items'] = [dict(item) for item in items]
        
        return jsonify({
            'success': True,
            'data': prep_dict
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if conn:
            conn.close()