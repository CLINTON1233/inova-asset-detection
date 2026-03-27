from flask import Blueprint, request, jsonify
import os
import cv2
import numpy as np
import re
import base64
import time
import uuid
from datetime import datetime
from ultralytics import YOLO
import easyocr
from config import SCAN_CODE_MODEL_PATH, RESULT_FOLDER

scan_code_bp = Blueprint('scan_code', __name__, url_prefix='/api/scan-code')

# Global variables
scan_code_model = None
scan_code_reader = easyocr.Reader(["en"], gpu=False)

# Mapping material ke kode dan scan code format
MATERIAL_CODES = {
    "Cable LAN": {"code": "CL", "prefix": "IT-MT-CL"},
    "Flexible": {"code": "FL", "prefix": "IT-MT-FL"},
    "FO (Fiber Optic)": {"code": "FO", "prefix": "IT-MT-FO"},
    "Trunking": {"code": "TR", "prefix": "IT-MT-TR"},
    "Pipa": {"code": "PP", "prefix": "IT-MT-PP"},
    "Klem": {"code": "KL", "prefix": "IT-MT-KL"},
    "Junction Box": {"code": "JB", "prefix": "IT-MT-JB"},
    "RJ45": {"code": "RJ", "prefix": "IT-MT-RJ"},
    "Modular Jack": {"code": "MJ", "prefix": "IT-MT-MJ"},
    "Kabel Ties": {"code": "KT", "prefix": "IT-MT-KT"},
    "Isolasi Rubber": {"code": "IR", "prefix": "IT-MT-IR"},
    "Elbow": {"code": "EL", "prefix": "IT-MT-EL"},
}

def init_scan_code_detector():
    """Initialize YOLO model for scan code detection"""
    global scan_code_model
    if scan_code_model is None:
        print(f"Loading Scan Code YOLO model from: {SCAN_CODE_MODEL_PATH}")
        scan_code_model = YOLO(SCAN_CODE_MODEL_PATH)
        print("Scan Code YOLO model loaded successfully")
    return scan_code_model

def extract_scan_code_from_image(image_path, bbox):
    """Extract scan code text from detected region using OCR"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return ""
        
        x1, y1, x2, y2 = map(int, bbox)
        margin = 10
        h, w = img.shape[:2]
        x1, y1 = max(0, x1 - margin), max(0, y1 - margin)
        x2, y2 = min(w, x2 + margin), min(h, y2 + margin)
        
        roi = img[y1:y2, x1:x2]
        if roi.size == 0:
            return ""
        
        # Preprocess for better OCR
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if len(roi.shape) == 3 else roi
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # OCR
        results = scan_code_reader.readtext(thresh, detail=0)
        text = " ".join(results).upper().strip()
        
        # Clean text - keep alphanumeric and hyphens
        return re.sub(r'[^A-Z0-9-]', '', text)
        
    except Exception as e:
        print(f"Scan code extraction error: {e}")
        return ""

def validate_scan_code(scan_code, material_name=None):
    """Validate scan code against material format"""
    if material_name and material_name not in MATERIAL_CODES:
        return False, "Unknown material"
    
    if material_name:
        expected_prefix = MATERIAL_CODES[material_name]["prefix"]
        if scan_code.startswith(expected_prefix):
            return True, "Valid scan code"
        pattern = f"{expected_prefix}-\\d{{4}}"
        if re.match(pattern, scan_code):
            return True, "Valid scan code"
        return False, f"Invalid scan code format. Expected: {expected_prefix}-XXXX"
    
    # Check against all materials if no specific material
    for name, info in MATERIAL_CODES.items():
        if scan_code.startswith(info["prefix"]):
            return True, f"Valid {name} scan code"
    return False, "Invalid scan code format"

def detect_scan_codes_from_image(image_path):
    """Detect scan codes from image using YOLO model"""
    try:
        model = init_scan_code_detector()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        result_name = f"scancode_{timestamp}_{unique_id}"
        
        results = model.predict(
            source=image_path,
            save=True,
            project=RESULT_FOLDER,
            name=result_name,
            exist_ok=True,
            conf=0.25,
            imgsz=640
        )
        
        result_dir = os.path.join(RESULT_FOLDER, result_name)
        result_image_path = next((os.path.join(result_dir, f) for f in os.listdir(result_dir) 
                                 if f.endswith(('.jpg', '.jpeg', '.png'))), None) if os.path.exists(result_dir) else None
        
        scan_code_detections = []
        
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                extracted_text = extract_scan_code_from_image(image_path, bbox)
                
                # Validate against material codes
                is_valid = False
                validation_message = ""
                matched_material = None
                
                for material_name, info in MATERIAL_CODES.items():
                    if extracted_text.startswith(info["prefix"]):
                        is_valid = True
                        matched_material = material_name
                        validation_message = f"Valid {material_name} scan code"
                        break
                
                if not is_valid and extracted_text:
                    validation_message = "Invalid scan code format"
                
                scan_code_detections.append({
                    "type": cls_name,
                    "confidence": round(confidence, 3),
                    "bbox": bbox,
                    "detected_text": extracted_text,
                    "is_valid": is_valid,
                    "matched_material": matched_material,
                    "validation_message": validation_message
                })
        
        return {
            "success": True,
            "scan_code_detections": scan_code_detections,
            "result_image_path": result_image_path,
            "total_detected": len(scan_code_detections),
            "valid_detections": len([s for s in scan_code_detections if s["is_valid"]]),
            "best_detection": scan_code_detections[0] if scan_code_detections else None,
            "message": f"Found {len(scan_code_detections)} scan code(s)"
        }
        
    except Exception as e:
        print(f"Scan code detection error: {e}")
        return {
            "success": False,
            "scan_code_detections": [],
            "error": str(e),
            "message": "Failed to detect scan codes"
        }

def save_temp_image(file_or_bytes, prefix):
    """Save temporary image and return path"""
    temp_dir = 'temp'
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f'{prefix}_{int(time.time())}.jpg')
    
    if isinstance(file_or_bytes, str):  # base64 string
        if ',' in file_or_bytes:
            file_or_bytes = file_or_bytes.split(',')[1]
        with open(temp_path, 'wb') as f:
            f.write(base64.b64decode(file_or_bytes))
    else:  # file object
        file_or_bytes.save(temp_path)
    
    return temp_path

# ==================== ROUTES ====================
@scan_code_bp.route('/detect', methods=['POST'])
def detect_scan_codes():
    """Detect scan codes from uploaded image"""
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"success": False, "message": "No selected file"}), 400
        
        temp_path = save_temp_image(file, 'scancode')
        result = detect_scan_codes_from_image(temp_path)
        
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Scan code detection error: {e}")
        return jsonify({"success": False, "message": f"Error processing scan code image: {str(e)}"}), 500

@scan_code_bp.route('/detect/camera', methods=['POST'])
def detect_scan_codes_from_camera():
    """Detect scan codes from camera image"""
    try:
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data provided"}), 400
        
        temp_path = save_temp_image(data['image_data'], 'scancode_camera')
        result = detect_scan_codes_from_image(temp_path)
        
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Camera scan code detection error: {e}")
        return jsonify({"success": False, "message": f"Error processing camera scan code image: {str(e)}"}), 500

@scan_code_bp.route('/validate', methods=['POST'])
def validate_scan_code_endpoint():
    """Validate a scan code against material formats"""
    try:
        data = request.get_json()
        scan_code = data.get('scan_code', '')
        material_name = data.get('material_name', '')
        
        is_valid, message = validate_scan_code(scan_code, material_name)
        
        return jsonify({
            "success": True,
            "is_valid": is_valid,
            "message": message,
            "scan_code": scan_code
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500