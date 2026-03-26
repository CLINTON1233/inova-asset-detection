from flask import Blueprint, request, jsonify
import os
import base64
import time
from utils.scan_code_detector import detect_scan_codes_from_image

scan_code_bp = Blueprint('scan_code', __name__, url_prefix='/api/scan-code')

@scan_code_bp.route('/detect', methods=['POST'])
def detect_scan_codes():
    """Detect scan codes from uploaded image"""
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
        
        temp_dir = 'temp'
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f'scancode_{int(time.time())}.jpg')
        file.save(temp_path)
        
        result = detect_scan_codes_from_image(temp_path)
        
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Scan code detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Error processing scan code image: {str(e)}"
        }), 500

@scan_code_bp.route('/detect/camera', methods=['POST'])
def detect_scan_codes_from_camera():
    """Detect scan codes from camera image"""
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
        temp_path = os.path.join(temp_dir, f'scancode_camera_{int(time.time())}.jpg')
        
        with open(temp_path, 'wb') as f:
            f.write(image_bytes)
        
        result = detect_scan_codes_from_image(temp_path)
        
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Camera scan code detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Error processing camera scan code image: {str(e)}"
        }), 500

@scan_code_bp.route('/validate', methods=['POST'])
def validate_scan_code():
    """Validate a scan code against material formats"""
    try:
        data = request.get_json()
        scan_code = data.get('scan_code', '')
        material_name = data.get('material_name', '')
        
        from utils.scan_code_detector import validate_scan_code
        is_valid, message = validate_scan_code(scan_code, material_name)
        
        return jsonify({
            "success": True,
            "is_valid": is_valid,
            "message": message,
            "scan_code": scan_code
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500