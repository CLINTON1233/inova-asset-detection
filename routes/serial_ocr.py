from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
import re
from utils.serial_detector import (
    enhance_image_for_ocr, 
    clean_serial_text,
    extract_serial_with_multiple_techniques
)

ocr_bp = Blueprint('ocr', __name__, url_prefix='/api/ocr')

@ocr_bp.route('/extract-serial', methods=['POST'])
def extract_serial_advanced():
    """Endpoint khusus untuk ekstraksi serial number dengan teknik advanced"""
    try:
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({
                "success": False,
                "message": "No image data provided"
            }), 400
        
        # Decode base64
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
        
        # Simpan temporary image
        temp_path = "temp_serial.jpg"
        cv2.imwrite(temp_path, img)
        
        # Gunakan seluruh image sebagai ROI (untuk testing)
        h, w = img.shape[:2]
        bbox = [0, 0, w, h]
        
        # Ekstrak dengan teknik advanced
        result = extract_serial_with_multiple_techniques(temp_path, bbox)
        
        # Tambahkan preprocessing visual untuk debugging
        enhanced = enhance_image_for_ocr(img)
        
        # Encode enhanced image untuk preview
        _, enhanced_buffer = cv2.imencode('.jpg', enhanced)
        enhanced_base64 = base64.b64encode(enhanced_buffer).decode('utf-8')
        
        # Pattern matching khusus untuk ANVIZ
        if result["text"]:
            # Coba ekstrak angka 16-digit untuk ANVIZ
            anviz_pattern = r'(\d{16})'
            match = re.search(anviz_pattern, result["text"])
            if match:
                result["text"] = match.group(1)
        
        return jsonify({
            "success": True,
            "extracted_serial": result["text"],
            "confidence": result["confidence"],
            "method": result["method"],
            "enhanced_image": f"data:image/jpeg;base64,{enhanced_base64}",
            "debug_info": {
                "image_size": f"{w}x{h}",
                "text_length": len(result["text"]) if result["text"] else 0
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@ocr_bp.route('/validate-serial', methods=['POST'])
def validate_serial():
    """Validasi dan format serial number"""
    try:
        data = request.get_json()
        serial_text = data.get('serial_text', '')
        patterns = [
            r'(\d{16})',
            # Pattern dengan SN: prefix
            r'SN[\s:]*(\d{15,20})',
            # Umum: serial number panjang
            r'(\d{10,20})',
        ]
        
        validated_serials = []
        
        for pattern in patterns:
            matches = re.findall(pattern, serial_text)
            for match in matches:
                if len(match) >= 10:
                    validated_serials.append(match)
        
        # Ambil yang terpanjang 
        if validated_serials:
            best_serial = max(validated_serials, key=len)
            return jsonify({
                "success": True,
                "validated_serial": best_serial,
                "original_text": serial_text,
                "found_patterns": validated_serials
            })
        
        return jsonify({
            "success": False,
            "message": "No valid serial number pattern found"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500