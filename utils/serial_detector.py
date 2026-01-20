# utils/serial_detector.py
import os
import cv2
import numpy as np
import uuid
from datetime import datetime
from ultralytics import YOLO
from config import SERIAL_MODEL_PATH, UPLOAD_FOLDER, RESULT_FOLDER
import easyocr

# Inisialisasi model YOLO untuk serial
serial_model = None
serial_reader = easyocr.Reader(["en"], gpu=False)

def init_serial_detector():
    """Inisialisasi model YOLO untuk serial number"""
    global serial_model
    if serial_model is None:
        try:
            print(f" Loading Serial Number YOLO model from: {SERIAL_MODEL_PATH}")
            serial_model = YOLO(SERIAL_MODEL_PATH)
            print(" Serial Number YOLO model loaded successfully")
        except Exception as e:
            print(f" Failed to load Serial Number YOLO model: {e}")
            raise
    return serial_model

def preprocess_for_serial_ocr(img):
    """Preprocess khusus untuk OCR serial number"""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    # Kontras tinggi untuk teks kecil
    gray = cv2.equalizeHist(gray)
    
    # Binarization dengan threshold adaptif
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    # Denoising
    denoised = cv2.medianBlur(binary, 3)
    
    # Dilasi untuk mempertebal teks
    kernel = np.ones((1, 1), np.uint8)
    dilated = cv2.dilate(denoised, kernel, iterations=1)
    
    return dilated

def extract_serial_number_from_roi(image_path, bbox):
    """Ekstrak serial number dari ROI menggunakan OCR"""
    try:
        x1, y1, x2, y2 = map(int, bbox)
        img = cv2.imread(image_path)
        
        if img is None:
            return "Not detected"
        
        # Pastikan koordinat valid
        height, width = img.shape[:2]
        x1 = max(0, x1 - 10) 
        y1 = max(0, y1 - 10)
        x2 = min(width, x2 + 10)
        y2 = min(height, y2 + 10)
        
        if x2 <= x1 or y2 <= y1:
            return "Not detected"
        
        # Crop ROI
        roi = img[y1:y2, x1:x2]
        
        if roi.size == 0:
            return "Not detected"
        
        # Preprocess untuk OCR
        processed_roi = preprocess_for_serial_ocr(roi)
        
        # OCR dengan konfigurasi khusus untuk serial number
        result = serial_reader.readtext(
            processed_roi, 
            detail=0,
            paragraph=True,
            width_ths=0.5,
            height_ths=0.5
        )
        
        if not result:
            return "Not detected"
        
        # Gabungkan semua teks yang terdeteksi
        detected_text = " ".join(result).strip()
        
        import re
        cleaned_text = re.sub(r'[^A-Za-z0-9\- ]', '', detected_text)
        
        # Jika terlalu pendek, mungkin bukan serial number
        if len(cleaned_text) < 3:
            return "Not detected"
        
        return cleaned_text
        
    except Exception as e:
        print(f"Error extracting serial number: {e}")
        return "Not detected"

def detect_serial_numbers_from_image(image_path, device_bboxes=None):
    """Deteksi serial numbers dari gambar"""
    try:
        # Inisialisasi model
        model = init_serial_detector()
        
        # Generate unique name untuk hasil
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        result_name = f"serial_{timestamp}_{unique_id}"
        
        # Lakukan prediksi
        results = model.predict(
            source=image_path,
            save=True,
            project=RESULT_FOLDER,
            name=result_name,
            exist_ok=True,
            conf=0.3,  # Confidence threshold lebih rendah untuk serial
            imgsz=640
        )
        
        # Path hasil gambar
        result_dir = os.path.join(RESULT_FOLDER, result_name)
        result_image_path = None
        
        if os.path.exists(result_dir):
            files = [f for f in os.listdir(result_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
            if files:
                result_image_path = os.path.join(result_dir, files[0])
        
        # Parse hasil deteksi serial
        serial_detections = []
        
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                # Ekstrak teks serial number dari ROI
                serial_text = extract_serial_number_from_roi(image_path, bbox)
                
                serial_detections.append({
                    "type": cls_name,
                    "confidence": round(confidence, 3),
                    "bbox": bbox,
                    "detected_text": serial_text,
                    "is_valid": serial_text != "Not detected" and len(serial_text) >= 3
                })
        
        return {
            "success": True,
            "serial_detections": serial_detections,
            "result_image_path": result_image_path,
            "total_detected": len(serial_detections),
            "valid_serials": len([s for s in serial_detections if s["is_valid"]]),
            "message": f"Found {len(serial_detections)} potential serial numbers"
        }
        
    except Exception as e:
        print(f"Serial detection error: {e}")
        return {
            "success": False,
            "serial_detections": [],
            "error": str(e),
            "message": "Failed to detect serial numbers"
        }