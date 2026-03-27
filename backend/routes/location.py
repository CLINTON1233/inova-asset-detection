from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import psycopg2.extras
from datetime import datetime

location_bp = Blueprint('location', __name__, url_prefix='/api/location')

def get_conn():
    return get_db_connection()

def format_location(loc):
    """Format lokasi ke response yang konsisten"""
    return {
        'id_location': loc['id_location'],
        'location_name': loc['location_name'],
        'location_code': f"LOC-{loc['id_location']:03d}",
        'area': 'General',
        'category': 'Office',
        'description': loc.get('description') or ''
    }

# ==================== GET ====================
@location_bp.route('/all', methods=['GET'])
def get_all_locations():
    """Mendapatkan semua lokasi aktif"""
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT id_location, location_name, description
            FROM locations 
            ORDER BY location_name
        """)
        
        locations = [format_location(loc) for loc in cur.fetchall()]
        
        return jsonify({
            "success": True,
            "locations": locations,
            "total": len(locations)
        })
        
    except Exception as e:
        print(f"Error getting locations: {e}")
        return jsonify({"success": False, "error": str(e), "locations": [], "total": 0}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()

@location_bp.route('/search', methods=['GET'])
def search_locations():
    """Mencari lokasi berdasarkan nama"""
    search_term = request.args.get('q', '').strip()
    if not search_term:
        return jsonify({"success": False, "message": "Search term is required"}), 400
    
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT id_location, location_name, description
            FROM locations 
            WHERE location_name ILIKE %s
            ORDER BY location_name
            LIMIT 20
        """, (f"%{search_term}%",))
        
        locations = [format_location(loc) for loc in cur.fetchall()]
        
        return jsonify({
            "success": True,
            "locations": locations,
            "total": len(locations)
        })
        
    except Exception as e:
        print(f"Error searching locations: {e}")
        return jsonify({"success": False, "error": str(e), "locations": []}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()

@location_bp.route('/<location_code>', methods=['GET'])
def get_location_by_code(location_code):
    """Mendapatkan detail lokasi berdasarkan kode"""
    try:
        # Parse location_code (format: LOC-XXX)
        try:
            location_id = int(location_code.split('-')[1])
        except (IndexError, ValueError):
            return jsonify({"success": False, "message": "Invalid location code format"}), 400
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT id_location, location_name, description
            FROM locations 
            WHERE id_location = %s
        """, (location_id,))
        
        loc = cur.fetchone()
        
        if not loc:
            return jsonify({"success": False, "message": "Location not found"}), 404
        
        return jsonify({
            "success": True,
            "location": format_location(loc)
        })
        
    except Exception as e:
        print(f"Error getting location: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()

@location_bp.route('/asset/<asset_id>', methods=['GET'])
def get_asset_location(asset_id):
    """Mendapatkan lokasi asset"""
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Cek di scan_results_devices dan scan_results_materials untuk lokasi asset
        cur.execute("""
            SELECT 
                asset_id,
                location_code,
                location_name,
                assigned_at,
                assigned_by,
                notes
            FROM (
                SELECT 
                    asset_id,
                    detection_data->>'location_code' as location_code,
                    detection_data->>'location_name' as location_name,
                    created_at as assigned_at,
                    user_id as assigned_by,
                    notes
                FROM scan_results_devices
                WHERE asset_id = %s
                UNION ALL
                SELECT 
                    asset_id,
                    detection_data->>'location_code' as location_code,
                    detection_data->>'location_name' as location_name,
                    created_at as assigned_at,
                    user_id as assigned_by,
                    notes
                FROM scan_results_materials
                WHERE asset_id = %s
            ) asset_location
            ORDER BY assigned_at DESC
            LIMIT 1
        """, (asset_id, asset_id))
        
        location = cur.fetchone()
        
        if not location:
            return jsonify({
                "success": True,
                "message": "Asset not found or no location assigned",
                "location": None
            })
        
        return jsonify({
            "success": True,
            "location": location
        })
        
    except Exception as e:
        print(f"Error getting asset location: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()

# ==================== POST ====================
@location_bp.route('/assign-multiple', methods=['POST'])
def assign_multiple_locations():
    """Menetapkan lokasi ke multiple assets"""
    data = request.get_json()
    
    # Validasi
    if not data or 'asset_ids' not in data or 'location_code' not in data:
        return jsonify({"success": False, "message": "asset_ids and location_code are required"}), 400
    
    if not isinstance(data['asset_ids'], list):
        return jsonify({"success": False, "message": "asset_ids must be a list"}), 400
    
    if not data['asset_ids']:
        return jsonify({"success": False, "message": "asset_ids cannot be empty"}), 400
    
    try:
        # Parse location_code (format: LOC-XXX)
        try:
            location_id = int(data['location_code'].split('-')[1])
        except (IndexError, ValueError):
            return jsonify({"success": False, "message": "Invalid location code format"}), 400
        
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Cek apakah location exists
        cur.execute("SELECT id_location, location_name FROM locations WHERE id_location = %s", (location_id,))
        location = cur.fetchone()
        
        if not location:
            return jsonify({"success": False, "message": "Location not found"}), 404
        
        scanned_by = data.get('scanned_by', 'Scanner User')
        notes = data.get('notes')
        current_time = datetime.now()
        
        success_count = 0
        failed_assets = []
        
        for asset_id in data['asset_ids']:
            try:
                # Update detection_data di scan_results_devices atau scan_results_materials
                cur.execute("""
                    UPDATE scan_results_devices 
                    SET detection_data = detection_data || %s::jsonb,
                        updated_at = %s
                    WHERE asset_id = %s
                    RETURNING id_scan
                """, (f'{{"location_code": "{data["location_code"]}", "location_name": "{location["location_name"]}", "assigned_by": "{scanned_by}", "assigned_at": "{current_time.isoformat()}"}}', current_time, asset_id))
                
                if cur.rowcount == 0:
                    cur.execute("""
                        UPDATE scan_results_materials 
                        SET detection_data = detection_data || %s::jsonb,
                            updated_at = %s
                        WHERE asset_id = %s
                        RETURNING id_scan
                    """, (f'{{"location_code": "{data["location_code"]}", "location_name": "{location["location_name"]}", "assigned_by": "{scanned_by}", "assigned_at": "{current_time.isoformat()}"}}', current_time, asset_id))
                
                if cur.rowcount > 0:
                    success_count += 1
                else:
                    failed_assets.append({
                        "asset_id": asset_id,
                        "error": "Asset not found"
                    })
                    
            except Exception as e:
                failed_assets.append({
                    "asset_id": asset_id,
                    "error": str(e)
                })
        
        conn.commit()
        
        return jsonify({
            "success": True,
            "message": f"Successfully assigned {success_count} assets",
            "success_count": success_count,
            "failed_count": len(failed_assets),
            "failed_assets": failed_assets,
            "location_code": data['location_code'],
            "location_name": location['location_name']
        })
        
    except Exception as e:
        print(f"Error assigning multiple assets: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()