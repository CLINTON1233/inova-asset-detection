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
from config import SERIAL_MODEL_PATH, RESULT_FOLDER

serial_bp = Blueprint('serial', __name__, url_prefix='/api/serial')

# Global variables
serial_model = None
serial_reader = easyocr.Reader(["en"], gpu=False)

def init_serial_detector():
    """Initialize YOLO model for serial number detection"""
    global serial_model
    if serial_model is None:
        print(f"Loading Serial Number YOLO model from: {SERIAL_MODEL_PATH}")
        serial_model = YOLO(SERIAL_MODEL_PATH)
        print("Serial Number YOLO model loaded successfully")
    return serial_model

def extract_serial_fast(image_path, bbox):
    """Extract serial number text from detected region using OCR"""
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
        results = serial_reader.readtext(thresh, detail=0)
        text = " ".join(results)
        
        # Clean text 
        cleaned = re.sub(r'[^A-Za-z0-9]', '', text)
        
        return cleaned if len(cleaned) >= 6 else ""
        
    except Exception as e:
        print(f"Extraction error: {e}")
        return ""

def detect_serial_numbers_from_image(image_path, device_bboxes=None):
    """Detect serial numbers from image using YOLO model"""
    try:
        model = init_serial_detector()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        result_name = f"serial_{timestamp}_{unique_id}"
        
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
        result_image_path = None
        
        if os.path.exists(result_dir):
            files = [f for f in os.listdir(result_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
            if files:
                result_image_path = os.path.join(result_dir, files[0])
        
        serial_detections = []
        
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                extracted_text = extract_serial_fast(image_path, bbox)
                is_valid = len(extracted_text) >= 6
                
                serial_detections.append({
                    "type": cls_name,
                    "confidence": round(confidence, 3),
                    "bbox": bbox,
                    "detected_text": extracted_text,
                    "is_valid": is_valid
                })
        
        return {
            "success": True,
            "serial_detections": serial_detections,
            "result_image_path": result_image_path,
            "total_detected": len(serial_detections),
            "valid_serials": len([s for s in serial_detections if s["is_valid"]]),
            "best_serial": serial_detections[0] if serial_detections else None,
            "message": f"Found {len([s for s in serial_detections if s['is_valid']])} serial numbers"
        }
        
    except Exception as e:
        print(f"Serial detection error: {e}")
        return {
            "success": False,
            "serial_detections": [],
            "error": str(e),
            "message": "Failed to detect serial numbers"
        }

def save_temp_image(file_or_bytes, prefix):
    """Save temporary image and return path"""
    temp_dir = 'temp'
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f'{prefix}_{int(time.time())}.jpg')
    
    if isinstance(file_or_bytes, str): 
        if ',' in file_or_bytes:
            file_or_bytes = file_or_bytes.split(',')[1]
        with open(temp_path, 'wb') as f:
            f.write(base64.b64decode(file_or_bytes))
    else:  # file object
        file_or_bytes.save(temp_path)
    
    return temp_path

# ==================== ROUTES ====================
@serial_bp.route('/detect', methods=['POST'])
def detect_serials():
    """Detect serial numbers from uploaded image"""
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"success": False, "message": "No selected file"}), 400
        
        temp_path = save_temp_image(file, 'serial')
        result = detect_serial_numbers_from_image(temp_path)
        
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Serial detection error: {e}")
        return jsonify({"success": False, "message": f"Error processing serial image: {str(e)}"}), 500

@serial_bp.route('/detect/camera', methods=['POST'])
def detect_serials_from_camera():
    """Detect serial numbers from camera image"""
    try:
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data provided"}), 400
        
        temp_path = save_temp_image(data['image_data'], 'serial_camera')
        result = detect_serial_numbers_from_image(temp_path)
        
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Camera serial detection error: {e}")
        return jsonify({"success": False, "message": f"Error processing camera serial image: {str(e)}"}), 500

@serial_bp.route('/assign/<device_id>', methods=['POST'])
def assign_serial_to_device(device_id):
    """Assign serial number to device"""
    try:
        data = request.get_json()
        
        if not data or 'device_id' not in data or 'serial_number' not in data:
            return jsonify({
                "success": False,
                "message": "device_id and serial_number are required"
            }), 400
        
        if str(data['device_id']) != str(device_id):
            return jsonify({
                "success": False,
                "message": "Device ID mismatch"
            }), 400
        
        return jsonify({
            "success": True,
            "message": f"Serial number assigned to device {data['device_id']}",
            "device_id": data['device_id'],
            "serial_number": data['serial_number']
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500