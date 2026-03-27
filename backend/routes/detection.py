from flask import Blueprint, request, jsonify
import os
import cv2
import numpy as np
import base64
import time
import uuid
import re
from datetime import datetime
from werkzeug.utils import secure_filename
from ultralytics import YOLO
import easyocr
from config import (
    UPLOAD_FOLDER, ALLOWED_EXTENSIONS, DEVICE_MODEL_PATH, MATERIAL_MODEL_PATH,
    RESULT_FOLDER, DEVICE_CATEGORIES
)

detection_bp = Blueprint('detection', __name__, url_prefix='/api')

# Global variables
device_model = None
material_model = None
reader = easyocr.Reader(["en"], gpu=False)

# BRANDS list
BRANDS = [
    "hp", "dell", "lenovo", "asus", "acer", "samsung", "lg", 
    "philips", "viewsonic", "sony", "benq", "huawei", "msi",
    "logitech", "microsoft", "apple", "cisco", "tp-link",
    "d-link", "canon", "epson", "brother", "toshiba", "fujitsu",
    "ibm", "hitachi", "panasonic", "sharp", "nec", "compaq"
]

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_device_detector():
    global device_model
    if device_model is None:
        print(f"Loading Device YOLO model from: {DEVICE_MODEL_PATH}")
        device_model = YOLO(DEVICE_MODEL_PATH)
        print("Device YOLO model loaded successfully")
    return device_model

def init_material_detector():
    global material_model
    if material_model is None:
        print(f"Loading Material YOLO model from: {MATERIAL_MODEL_PATH}")
        material_model = YOLO(MATERIAL_MODEL_PATH)
        print("Material YOLO model loaded successfully")
    return material_model

def preprocess_for_ocr(img):
    """Preprocess image for better OCR results"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    gray = cv2.equalizeHist(gray)
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharp = cv2.filter2D(gray, -1, kernel)
    th = cv2.adaptiveThreshold(sharp, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    return cv2.medianBlur(th, 3)

def detect_brand_from_image(image_path, bbox, cls_name=""):
    """Detect brand from image region using OCR"""
    try:
        x1, y1, x2, y2 = map(int, bbox)
        img = cv2.imread(image_path)
        if img is None:
            return "Unknown"

        h, w = img.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        if x2 <= x1 or y2 <= y1:
            return "Unknown"

        crop = img[y1:y2, x1:x2]
        if crop.size == 0:
            return "Unknown"

        if cls_name.lower() == "monitor" and crop.shape[0] > 0 and crop.shape[1] > 0:
            crop = crop[int(crop.shape[0] * 0.50):crop.shape[0], :]
            crop = cv2.copyMakeBorder(crop, 10, 10, 20, 20, cv2.BORDER_CONSTANT, value=[0, 0, 0])

        processed = preprocess_for_ocr(crop)
        result = reader.readtext(processed, detail=0)
        text = "".join(result).lower().replace(" ", "")
        
        if not text:
            return "Unknown"

        for b in BRANDS:
            if b in text:
                return b.capitalize()
        
        for b in BRANDS:
            if any(b.startswith(t[:3]) for t in text.split() if len(t) >= 3):
                return b.capitalize()
        
        return "Unknown"
    except Exception as e:
        print(f"Error in brand detection: {e}")
        return "Unknown"

def detect_devices_from_image(image_path):
    """Detect devices from image using YOLO model"""
    try:
        model = init_device_detector()
        os.makedirs(RESULT_FOLDER, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        result_name = f"device_{timestamp}_{unique_id}"
        
        results = model.predict(
            source=image_path, save=True, project=RESULT_FOLDER,
            name=result_name, exist_ok=True, conf=0.25, imgsz=640
        )
        
        result_dir = os.path.join(RESULT_FOLDER, result_name)
        result_image_path = next((os.path.join(result_dir, f) for f in os.listdir(result_dir) 
                                 if f.endswith(('.jpg', '.jpeg', '.png'))), None) if os.path.exists(result_dir) else None
        
        detected_items = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                category = DEVICE_CATEGORIES.get(cls_name.lower(), "Other")
                brand = detect_brand_from_image(r.path, bbox, cls_name)
                device_id = f"{cls_name.upper()[:3]}-{unique_id}-{len(detected_items)+1:03d}"
                
                detected_items.append({
                    "id": device_id, "asset_type": cls_name.capitalize(),
                    "category": category, "brand": brand if brand != "Unknown" else "N/A",
                    "confidence": round(confidence, 3), "serial_number": "",
                    "bbox": bbox, "location": "", "timestamp": timestamp,
                    "status": "device_detected", "needs_serial_scan": True
                })
        
        return {
            "success": True, "detected_items": detected_items,
            "result_image_path": result_image_path, "original_image_path": image_path,
            "total_detected": len(detected_items),
            "message": f"Berhasil mendeteksi {len(detected_items)} perangkat"
        }
    except Exception as e:
        print(f"Detection error: {e}")
        return {"success": False, "detected_items": [], "error": str(e), "message": "Gagal melakukan deteksi perangkat"}

def detect_materials_from_image(image_path):
    """Detect materials from image using YOLO model"""
    try:
        model = init_material_detector()
        os.makedirs(RESULT_FOLDER, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        result_name = f"material_{timestamp}_{unique_id}"
        
        results = model.predict(
            source=image_path, save=True, project=RESULT_FOLDER,
            name=result_name, exist_ok=True, conf=0.25, imgsz=640
        )
        
        result_dir = os.path.join(RESULT_FOLDER, result_name)
        result_image_path = next((os.path.join(result_dir, f) for f in os.listdir(result_dir) 
                                 if f.endswith(('.jpg', '.jpeg', '.png'))), None) if os.path.exists(result_dir) else None
        
        detected_items = []
        for r in results:
            if r.boxes:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    cls_name = model.names[cls_id]
                    confidence = float(box.conf[0])
                    bbox = box.xyxy[0].tolist()
                    
                    material_id = f"MAT-{unique_id}-{len(detected_items)+1:03d}"
                    detected_items.append({
                        "id": material_id, "asset_type": cls_name,
                        "category": "Material", "confidence": round(confidence, 3),
                        "brand": "", "vendor": "", "uom": "PCS",
                        "scan_code": "", "bbox": bbox, "location": "",
                        "timestamp": timestamp, "status": "material_detected",
                        "needs_scan_code": True
                    })
        
        return {
            "success": True, "detected_items": detected_items,
            "result_image_path": result_image_path, "original_image_path": image_path,
            "total_detected": len(detected_items),
            "message": f"Berhasil mendeteksi {len(detected_items)} material"
        }
    except Exception as e:
        print(f"Material detection error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "detected_items": [], "error": str(e), "message": "Gagal melakukan deteksi material"}

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
    else:
        file_or_bytes.save(temp_path)
    
    return temp_path

# ==================== DEVICE DETECTION ROUTES ====================
@detection_bp.route('/detect', methods=['POST'])
def detect_devices():
    """Detect devices from uploaded image"""
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"success": False, "message": "No selected file"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"success": False, "message": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
        
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
        return jsonify({"success": False, "message": f"Error processing image: {str(e)}"}), 500

@detection_bp.route('/detect/camera', methods=['POST'])
def detect_from_camera():
    """Detect devices from camera image"""
    try:
        data = request.get_json()
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data provided"}), 400
        
        temp_path = save_temp_image(data['image_data'], 'camera')
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
        return jsonify({"success": False, "message": f"Error processing camera image: {str(e)}"}), 500

# ==================== MATERIAL DETECTION ROUTES ====================
@detection_bp.route('/detect/material/camera', methods=['POST'])
def detect_materials_from_camera():
    """Detect materials from camera image"""
    try:
        data = request.get_json()
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data provided"}), 400
        
        temp_path = save_temp_image(data['image_data'], 'material_camera')
        result = detect_materials_from_image(temp_path)
        
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Camera material detection error: {e}")
        return jsonify({"success": False, "message": f"Error processing camera material image: {str(e)}"}), 500

# ==================== TEST ROUTE ====================
@detection_bp.route('/detect/test', methods=['GET'])
def test_detection():
    """Test endpoint for detection API"""
    return jsonify({
        "success": True,
        "message": "Detection API is working",
        "endpoints": {
            "POST /api/detect": "Upload image file for device detection",
            "POST /api/detect/camera": "Send base64 image data for device detection",
            "POST /api/detect/material/camera": "Send base64 image data for material detection",
            "GET /api/detect/test": "Test endpoint"
        },
        "device_model_status": "Ready" if os.path.exists(DEVICE_MODEL_PATH) else "Model not found",
        "material_model_status": "Ready" if os.path.exists(MATERIAL_MODEL_PATH) else "Model not found"
    })