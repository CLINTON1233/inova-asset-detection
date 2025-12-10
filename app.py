from flask import Flask
from flask_cors import CORS
import os

# Inisialisasi Flask app
app = Flask(__name__)

# Konfigurasi CORS untuk frontend port 3004
CORS(app, 
     origins=["http://localhost:3004"], 
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

# Register Blueprints
from routes.auth import auth_bp
from routes.detection import detection_bp

app.register_blueprint(auth_bp)          
app.register_blueprint(detection_bp)     

@app.route('/')
def root():
    return {"message": "Welcome to INOVA API", "status": "running"}

@app.route('/api')
def api_info():
    return {
        "api_name": "INOVA Backend API",
        "version": "1.0.0",
        "endpoints": {
            "auth": {
                "/api/login": "POST - User login",
                "/api/register": "POST - User registration",
                "/api/health": "GET - Health check",
                "/api/test-db": "GET - Database test"
            },
            "detection": {
                "/api/detect": "POST - Upload image for device detection",
                "/api/detect/camera": "POST - Send base64 image for detection",
                "/api/detect/test": "GET - Test detection endpoint"
            }
        }
    }

if __name__ == '__main__':
    PORT = 5001  # Ganti port ke 6000
    print(f"🚀 Starting Flask server on port {PORT}...")
    print(f"🔗 Frontend URL: http://localhost:3004")
    print(f"🔗 Backend URL: http://localhost:{PORT}")
    
    app.run(debug=True, host='0.0.0.0', port=PORT)