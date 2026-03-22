from flask import Blueprint, request, jsonify
from utils.validation_model import ValidationModel
import traceback

validation_bp = Blueprint('validation', __name__)

@validation_bp.route('/api/validations/create', methods=['POST'])
def create_validation():
    """Membuat record validasi dari scan result"""
    try:
        data = request.json
        scan_id = data.get('scan_id')
        user_id = data.get('user_id', 1)
        
        if not scan_id:
            return jsonify({
                'success': False,
                'error': 'scan_id is required'
            }), 400
        
        result = ValidationModel.create_validation(scan_id, user_id, data)
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in create_validation:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@validation_bp.route('/api/validations/<int:validation_id>', methods=['PUT'])
def update_validation(validation_id):
    """Update validation status"""
    try:
        data = request.json
        result = ValidationModel.update_validation(validation_id, data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in update_validation:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@validation_bp.route('/api/validations', methods=['GET'])
def get_validations():
    """Mendapatkan daftar validations"""
    try:
        status = request.args.get('status', 'all')
        result = ValidationModel.get_validations_by_status(status)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in get_validations:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@validation_bp.route('/api/validations/<int:validation_id>/detail', methods=['GET'])
def get_validation_detail(validation_id):
    """Mendapatkan detail validation"""
    try:
        result = ValidationModel.get_validation_detail(validation_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 404
            
    except Exception as e:
        print("Error in get_validation_detail:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@validation_bp.route('/api/validations/bulk', methods=['POST'])
def bulk_validate():
    """Bulk validation untuk multiple items"""
    try:
        data = request.json
        validation_ids = data.get('validation_ids', [])
        validation_data = data.get('data', {})
        
        if not validation_ids:
            return jsonify({
                'success': False,
                'error': 'validation_ids is required'
            }), 400
        
        result = ValidationModel.bulk_validate(validation_ids, validation_data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print("Error in bulk_validate:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500