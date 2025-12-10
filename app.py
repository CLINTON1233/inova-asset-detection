# app.py - FILE UTAMA ENTRY POINT
from flask import Flask
from flask_cors import CORS
from config import API_PORT, SECRET_KEY

# Import Blueprints dari routes
from routes.auth import auth_bp

# Inisialisasi Flask app
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)
app.config['SECRET_KEY'] = SECRET_KEY

# Register Blueprints
app.register_blueprint(auth_bp)          # URL: /api/*

@app.route('/')
def root():
    return {"message": "Welcome to INOVA API", "status": "running"}

if __name__ == '__main__':
    print(f"🚀 Starting Flask server on port {API_PORT}...")
    print("🔗 Available routes:")
    print("   - /api/login (POST) - Login user")
    print("   - /api/register (POST) - Register user")
    print("   - /api/health (GET) - Health check")
    print("   - /api/test-db (GET) - Test database")
    print("   - /api/protected (GET) - Protected route")
    # print("   - / (GET) - YOLO Detection UI")
    # print("   - /predict (POST) - YOLO Detection")
    
    app.run(debug=True, host='0.0.0.0', port=API_PORT)