# app.py
from flask import Flask, jsonify
from flask_cors import CORS
import os

# Inisialisasi Flask app
app = Flask(__name__)

# Konfigurasi CORS frontend port 3004
CORS(app, 
     origins=["http://localhost:3004"], 
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')

# Register Blueprints
from routes.auth import auth_bp
from routes.detection import detection_bp
from routes.location import location_bp

app.register_blueprint(auth_bp)          
app.register_blueprint(detection_bp)     
app.register_blueprint(location_bp)

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
                "/api/health": "GET - Health check"
            },
            "detection": {
                "/api/detect": "POST - Upload image for device detection",
                "/api/detect/camera": "POST - Send base64 image for device detection",
                "/api/detect/serial": "POST - Upload image for serial number detection",
                "/api/detect/serial/camera": "POST - Send base64 for serial number detection"
            },
            "location": {
                "/api/location/all": "GET - Get all active locations",
                "/api/location/search": "GET - Search locations",
                "/api/location/assign-multiple": "POST - Assign location to multiple assets",
                "/api/location/asset/<asset_id>": "GET - Get asset location",
                "/api/location/<location_code>": "GET - Get location by code"
            }
        }
    }

if __name__ == '__main__':
    PORT = 5001  
    print(f"🚀 Starting Flask server on port {PORT}...")
    print(f"🔗 Frontend URL: http://localhost:3004")
    print(f"🔗 Backend URL: http://localhost:{PORT}")
    
    app.run(debug=True, host='0.0.0.0', port=PORT)