from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras

department_bp = Blueprint('department', __name__, url_prefix='/api/department')

def get_conn():
    return get_db_connection()

def format_department(dept, include_timestamps=False):
    """Format department ke response yang konsisten"""
    formatted = {
        'id_department': dept['id_department'],
        'department_name': dept['department_name'],
        'department_code': f"DEPT-{dept['id_department']:03d}",
        'description': dept.get('description') or ''
    }
    
    if include_timestamps:
        formatted['created_at'] = dept.get('created_at')
        formatted['updated_at'] = dept.get('updated_at')
    
    return formatted

# ==================== GET ====================
@department_bp.route('/all', methods=['GET'])
def get_all_departments():
    """Mendapatkan semua department"""
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT id_department, department_name, description
            FROM departments 
            ORDER BY department_name
        """)
        
        departments = [format_department(dept) for dept in cur.fetchall()]
        
        return jsonify({
            "success": True,
            "departments": departments,
            "total": len(departments)
        })
        
    except Exception as e:
        print(f"Error getting departments: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "departments": [],
            "total": 0
        }), 500
    finally:
        if 'conn' in locals() and conn: conn.close()

@department_bp.route('/search', methods=['GET'])
def search_departments():
    """Mencari department berdasarkan nama"""
    search_term = request.args.get('q', '').strip()
    if not search_term:
        return jsonify({"success": False, "message": "Search term is required"}), 400
    
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT id_department, department_name, description
            FROM departments 
            WHERE department_name ILIKE %s
            ORDER BY department_name
            LIMIT 20
        """, (f"%{search_term}%",))
        
        departments = [format_department(dept) for dept in cur.fetchall()]
        
        return jsonify({
            "success": True,
            "departments": departments,
            "total": len(departments)
        })
        
    except Exception as e:
        print(f"Error searching departments: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "departments": []
        }), 500
    finally:
        if 'conn' in locals() and conn: conn.close()

@department_bp.route('/<int:department_id>', methods=['GET'])
def get_department_by_id(department_id):
    """Mendapatkan detail department berdasarkan ID"""
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT id_department, department_name, description, created_at, updated_at
            FROM departments 
            WHERE id_department = %s
        """, (department_id,))
        
        department = cur.fetchone()
        
        if not department:
            return jsonify({"success": False, "error": "Department not found"}), 404
        
        return jsonify({
            "success": True,
            "department": format_department(department, include_timestamps=True)
        })
        
    except Exception as e:
        print(f"Error getting department by id: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()

@department_bp.route('/code/<department_code>', methods=['GET'])
def get_department_by_code(department_code):
    """Mendapatkan detail department berdasarkan kode (DEPT-XXX)"""
    try:
        # Parse department_code (format: DEPT-XXX)
        try:
            department_id = int(department_code.split('-')[1])
        except (IndexError, ValueError):
            return jsonify({
                "success": False,
                "error": "Invalid department code format. Use format: DEPT-XXX"
            }), 400
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT id_department, department_name, description, created_at, updated_at
            FROM departments 
            WHERE id_department = %s
        """, (department_id,))
        
        department = cur.fetchone()
        
        if not department:
            return jsonify({"success": False, "error": "Department not found"}), 404
        
        return jsonify({
            "success": True,
            "department": format_department(department, include_timestamps=True)
        })
        
    except Exception as e:
        print(f"Error getting department by code: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()