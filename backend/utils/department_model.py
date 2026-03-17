import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from utils.database import get_db_connection

class DepartmentModel:
    
    @staticmethod
    def get_all_departments():
        """Mengambil semua department"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT 
                    id_department,
                    department_name,
                    description
                FROM departments 
                ORDER BY department_name
            """
            
            cursor.execute(query)
            departments = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            formatted_departments = []
            for dept in departments:
                formatted_departments.append({
                    'id_department': dept['id_department'],
                    'department_name': dept['department_name'],
                    'department_code': f"DEPT-{dept['id_department']:03d}",
                    'description': dept['description'] or ''
                })
            
            return {
                "success": True,
                "departments": formatted_departments,
                "total": len(formatted_departments)
            }
            
        except Exception as e:
            print(f"Error getting departments: {e}")
            return {
                "success": False,
                "error": str(e),
                "departments": [],
                "total": 0
            }
    
    @staticmethod
    def get_department_by_id(department_id):
        """Mengambil detail department berdasarkan ID"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT 
                    id_department,
                    department_name,
                    description,
                    created_at,
                    updated_at
                FROM departments 
                WHERE id_department = %s
            """
            
            cursor.execute(query, (department_id,))
            department = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if not department:
                return {
                    "success": False,
                    "error": "Department not found"
                }
            
            formatted_department = {
                'id_department': department['id_department'],
                'department_name': department['department_name'],
                'department_code': f"DEPT-{department['id_department']:03d}",
                'description': department['description'] or '',
                'created_at': department['created_at'],
                'updated_at': department['updated_at']
            }
            
            return {
                "success": True,
                "department": formatted_department
            }
            
        except Exception as e:
            print(f"Error getting department by id: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def search_departments(search_term):
        """Mencari department berdasarkan nama"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT 
                    id_department,
                    department_name,
                    description
                FROM departments 
                WHERE department_name ILIKE %s
                ORDER BY department_name
                LIMIT 20
            """
            
            search_pattern = f"%{search_term}%"
            cursor.execute(query, (search_pattern,))
            departments = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            formatted_departments = []
            for dept in departments:
                formatted_departments.append({
                    'id_department': dept['id_department'],
                    'department_name': dept['department_name'],
                    'department_code': f"DEPT-{dept['id_department']:03d}",
                    'description': dept['description'] or ''
                })
            
            return {
                "success": True,
                "departments": formatted_departments,
                "total": len(formatted_departments)
            }
            
        except Exception as e:
            print(f"Error searching departments: {e}")
            return {
                "success": False,
                "error": str(e),
                "departments": []
            }