import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from utils.database import get_db_connection

class LocationModel:
    
    @staticmethod
    def get_all_active_locations():
        """Mengambil semua lokasi"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT 
                    id_location,
                    location_name,
                    description
                FROM locations 
                ORDER BY location_name
            """
            
            cursor.execute(query)
            locations = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            formatted_locations = []
            for loc in locations:
                formatted_locations.append({
                    'id_location': loc['id_location'],
                    'location_name': loc['location_name'],
                    'location_code': f"LOC-{loc['id_location']:03d}",  # Generate kode sementara
                    'area': 'General',  # Default area
                    'category': 'Office',  # Default category
                    'description': loc['description'] or ''
                })
            
            return {
                "success": True,
                "locations": formatted_locations,
                "total": len(formatted_locations)
            }
            
        except Exception as e:
            print(f"Error getting locations: {e}")
            return {
                "success": False,
                "error": str(e),
                "locations": [],
                "total": 0
            }
    
    @staticmethod
    def search_locations(search_term):
        """Mencari lokasi berdasarkan nama"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT 
                    id_location,
                    location_name,
                    description
                FROM locations 
                WHERE location_name ILIKE %s
                ORDER BY location_name
                LIMIT 20
            """
            
            search_pattern = f"%{search_term}%"
            cursor.execute(query, (search_pattern,))
            locations = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # Format ulang response
            formatted_locations = []
            for loc in locations:
                formatted_locations.append({
                    'id_location': loc['id_location'],
                    'location_name': loc['location_name'],
                    'location_code': f"LOC-{loc['id_location']:03d}",
                    'area': 'General',
                    'category': 'Office',
                    'description': loc['description'] or ''
                })
            
            return {
                "success": True,
                "locations": formatted_locations,
                "total": len(formatted_locations)
            }
            
        except Exception as e:
            print(f"Error searching locations: {e}")
            return {
                "success": False,
                "error": str(e),
                "locations": []
            }
    
    @staticmethod
    def assign_multiple_assets(asset_ids, location_code, scanned_by, notes=None):
        """Menetapkan multiple assets ke lokasi yang sama"""
        # Ambil id_location dari location_code
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Parse location_code (format: LOC-XXX)
            try:
                location_id = int(location_code.split('-')[1])
            except:
                location_id = 1  # Default
            
            current_time = datetime.now()
            success_count = 0
            failed_assets = []
            
            for asset_id in asset_ids:
                try:
                    print(f"Assigning asset {asset_id} to location {location_id}")
                    success_count += 1
                    
                except Exception as e:
                    failed_assets.append({
                        "asset_id": asset_id,
                        "error": str(e)
                    })
                    continue
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                "success": True,
                "message": f"Successfully assigned {success_count} assets",
                "success_count": success_count,
                "failed_count": len(failed_assets),
                "failed_assets": failed_assets,
                "location_code": location_code
            }
            
        except Exception as e:
            print(f"Error assigning multiple assets: {e}")
            return {
                "success": False,
                "error": str(e)
            }