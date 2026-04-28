from flask import Blueprint, request, jsonify, current_app 
import bcrypt
from datetime import datetime, timedelta
from utils.database import get_db_connection
import secrets
import jwt 
import traceback
import psycopg2
import psycopg2.extras

active_tokens = {}
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
        
        # Ambil role dari request, default 'karyawan'
        role = data.get('role', 'karyawan')
        
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
            INSERT INTO users (username, email, password, no_badge, department, role, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'active', %s)
            RETURNING id_user, username, email, no_badge, department, role, status, created_at
        """
        
        cursor.execute(insert_query, (
            data['username'],
            data['email'],
            hashed_password,
            data['no_badge'],
            data['department'],
            role,
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
                'role': new_user[5] if len(new_user) > 5 else 'karyawan',
                'status': new_user[6] if len(new_user) > 6 else 'active'
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
        
        update_query = """
            UPDATE users 
            SET username = %s, 
                email = %s, 
                no_badge = %s, 
                department = %s, 
                updated_at = %s
            WHERE id_user = %s
            RETURNING id_user, username, email, no_badge, department, status, created_at, role
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
                'created_at': updated_user[6].isoformat() if updated_user[6] else None,
                'role': updated_user[7] if len(updated_user) > 7 else 'karyawan'
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
        
        get_user_query = "SELECT password FROM users WHERE id_user = %s"
        cursor.execute(get_user_query, (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        if not bcrypt.checkpw(data['current_password'].encode('utf-8'), user[0].encode('utf-8')):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401

        hashed_password = bcrypt.hashpw(data['new_password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
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
        
        # PERBAIKAN: Ambil juga column role dari tabel users
        login_query = """
            SELECT id_user, username, email, password, no_badge, department, status, role 
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
        
        secret_key = current_app.config.get('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')
        
        token = jwt.encode({
            'user_id': user[0],
            'username': user[1],
            'role': user[7] if len(user) > 7 else 'karyawan',  # Tambahkan role ke token
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, secret_key, algorithm='HS256')
        
        active_tokens[token] = {
            'user_id': user[0],
            'created_at': datetime.now()
        }
        
        print(f" User logged in successfully: {user[1]}, role: {user[7] if len(user) > 7 else 'karyawan'}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user[0],
                'name': user[1],
                'username': user[1],
                'email': user[2],
                'no_badge': user[4],
                'department': user[5],
                'status': user[6],
                'role': user[7] if len(user) > 7 else 'karyawan'  # Kirim role dari database
            }
        }), 200
        
    except Exception as e:
        print(f" Login error: {e}")
        import traceback
        traceback.print_exc()
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
    
    try:
        secret_key = current_app.config.get('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        if token not in active_tokens:
            return jsonify({
                'success': False,
                'message': 'Invalid or expired token'
            }), 401
            
        return jsonify({
            'success': True,
            'message': 'Access granted',
            'user_id': payload['user_id'],
            'username': payload['username']
        }), 200
        
    except jwt.ExpiredSignatureError:
        if token in active_tokens:
            del active_tokens[token]
        return jsonify({
            'success': False,
            'message': 'Token has expired'
        }), 401
    except jwt.InvalidTokenError:
        return jsonify({
            'success': False,
            'message': 'Invalid token'
        }), 401
    except Exception as e:
        print(f"Protected error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# ==================== MANAGEMENT USERS ENDPOINTS ====================
@auth_bp.route('/users', methods=['GET'])
def get_all_users():
    """Mendapatkan semua users (hanya untuk superadmin)"""
    conn = None
    cursor = None
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        token = auth_header.split(' ')[1]
        secret_key = current_app.config.get('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        conn = get_db_connection()
        # Gunakan cursor biasa dulu, bukan DictCursor untuk menghindari error
        cursor = conn.cursor()
        
        # Cek apakah user adalah superadmin
        cursor.execute("SELECT role FROM users WHERE id_user = %s", (payload['user_id'],))
        current_user = cursor.fetchone()
        
        if not current_user or current_user[0] != 'superadmin':
            return jsonify({'success': False, 'error': 'Access denied - Superadmin only'}), 403
        
        cursor.execute("""
            SELECT 
                id_user as id, 
                username, 
                email, 
                no_badge, 
                department, 
                role, 
                status, 
                created_at,
                updated_at
            FROM users
            ORDER BY created_at DESC
        """)
        
        users = cursor.fetchall()
        
        # Konversi ke list of dicts
        users_list = []
        for user in users:
            users_list.append({
                'id': user[0],
                'username': user[1],
                'email': user[2],
                'no_badge': user[3],
                'department': user[4],
                'role': user[5],
                'status': user[6],
                'created_at': user[7].isoformat() if user[7] else None,
                'updated_at': user[8].isoformat() if user[8] else None
            })
        
        return jsonify({
            'success': True,
            'data': users_list,
            'count': len(users_list)
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'error': 'Invalid token'}), 401
    except Exception as e:
        print(f"Error getting users: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Menghapus user (hanya untuk superadmin)"""
    conn = None
    cursor = None
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        token = auth_header.split(' ')[1]
        secret_key = current_app.config.get('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Cek apakah user adalah superadmin
        cursor.execute("SELECT role, id_user FROM users WHERE id_user = %s", (payload['user_id'],))
        current_user = cursor.fetchone()
        
        if not current_user or current_user[0] != 'superadmin':
            return jsonify({'success': False, 'error': 'Access denied - Superadmin only'}), 403
        
        # Cek apakah user yang akan dihapus ada
        cursor.execute("SELECT id_user FROM users WHERE id_user = %s", (user_id,))
        if not cursor.fetchone():
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Jangan izinkan menghapus diri sendiri
        if user_id == payload['user_id']:
            return jsonify({'success': False, 'error': 'Cannot delete your own account'}), 400
        
        cursor.execute("DELETE FROM users WHERE id_user = %s", (user_id,))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'User deleted successfully'})
        
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'error': 'Invalid token'}), 401
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error deleting user: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@auth_bp.route('/users/role/<int:user_id>', methods=['PUT'])
def update_user_role(user_id):
    """Update role user (hanya untuk superadmin)"""
    conn = None
    cursor = None
    try:
        data = request.json
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        token = auth_header.split(' ')[1]
        secret_key = current_app.config.get('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Cek apakah user adalah superadmin
        cursor.execute("SELECT role FROM users WHERE id_user = %s", (payload['user_id'],))
        current_user = cursor.fetchone()
        
        if not current_user or current_user[0] != 'superadmin':
            return jsonify({'success': False, 'error': 'Access denied - Superadmin only'}), 403
        
        new_role = data.get('role')
        if new_role not in ['admin', 'superadmin']:
            return jsonify({'success': False, 'error': 'Invalid role. Must be admin or superadmin'}), 400
        
        # Cek apakah user yang akan diupdate ada
        cursor.execute("SELECT id_user FROM users WHERE id_user = %s", (user_id,))
        if not cursor.fetchone():
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        cursor.execute("UPDATE users SET role = %s, updated_at = CURRENT_TIMESTAMP WHERE id_user = %s", (new_role, user_id))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Role updated successfully'})
        
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'error': 'Invalid token'}), 401
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating role: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@auth_bp.route('/users/reset-password/<int:user_id>', methods=['PUT'])
def reset_user_password(user_id):
    """Reset password user (hanya untuk superadmin)"""
    conn = None
    cursor = None
    try:
        data = request.json
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        token = auth_header.split(' ')[1]
        secret_key = current_app.config.get('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Cek apakah user adalah superadmin
        cursor.execute("SELECT role FROM users WHERE id_user = %s", (payload['user_id'],))
        current_user = cursor.fetchone()
        
        if not current_user or current_user[0] != 'superadmin':
            return jsonify({'success': False, 'error': 'Access denied - Superadmin only'}), 403
        
        new_password = data.get('new_password')
        if not new_password or len(new_password) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
        
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cursor.execute("UPDATE users SET password = %s, updated_at = CURRENT_TIMESTAMP WHERE id_user = %s", (hashed_password, user_id))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Password reset successfully'})
        
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'error': 'Invalid token'}), 401
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error resetting password: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@auth_bp.route('/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get('Authorization')
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        if token in active_tokens:
            del active_tokens[token]
    
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200