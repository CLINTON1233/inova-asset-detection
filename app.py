from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Konfigurasi CORS yang lebih komprehensif
CORS(app, 
     origins=["http://localhost:3000", "http://127.0.0.1:3000"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Accept"],
     supports_credentials=True)

# Database configuration - SESUAIKAN DENGAN SETTING ANDA
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'inova'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password_anda'),  # GANTI INI
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def hash_password(password):
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(hashed_password, user_password):
    """Check hashed password"""
    return bcrypt.checkpw(user_password.encode('utf-8'), hashed_password.encode('utf-8'))

# Tambahkan handler untuk OPTIONS requests
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Backend is running'})

@app.route('/api/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        # Handle preflight OPTIONS request
        if request.method == 'OPTIONS':
            return '', 200
            
        data = request.get_json()
        print(f"Received registration data: {data}")
        
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400
        
        # Validasi input
        required_fields = ['name', 'email', 'password', 'no_badge', 'department', 'username']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Field {field} is required'}), 400
        
        # Hash password
        hashed_password = hash_password(data['password'])
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if email or username already exists
        cursor.execute(
            "SELECT email, username FROM karyawan WHERE email = %s OR username = %s",
            (data['email'], data['username'])
        )
        existing_user = cursor.fetchone()
        
        if existing_user:
            if existing_user['email'] == data['email']:
                return jsonify({'error': 'Email already registered'}), 400
            if existing_user['username'] == data['username']:
                return jsonify({'error': 'Username already taken'}), 400
        
        # Insert new user
        cursor.execute(
            """
            INSERT INTO karyawan 
            (no_badge, username, email, password, department, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id_user, no_badge, username, email, department, status, created_at
            """,
            (
                data['no_badge'],
                data['username'],
                data['email'],
                hashed_password,
                data['department'],
                'active'
            )
        )
        
        new_user = cursor.fetchone()
        conn.commit()
        
        response_data = {
            'message': 'Registration successful',
            'user': {
                'id_user': new_user['id_user'],
                'no_badge': new_user['no_badge'],
                'username': new_user['username'],
                'email': new_user['email'],
                'department': new_user['department'],
                'status': new_user['status'],
                'created_at': new_user['created_at'].isoformat()
            }
        }
        print(f"Registration successful: {response_data}")
        return jsonify(response_data), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users (for testing)"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            "SELECT id_user, no_badge, username, email, department, status, created_at FROM karyawan"
        )
        users = cursor.fetchall()
        
        # Convert datetime objects to string
        for user in users:
            user['created_at'] = user['created_at'].isoformat()
        
        return jsonify({'users': users})
        
    except Exception as e:
        print(f"Get users error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    """User login"""
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Find user by email
        cursor.execute(
            "SELECT * FROM karyawan WHERE email = %s",
            (data['email'],)
        )
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check password
        if not check_password(user['password'], data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Return user data (without password)
        user_data = {
            'id_user': user['id_user'],
            'no_badge': user['no_badge'],
            'username': user['username'],
            'email': user['email'],
            'department': user['department'],
            'status': user['status'],
            'created_at': user['created_at'].isoformat()
        }
        
        return jsonify({
            'message': 'Login successful',
            'user': user_data
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)