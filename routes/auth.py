from flask import Blueprint, request, jsonify
import bcrypt
from datetime import datetime
from utils.database import get_db_connection
import secrets

# Buat Blueprint untuk auth routes
auth_bp = Blueprint('auth', __name__, url_prefix='/api')

@auth_bp.route('/register', methods=['POST'])
def register():
    conn = None
    cursor = None
    
    try:
        data = request.get_json()
        print(f" Received registration data: {data}")
        
        required_fields = ['username', 'email', 'password', 'no_badge', 'department']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Field {field} is required'
                }), 400
        
        if '@' not in data['email']:
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        if len(data['password']) < 6:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 6 characters'
            }), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        
        check_query = """
            SELECT username, email, no_badge 
            FROM users 
            WHERE username = %s OR email = %s OR no_badge = %s
        """
        cursor.execute(check_query, (data['username'], data['email'], data['no_badge']))
        existing_user = cursor.fetchone()
        
        if existing_user:
            conflict_fields = []
            if existing_user[0] == data['username']:
                conflict_fields.append('username')
            if existing_user[1] == data['email']:
                conflict_fields.append('email')
            if existing_user[2] == data['no_badge']:
                conflict_fields.append('badge number')
            
            return jsonify({
                'success': False,
                'message': f'{", ".join(conflict_fields)} already exists'
            }), 409
        
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        insert_query = """
            INSERT INTO users (username, email, password, no_badge, department, status, created_at)
            VALUES (%s, %s, %s, %s, %s, 'active', %s)
            RETURNING id_user, username, email, no_badge, department, status, created_at
        """
        
        cursor.execute(insert_query, (
            data['username'],
            data['email'],
            hashed_password,
            data['no_badge'],
            data['department'],
            datetime.now()
        ))
        
        new_user = cursor.fetchone()
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': {
                'id': new_user[0],
                'username': new_user[1],
                'email': new_user[2],
                'no_badge': new_user[3],
                'department': new_user[4],
                'status': new_user[5]
            }
        }), 201
        
    except Exception as e:
        print(f" Registration error: {e}")
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@auth_bp.route('/update-profile', methods=['PUT'])
def update_profile():
    conn = None
    cursor = None
    
    try:
        # Check authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        data = request.get_json()
        print(f" Received update profile data: {data}")
        
        required_fields = ['username', 'email', 'no_badge', 'department']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Field {field} is required'
                }), 400
        
        if '@' not in data['email']:
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()

        if 'user_id' not in data:
            return jsonify({
                'success': False,
                'message': 'User ID is required'
            }), 400
        
        user_id = data['user_id']
        
        # Check if username or email already exists for other users
        check_query = """
            SELECT id_user, username, email, no_badge 
            FROM users 
            WHERE (username = %s OR email = %s OR no_badge = %s)
            AND id_user != %s
        """
        cursor.execute(check_query, (data['username'], data['email'], data['no_badge'], user_id))
        existing_users = cursor.fetchall()
        
        conflict_fields = []
        for user in existing_users:
            if user[1] == data['username']:
                conflict_fields.append('username')
            if user[2] == data['email']:
                conflict_fields.append('email')
            if user[3] == data['no_badge']:
                conflict_fields.append('badge number')
        
        if conflict_fields:
            return jsonify({
                'success': False,
                'message': f'{", ".join(conflict_fields)} already exists for another user'
            }), 409
        
        # Update user profile (tanpa phone karena tidak ada di database)
        update_query = """
            UPDATE users 
            SET username = %s, 
                email = %s, 
                no_badge = %s, 
                department = %s, 
                updated_at = %s
            WHERE id_user = %s
            RETURNING id_user, username, email, no_badge, department, status, created_at
        """
        
        cursor.execute(update_query, (
            data['username'],
            data['email'],
            data['no_badge'],
            data['department'],
            datetime.now(),
            user_id
        ))
        
        updated_user = cursor.fetchone()
        conn.commit()
        
        if not updated_user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': {
                'id': updated_user[0],
                'username': updated_user[1],
                'email': updated_user[2],
                'no_badge': updated_user[3],
                'department': updated_user[4],
                'status': updated_user[5],
                'created_at': updated_user[6].isoformat() if updated_user[6] else None
            }
        }), 200
        
    except Exception as e:
        print(f" Update profile error: {e}")
        if conn:
            conn.rollback()
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    conn = None
    cursor = None
    
    try:
        # Check authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        data = request.get_json()
        print(f" Received change password request")
        
        required_fields = ['user_id', 'current_password', 'new_password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Field {field} is required'
                }), 400
        
        if len(data['new_password']) < 6:
            return jsonify({
                'success': False,
                'message': 'New password must be at least 6 characters'
            }), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        
        user_id = data['user_id']
        
        # Get current user's password
        get_user_query = "SELECT password FROM users WHERE id_user = %s"
        cursor.execute(get_user_query, (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Verify current password
        if not bcrypt.checkpw(data['current_password'].encode('utf-8'), user[0].encode('utf-8')):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401
        
        # Hash new password
        hashed_password = bcrypt.hashpw(data['new_password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        update_query = """
            UPDATE users 
            SET password = %s, 
                updated_at = %s
            WHERE id_user = %s
        """
        
        cursor.execute(update_query, (hashed_password, datetime.now(), user_id))
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        print(f" Change password error: {e}")
        if conn:
            conn.rollback()
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    conn = None
    cursor = None
    
    try:
        data = request.get_json()
        print(f" Received login data: {data}")
        
        if not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        
        login_query = """
            SELECT id_user, username, email, password, no_badge, department, status 
            FROM users 
            WHERE (email = %s OR username = %s) AND status = 'active'
        """
        cursor.execute(login_query, (data['email'], data['email']))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid email/username or password'
            }), 401
        
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user[3].encode('utf-8')):
            return jsonify({
                'success': False,
                'message': 'Invalid email/username or password'
            }), 401
        
        token = secrets.token_hex(32)
        
        try:
            update_query = "UPDATE users SET updated_at = %s WHERE id_user = %s"
            cursor.execute(update_query, (datetime.now(), user[0]))
            conn.commit()
        except Exception as e:
            print(f"ℹ Note: updated_at update failed: {e}")
            conn.rollback()
        
        print(f" User logged in successfully: {user[1]}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user[0],
                'name': user[1],  # Tambahkan ini
                'username': user[1],
                'email': user[2],
                'no_badge': user[4],
                'department': user[5],
                'status': user[6]
            }
        }), 200
        
    except Exception as e:
        print(f" Login error: {e}")
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@auth_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'auth-api',
        'timestamp': datetime.now().isoformat()
    }), 200

@auth_bp.route('/test-db', methods=['GET'])
def test_db():
    conn = None
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("SELECT version()")
            db_version = cursor.fetchone()
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Database connected successfully',
                'database_version': db_version[0]
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to connect to database'
            }), 500
    except Exception as e:
        if conn:
            conn.close()
        return jsonify({
            'success': False,
            'message': f'Database connection failed: {str(e)}'
        }), 500

@auth_bp.route('/protected', methods=['GET'])
def protected():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({
            'success': False,
            'message': 'No token provided'
        }), 401
    
    token = auth_header.split(' ')[1]
    
    return jsonify({
        'success': True,
        'message': 'Access granted',
        'data': 'Protected resource'
    }), 200