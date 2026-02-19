from flask import Blueprint, request, jsonify
import os
import uuid
import base64
import time
from datetime import datetime
from werkzeug.utils import secure_filename
from config import UPLOAD_FOLDER, ALLOWED_EXTENSIONS, DEVICE_MODEL_PATH
from utils.detector import detect_devices_from_image

detection_bp = Blueprint('detection', __name__, url_prefix='/api')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@detection_bp.route('/detect', methods=['POST'])
def detect_devices():
    try:
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "message": "No image file provided"
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                "success": False,
                "message": "No selected file"
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "message": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400
        
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        original_filename = secure_filename(file.filename)
        file_extension = os.path.splitext(original_filename)[1]
        unique_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{unique_id}{file_extension}"
        
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)
        
        detection_result = detect_devices_from_image(filepath)
        
        if detection_result["success"] and detection_result.get("result_image_path"):
            result_path = detection_result["result_image_path"]
            if result_path.startswith('static/'):
                detection_result["result_image_url"] = f"/{result_path}"
            else:
                detection_result["result_image_url"] = f"/static/results/{os.path.basename(os.path.dirname(result_path))}/{os.path.basename(result_path)}"
                
        detection_result["original_image_url"] = f"/uploads/{unique_filename}"
        
        return jsonify(detection_result)
        
    except Exception as e:
        print(f"Detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Error processing image: {str(e)}"
        }), 500

@detection_bp.route('/detect/camera', methods=['POST'])
def detect_from_camera():
    try:
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({
                "success": False,
                "message": "No image data provided"
            }), 400
        
        image_data = data['image_data']
        
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        temp_dir = 'temp'
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f'camera_{int(time.time())}.jpg')
        
        with open(temp_path, 'wb') as f:
            f.write(image_bytes)
        
        result = detect_devices_from_image(temp_path)
        
        if result['success']:
            if result.get('result_image_path'):
                result['result_image_url'] = '/detection_results/' + os.path.basename(result['result_image_path'])
            if result.get('original_image_path'):
                result['original_image_url'] = '/uploads/' + os.path.basename(result['original_image_path'])
        
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Camera detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Error processing camera image: {str(e)}"
        }), 500

@detection_bp.route('/detect/test', methods=['GET'])
def test_detection():
    return jsonify({
        "success": True,
        "message": "Detection API is working",
        "endpoints": {
            "POST /api/detect": "Upload image file for detection",
            "POST /api/detect/camera": "Send base64 image data for detection",
            "GET /api/detect/test": "Test endpoint"
        },
        "model_status": "Ready" if os.path.exists(DEVICE_MODEL_PATH) else "Model not found"
    })