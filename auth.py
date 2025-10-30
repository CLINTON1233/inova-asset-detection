from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt
import os
from datetime import datetime
import jwt
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

app = Flask(__name__)
CORS(app) 

# Konfigurasi database
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'inova'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'Sukses12345'),
    'port': os.getenv('DB_PORT', '5432')
}

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')

def get_db_connection():
    """Membuat koneksi ke database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print(" Database connected successfully")
        return conn
    except Exception as e:
        print(f" Database connection error: {e}")
        return None

# Endpoint untuk registrasi user baru
@app.route('/api/register', methods=['POST'])
def register():
    """Endpoint untuk registrasi user baru"""
    conn = None
    cursor = None
    
    try:
        data = request.get_json()
        print(f"📥 Received registration data: {data}")
        
        # Validasi data yang diperlukan
        required_fields = ['name', 'username', 'email', 'password', 'no_badge', 'department']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Field {field} is required'
                }), 400
        
        # Validasi email
        if '@' not in data['email']:
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        # Validasi password
        if len(data['password']) < 6:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 6 characters'
            }), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed. Please check database configuration.'
            }), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        check_query = """
            SELECT username, email, no_badge 
            FROM karyawan 
            WHERE username = %s OR email = %s OR no_badge = %s
        """
        cursor.execute(check_query, (data['username'], data['email'], data['no_badge']))
        existing_user = cursor.fetchone()
        
        if existing_user:
            conflict_fields = []
            if existing_user['username'] == data['username']:
                conflict_fields.append('username')
            if existing_user['email'] == data['email']:
                conflict_fields.append('email')
            if existing_user['no_badge'] == data['no_badge']:
                conflict_fields.append('badge number')
            
            return jsonify({
                'success': False,
                'message': f'{", ".join(conflict_fields)} already exists'
            }), 409
        
        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert user baru
        insert_query = """
            INSERT INTO karyawan (name, username, email, password, no_badge, department, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
            RETURNING id_user, username, email, name, no_badge, department, status, created_at
        """
        
        cursor.execute(insert_query, (
            data['name'],
            data['username'],
            data['email'],
            hashed_password,
            data['no_badge'],
            data['department']
        ))
        
        new_user = cursor.fetchone()
        conn.commit()
        
        print(f" User registered successfully: {new_user['username']}")
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': {
                'id': new_user['id_user'],
                'username': new_user['username'],
                'email': new_user['email'],
                'name': new_user['name'],
                'no_badge': new_user['no_badge'],
                'department': new_user['department'],
                'status': new_user['status']
            }
        }), 201
        
    except Exception as e:
        print(f" Registration error: {e}")
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500
        
    finally:
        # Pastikan koneksi ditutup dengan benar
        if cursor:
            cursor.close()
            print(" Cursor closed")
        if conn:
            conn.close()
            print(" Database connection closed")
            
# Endpoint untuk login user            
@app.route('/api/login', methods=['POST'])
def login():
    """Endpoint untuk login user"""
    conn = None
    cursor = None
    
    try:
        data = request.get_json()
        print(f"📥 Received login data: {data}")
        
        # Validasi data yang diperlukan
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
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Cari user berdasarkan email atau username
        find_user_query = """
            SELECT id_user, username, email, password, name, no_badge, department, status 
            FROM karyawan 
            WHERE email = %s OR username = %s
        """
        cursor.execute(find_user_query, (data['email'], data['email']))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid email/username or password'
            }), 401
        
        # Cek status user
        if user['status'] != 'active':
            return jsonify({
                'success': False,
                'message': 'Your account is not active. Please contact administrator.'
            }), 401
        
        # Verifikasi password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({
                'success': False,
                'message': 'Invalid email/username or password'
            }), 401
        
        # Generate JWT token
        token_payload = {
            'user_id': user['id_user'],
            'username': user['username'],
            'email': user['email'],
            'exp': datetime.utcnow() + timedelta(days=7)  
        }
        
        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')
        
        print(f" User logged in successfully: {user['username']}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id_user'],
                'username': user['username'],
                'email': user['email'],
                'name': user['name'],
                'no_badge': user['no_badge'],
                'department': user['department'],
                'status': user['status']
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
            
            
            
# Endpoint untuk health check API
@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint untuk mengecek kesehatan API"""
    conn = None
    try:
        conn = get_db_connection()
        if conn:
            # Test query sederhana
            cursor = conn.cursor()
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            return jsonify({
                'status': 'healthy',
                'database': 'connected',
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected'
            }), 500
    except Exception as e:
        if conn:
            conn.close()
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

# Endpoint untuk test koneksi database
@app.route('/api/test-db', methods=['GET'])
def test_db():
    """Endpoint untuk test koneksi database"""
    conn = None
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT version()")
            db_version = cursor.fetchone()
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Database connected successfully',
                'database_version': db_version['version']
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

# Jalankan server 
if __name__ == '__main__':
    print(" Starting Flask server...")
    print(f" Database config: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    app.run(debug=True, host='0.0.0.0', port=5000)