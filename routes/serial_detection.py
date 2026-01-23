from flask import Blueprint, request, jsonify
import os
import base64
import time
import cv2
import numpy as np
from utils.serial_detector import detect_serial_numbers as detect_serial_numbers_fast

serial_bp = Blueprint('serial', __name__, url_prefix='/api/serial')

@serial_bp.route('/detect', methods=['POST'])
def detect_serials():
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image file"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"success": False, "message": "No selected file"}), 400
        
        os.makedirs('temp', exist_ok=True)
        temp_path = f"temp/serial_{int(time.time())}.jpg"
        file.save(temp_path)
        
        result = detect_serial_numbers_fast(temp_path)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@serial_bp.route('/detect/camera', methods=['POST'])
def detect_serials_from_camera():
    try:
        data = request.get_json()
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data"}), 400
        
        img_data = data['image_data'].split(',')[1] if ',' in data['image_data'] else data['image_data']
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"success": False, "message": "Failed to decode image"}), 400
        
        h, w = img.shape[:2]
        if max(h, w) > 800:
            scale = 800 / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), cv2.INTER_AREA)
        
        os.makedirs('temp', exist_ok=True)
        temp_path = f"temp/serial_camera_{int(time.time())}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        result = detect_serial_numbers_fast(temp_path)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500
        
@serial_bp.route('/assign/<device_id>', methods=['POST'])
def assign_serial_to_device():
    try:
        data = request.get_json()
        if not data or 'serial_number' not in data:
            return jsonify({"success": False, "message": "serial_number required"}), 400
        
        return jsonify({
            "success": True,
            "message": f"Serial assigned to device {device_id}",
            "device_id": device_id,
            "serial_number": data['serial_number']
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@serial_bp.route('/test', methods=['GET'])
def test_serial_detection():
    return jsonify({
        "success": True,
        "message": "Serial detection API is working",
        "endpoints": {
            "POST /api/serial/detect": "Upload image file",
            "POST /api/serial/detect/camera": "Send base64 image",
            "POST /api/serial/assign/{device_id}": "Assign serial to device",
            "GET /api/serial/test": "Test endpoint"
        }
    })