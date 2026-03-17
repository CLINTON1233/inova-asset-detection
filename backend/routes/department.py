from flask import Blueprint, request, jsonify
from utils.department_model import DepartmentModel

department_bp = Blueprint('department', __name__, url_prefix='/api/department')

@department_bp.route('/all', methods=['GET'])
def get_all_departments():
    """Endpoint untuk mendapatkan semua department"""
    result = DepartmentModel.get_all_departments()
    return jsonify(result)

@department_bp.route('/search', methods=['GET'])
def search_departments():
    """Endpoint untuk mencari department"""
    search_term = request.args.get('q', '').strip()
    if not search_term:
        return jsonify({"success": False, "message": "Search term is required"}), 400
    
    result = DepartmentModel.search_departments(search_term)
    return jsonify(result)

@department_bp.route('/<int:department_id>', methods=['GET'])
def get_department_by_id(department_id):
    """Endpoint untuk mendapatkan detail department berdasarkan ID"""
    result = DepartmentModel.get_department_by_id(department_id)
    return jsonify(result)

@department_bp.route('/code/<department_code>', methods=['GET'])
def get_department_by_code(department_code):
    """Endpoint untuk mendapatkan detail department berdasarkan kode (DEPT-XXX)"""
    try:
        department_id = int(department_code.split('-')[1])
        result = DepartmentModel.get_department_by_id(department_id)
        return jsonify(result)
    except (IndexError, ValueError):
        return jsonify({
            "success": False,
            "error": "Invalid department code format"
        }), 400