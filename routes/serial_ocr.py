from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
import os
import time
import re
from utils.save_results import save_serial_result
from utils.serial_detector import (
    enhance_image_for_ocr, 
    extract_serial_with_multiple_techniques
)

ocr_bp = Blueprint('ocr', __name__, url_prefix='/api/ocr')

@ocr_bp.route('/extract-serial', methods=['POST'])
def extract_serial_advanced():
    try:
        data = request.get_json()
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data"}), 400
        
        img_data = data['image_data'].split(',')[1] if ',' in data['image_data'] else data['image_data']
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"success": False, "message": "Failed to decode image"}), 400
        
        cv2.imwrite("temp_serial.jpg", img)
        h, w = img.shape[:2]
        
        result = extract_serial_with_multiple_techniques("temp_serial.jpg", [0, 0, w, h])
        
        # ANVIZ pattern matching
        if result["text"]:
            match = re.search(r'(\d{16})', result["text"])
            if match:
                result["text"] = match.group(1)
        
        enhanced = enhance_image_for_ocr(img)
        _, enhanced_buffer = cv2.imencode('.jpg', enhanced)
        enhanced_base64 = base64.b64encode(enhanced_buffer).decode('utf-8')
        
        return jsonify({
            "success": True,
            "extracted_serial": result["text"],
            "confidence": result["confidence"],
            "method": result["method"],
            "enhanced_image": f"data:image/jpeg;base64,{enhanced_base64}",
            "debug_info": {"image_size": f"{w}x{h}", "text_length": len(result["text"]) if result["text"] else 0}
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@ocr_bp.route('/scan-serial', methods=['POST'])
def scan_serial_smart():
    """Smart serial scanning dengan auto-detection"""
    try:
        data = request.get_json()
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data"}), 400
        
        # Decode image
        img_data = data['image_data'].split(',')[1] if ',' in data['image_data'] else data['image_data']
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"success": False, "message": "Failed to decode image"}), 400
        
        # Simpan original image untuk results
        img_original = img.copy()
        
        # Save temporary
        temp_path = f"temp_scan_{int(time.time())}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        # Gunakan deteksi cerdas
        result = detect_serial_fast(temp_path, conf_threshold=0.15)
        
        # Simpan hasil jika berhasil dan ada serial terdeteksi
        if result.get("success") and result.get("total_found", 0) > 0:
            save_serial_result(img_original, result, "serial")
        
        # Enhanced image untuk preview
        enhanced = enhance_image_for_ocr(img)
        _, enhanced_buffer = cv2.imencode('.jpg', enhanced)
        enhanced_base64 = base64.b64encode(enhanced_buffer).decode('utf-8')
        
        # Draw bounding boxes pada image asli untuk visualisasi
        if result.get("detections"):
            for detection in result["detections"][:3]:  # Ambil 3 terbaik
                bbox = detection.get("bbox", [])
                if bbox and len(bbox) >= 4:
                    x1, y1, x2, y2 = map(int, bbox[:4])
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(img, f"SN: {detection.get('text', '')[:10]}...", 
                              (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        _, result_buffer = cv2.imencode('.jpg', img)
        result_base64 = base64.b64encode(result_buffer).decode('utf-8')
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify({
            "success": result.get("success", False),
            "best_serial": result.get("best_serial", ""),
            "detections": result.get("detections", []),
            "message": result.get("message", ""),
            "strategy": result.get("strategy", ""),
            "enhanced_image": f"data:image/jpeg;base64,{enhanced_base64}",
            "result_image": f"data:image/jpeg;base64,{result_base64}",
            "debug": {
                "image_size": f"{img.shape[1]}x{img.shape[0]}",
                "detection_count": len(result.get("detections", []))
            }
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@ocr_bp.route('/validate-serial', methods=['POST'])
def validate_serial():
    try:
        data = request.get_json()
        serial_text = data.get('serial_text', '')
        
        patterns = [
            r'(\d{16})',
            r'SN[\s:]*(\d{15,20})',
            r'(\d{10,20})',
        ]
        
        validated_serials = []
        for pattern in patterns:
            matches = re.findall(pattern, serial_text)
            for match in matches:
                if len(match) >= 10:
                    validated_serials.append(match)
        
        if validated_serials:
            best_serial = max(validated_serials, key=len)
            return jsonify({
                "success": True,
                "validated_serial": best_serial,
                "original_text": serial_text,
                "found_patterns": validated_serials
            })
        
        return jsonify({"success": False, "message": "No valid serial number pattern found"})
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500