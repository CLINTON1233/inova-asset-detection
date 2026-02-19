from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
import re
from utils.serial_detector import extract_serial_fast

ocr_bp = Blueprint('ocr', __name__, url_prefix='/api/ocr')

@ocr_bp.route('/extract-serial', methods=['POST'])
def extract_serial_advanced():
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
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({
                "success": False,
                "message": "Failed to decode image"
            }), 400
        
        temp_path = "temp_serial.jpg"
        cv2.imwrite(temp_path, img)
        
        h, w = img.shape[:2]
        bbox = [0, 0, w, h]
        
        extracted_text = extract_serial_fast(temp_path, bbox)
        
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify({
            "success": True,
            "extracted_serial": extracted_text,
            "is_valid": len(extracted_text) >= 6
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@ocr_bp.route('/validate-serial', methods=['POST'])
def validate_serial():
    try:
        data = request.get_json()
        serial_text = data.get('serial_text', '')
        
        cleaned = re.sub(r'[^A-Za-z0-9]', '', serial_text)
        
        if len(cleaned) >= 6:
            return jsonify({
                "success": True,
                "validated_serial": cleaned,
                "original_text": serial_text
            })
        
        return jsonify({
            "success": False,
            "message": "Serial number too short"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500