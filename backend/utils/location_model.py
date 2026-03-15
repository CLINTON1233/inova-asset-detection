# utils/location_model.py
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from utils.database import get_db_connection

class LocationModel:
    
    @staticmethod
    def get_all_active_locations():
        """Mengambil semua lokasi yang aktif"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT 
                    location_code,
                    area,
                    location_name,
                    category
                FROM locations 
                WHERE status = 'active'
                ORDER BY area, location_name
            """
            
            cursor.execute(query)
            locations = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return {
                "success": True,
                "locations": locations,
                "total": len(locations)
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
    def get_location_by_code(location_code):
        """Mengambil lokasi berdasarkan kode"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT * FROM locations 
                WHERE location_code = %s AND status = 'active'
            """
            
            cursor.execute(query, (location_code,))
            location = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if location:
                return {
                    "success": True,
                    "location": location
                }
            else:
                return {
                    "success": False,
                    "message": "Location not found"
                }
                
        except Exception as e:
            print(f"Error getting location by code: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def search_locations(search_term):
        """Mencari lokasi berdasarkan nama atau kode"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT 
                    location_code,
                    area,
                    location_name,
                    category
                FROM locations 
                WHERE status = 'active' 
                AND (
                    location_name ILIKE %s 
                    OR location_code ILIKE %s 
                    OR area ILIKE %s
                )
                ORDER BY area, location_name
                LIMIT 20
            """
            
            search_pattern = f"%{search_term}%"
            cursor.execute(query, (search_pattern, search_pattern, search_pattern))
            locations = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return {
                "success": True,
                "locations": locations,
                "total": len(locations)
            }
            
        except Exception as e:
            print(f"Error searching locations: {e}")
            return {
                "success": False,
                "error": str(e),
                "locations": []
            }
    
    @staticmethod
    def assign_asset_to_location(asset_id, location_code, scanned_by, notes=None):
        """Menetapkan asset ke lokasi tertentu"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Cari ID lokasi
            cursor.execute(
                "SELECT id FROM locations WHERE location_code = %s AND status = 'active'",
                (location_code,)
            )
            location = cursor.fetchone()
            
            if not location:
                cursor.close()
                conn.close()
                return {
                    "success": False,
                    "message": f"Location with code '{location_code}' not found"
                }
            
            location_id = location['id']
            
            # Cek apakah asset sudah ada
            cursor.execute(
                "SELECT id FROM asset_locations WHERE asset_id = %s",
                (asset_id,)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Update lokasi yang ada
                cursor.execute("""
                    UPDATE asset_locations 
                    SET location_id = %s, 
                        scanned_at = %s, 
                        scanned_by = %s, 
                        notes = %s
                    WHERE asset_id = %s
                """, (location_id, datetime.now(), scanned_by, notes, asset_id))
            else:
                # Insert baru
                cursor.execute("""
                    INSERT INTO asset_locations 
                    (asset_id, location_id, scanned_by, notes)
                    VALUES (%s, %s, %s, %s)
                """, (asset_id, location_id, scanned_by, notes))
            
            conn.commit()
            
            cursor.close()
            conn.close()
            
            return {
                "success": True,
                "message": f"Asset '{asset_id}' assigned to location '{location_code}'",
                "asset_id": asset_id,
                "location_code": location_code,
                "scanned_by": scanned_by
            }
            
        except Exception as e:
            conn.rollback()
            print(f"Error assigning asset to location: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def assign_multiple_assets(asset_ids, location_code, scanned_by, notes=None):
        """Menetapkan multiple assets ke lokasi yang sama"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Cari ID lokasi
            cursor.execute(
                "SELECT id FROM locations WHERE location_code = %s AND status = 'active'",
                (location_code,)
            )
            location = cursor.fetchone()
            
            if not location:
                cursor.close()
                conn.close()
                return {
                    "success": False,
                    "message": f"Location with code '{location_code}' not found"
                }
            
            location_id = location['id']
            current_time = datetime.now()
            success_count = 0
            failed_assets = []
            
            for asset_id in asset_ids:
                try:
                    # Cek apakah asset sudah ada
                    cursor.execute(
                        "SELECT id FROM asset_locations WHERE asset_id = %s",
                        (asset_id,)
                    )
                    existing = cursor.fetchone()
                    
                    if existing:
                        # Update lokasi yang ada
                        cursor.execute("""
                            UPDATE asset_locations 
                            SET location_id = %s, 
                                scanned_at = %s, 
                                scanned_by = %s, 
                                notes = %s
                            WHERE asset_id = %s
                        """, (location_id, current_time, scanned_by, notes, asset_id))
                    else:
                        # Insert baru
                        cursor.execute("""
                            INSERT INTO asset_locations 
                            (asset_id, location_id, scanned_by, notes)
                            VALUES (%s, %s, %s, %s)
                        """, (asset_id, location_id, scanned_by, notes))
                    
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
                "message": f"Successfully assigned {success_count} assets to location '{location_code}'",
                "success_count": success_count,
                "failed_count": len(failed_assets),
                "failed_assets": failed_assets,
                "location_code": location_code
            }
            
        except Exception as e:
            conn.rollback()
            print(f"Error assigning multiple assets: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def get_asset_location(asset_id):
        """Mengambil lokasi dari asset tertentu"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT 
                    al.asset_id,
                    l.location_code,
                    l.area,
                    l.location_name,
                    l.category,
                    al.scanned_at,
                    al.scanned_by,
                    al.notes
                FROM asset_locations al
                LEFT JOIN locations l ON al.location_id = l.id
                WHERE al.asset_id = %s
                ORDER BY al.scanned_at DESC
                LIMIT 1
            """
            
            cursor.execute(query, (asset_id,))
            location = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if location:
                return {
                    "success": True,
                    "location": location
                }
            else:
                return {
                    "success": False,
                    "message": "No location found for this asset"
                }
                
        except Exception as e:
            print(f"Error getting asset location: {e}")
            return {
                "success": False,
                "error": str(e)
            }