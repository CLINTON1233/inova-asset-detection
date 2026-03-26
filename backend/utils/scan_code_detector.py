import os
import cv2
import numpy as np
import re
import uuid
from datetime import datetime
from ultralytics import YOLO
from config import SCAN_CODE_MODEL_PATH, RESULT_FOLDER
import easyocr

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
    global scan_code_model
    if scan_code_model is None:
        print(f"Loading Scan Code YOLO model from: {SCAN_CODE_MODEL_PATH}")
        scan_code_model = YOLO(SCAN_CODE_MODEL_PATH)
        print("Scan Code YOLO model loaded successfully")
    return scan_code_model

def extract_scan_code_from_image(image_path, bbox):
    """Extract scan code text from detected region"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return ""
        
        x1, y1, x2, y2 = map(int, bbox)
        margin = 10
        h, w = img.shape[:2]
        x1 = max(0, x1 - margin)
        y1 = max(0, y1 - margin)
        x2 = min(w, x2 + margin)
        y2 = min(h, y2 + margin)
        
        roi = img[y1:y2, x1:x2]
        
        if roi.size == 0:
            return ""
        
        # Preprocess for better OCR
        if len(roi.shape) == 3:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = roi
        
        # Apply threshold
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # OCR
        results = scan_code_reader.readtext(thresh, detail=0)
        text = " ".join(results).upper().strip()
        
        # Clean text - keep alphanumeric and hyphens
        cleaned = re.sub(r'[^A-Z0-9-]', '', text)
        
        return cleaned
        
    except Exception as e:
        print(f"Scan code extraction error: {e}")
        return ""

def validate_scan_code(scan_code, material_name):
    """Validate scan code against material format"""
    if material_name not in MATERIAL_CODES:
        return False, "Unknown material"
    
    material_info = MATERIAL_CODES[material_name]
    expected_prefix = material_info["prefix"]
    
    # Check if scan code starts with expected prefix
    if scan_code.startswith(expected_prefix):
        return True, "Valid scan code"
    
    # Check if it matches the pattern with suffix
    pattern = f"{expected_prefix}-\\d{{4}}"
    if re.match(pattern, scan_code):
        return True, "Valid scan code"
    
    return False, f"Invalid scan code format. Expected: {expected_prefix}-XXXX"

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
        result_image_path = None
        
        if os.path.exists(result_dir):
            files = [f for f in os.listdir(result_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
            if files:
                result_image_path = os.path.join(result_dir, files[0])
        
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