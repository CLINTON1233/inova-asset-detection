from flask import Flask, send_from_directory
from flask_cors import CORS
import os
from config import UPLOAD_FOLDER, SCAN_PHOTOS_FOLDER  
import os

app = Flask(__name__)

CORS(app, 
     origins=["http://localhost:3004"], 
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Simpan folder ke config
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SCAN_PHOTOS_FOLDER'] = SCAN_PHOTOS_FOLDER

# Buat folder jika belum ada
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['SCAN_PHOTOS_FOLDER'], exist_ok=True)

# Routes
from routes.auth import auth_bp
from routes.detection import detection_bp
from routes.location import location_bp
from routes.serial_detection import serial_bp
from routes.scan_code_detection import scan_code_bp
from routes.serial_ocr import ocr_bp 
from routes.scanning_preparation import scanning_prep_bp
from routes.department import department_bp 
from routes.scan_results import scan_results_bp
from routes.validation import validation_bp

# Blueprint
app.register_blueprint(auth_bp)
app.register_blueprint(detection_bp)
app.register_blueprint(location_bp)
app.register_blueprint(serial_bp)
app.register_blueprint(scan_code_bp)
app.register_blueprint(ocr_bp)
app.register_blueprint(scanning_prep_bp)
app.register_blueprint(department_bp) 
app.register_blueprint(scan_results_bp)  
app.register_blueprint(validation_bp)     

@app.route('/')
def root():
    return {"message": "Welcome to INOVA API", "status": "running"}

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    """Serve uploaded files"""
    try:
        upload_folder = os.path.join(os.getcwd(), 'uploads')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder, exist_ok=True)
        return send_from_directory(upload_folder, filename)
    except Exception as e:
        print(f"Error serving file: {e}")
        return {"error": "File not found"}, 404

@app.route('/uploads/scan_photos/<path:filename>')
def serve_scan_photos(filename):
    """Serve scan photos files"""
    try:
        photo_folder = os.path.join(os.getcwd(), 'uploads', 'scan_photos')
        if not os.path.exists(photo_folder):
            os.makedirs(photo_folder, exist_ok=True)
        return send_from_directory(photo_folder, filename)
    except Exception as e:
        print(f"Error serving scan photo: {e}")
        return {"error": "File not found"}, 404

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
                "/api/detect/camera": "POST - Send base64 image for device detection"
            },
            "serial": {
                "/api/serial/detect": "POST - Upload image for serial number detection",
                "/api/serial/detect/camera": "POST - Send base64 image for serial detection",
                "/api/serial/assign/<device_id>": "POST - Assign serial to device"
            },
            "location": {
                "/api/location/all": "GET - Get all active locations",
                "/api/location/search": "GET - Search locations",
                "/api/location/assign-multiple": "POST - Assign location to multiple assets",
                "/api/location/asset/<asset_id>": "GET - Get asset location",
                "/api/location/<location_code>": "GET - Get location by code"
            },
            "department": {
                "/api/department/all": "GET - Get all departments",
                "/api/department/search": "GET - Search departments",
                "/api/department/<id>": "GET - Get department by ID",
                "/api/department/code/<code>": "GET - Get department by code"
            }
        }
    }

if __name__ == '__main__':
    PORT = 5001  
    print(f"🚀 Starting Flask server on port {PORT}...")
    print(f"🔗 Frontend URL: http://localhost:3004")
    print(f"🔗 Backend URL: http://localhost:{PORT}")
    
    app.run(debug=True, host='0.0.0.0', port=PORT)