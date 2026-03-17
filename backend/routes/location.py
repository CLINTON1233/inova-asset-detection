from flask import Blueprint, request, jsonify
from utils.location_model import LocationModel

location_bp = Blueprint('location', __name__, url_prefix='/api/location')

@location_bp.route('/all', methods=['GET'])
def get_all_locations():
    """Endpoint untuk mendapatkan semua lokasi aktif"""
    result = LocationModel.get_all_active_locations()
    return jsonify(result)

@location_bp.route('/search', methods=['GET'])
def search_locations():
    """Endpoint untuk mencari lokasi"""
    search_term = request.args.get('q', '').strip()
    if not search_term:
        return jsonify({"success": False, "message": "Search term is required"}), 400
    
    result = LocationModel.search_locations(search_term)
    return jsonify(result)

@location_bp.route('/assign-multiple', methods=['POST'])
def assign_multiple_locations():
    """Endpoint untuk menetapkan lokasi ke multiple assets"""
    data = request.get_json()
    
    # Validasi
    if not data or 'asset_ids' not in data or 'location_code' not in data:
        return jsonify({"success": False, "message": "asset_ids and location_code are required"}), 400
    
    if not isinstance(data['asset_ids'], list):
        return jsonify({"success": False, "message": "asset_ids must be a list"}), 400
    
    result = LocationModel.assign_multiple_assets(
        asset_ids=data['asset_ids'],
        location_code=data['location_code'],
        scanned_by=data.get('scanned_by', 'Scanner User'),
        notes=data.get('notes')
    )
    
    return jsonify(result)

@location_bp.route('/asset/<asset_id>', methods=['GET'])
def get_asset_location(asset_id):
    """Endpoint untuk mendapatkan lokasi asset"""
    result = LocationModel.get_asset_location(asset_id)
    return jsonify(result)

@location_bp.route('/<location_code>', methods=['GET'])
def get_location_by_code(location_code):
    """Endpoint untuk mendapatkan detail lokasi berdasarkan kode"""
    result = LocationModel.get_location_by_code(location_code)
    return jsonify(result)