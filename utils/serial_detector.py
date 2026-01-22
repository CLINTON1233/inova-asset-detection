# utils/serial_detector.py - FIXED VERSION
import os
import cv2
import numpy as np
import re
import uuid
from datetime import datetime
from ultralytics import YOLO
from config import SERIAL_MODEL_PATH, RESULT_FOLDER
import torch

# Global variables
serial_model = None
ocr_cache = {}

def init_serial_detector():
    """Inisialisasi model serial sekali saja"""
    global serial_model
    if serial_model is None:
        try:
            print(f"🔠 Loading Serial Number YOLO model from: {SERIAL_MODEL_PATH}")
            serial_model = YOLO(SERIAL_MODEL_PATH)
            serial_model.fuse()  # Optimasi model
            print("✅ Serial Number YOLO model loaded and optimized")
        except Exception as e:
            print(f"❌ Failed to load Serial Number YOLO model: {e}")
            raise
    return serial_model

def detect_serial_numbers_from_image(image_path, device_bboxes=None):
    """Fungsi legacy untuk kompatibilitas dengan kode lama"""
    # Panggil fungsi baru yang sudah dioptimasi
    return detect_serial_numbers_fast(image_path, conf_threshold=0.25)

def enhance_image_for_ocr(image):
    """Fungsi legacy untuk kompatibilitas dengan serial_ocr.py"""
    return enhance_image_for_ocr_fast(image)

def clean_serial_text(text):
    """Fungsi legacy untuk kompatibilitas dengan serial_ocr.py"""
    return clean_serial_text_fast(text)

def extract_serial_with_multiple_techniques(image_path, bbox):
    """Fungsi legacy untuk kompatibilitas dengan serial_ocr.py"""
    return extract_serial_fast(image_path, bbox)

def extract_brand_from_text(text):
    """Extract brand dari teks serial"""
    if not text:
        return ""
    
    brands = ["DELL", "HP", "LENOVO", "ASUS", "ACER", "SAMSUNG", "ANVIZ", "LOGITECH", "RAZER", "MICROSOFT", "APPLE"]
    text_upper = text.upper()
    
    for brand in brands:
        if brand in text_upper:
            return brand
    
    # Coba pattern matching
    patterns = [
        r'D[E3][L1][L1]?',
        r'HP',
        r'LEN[0O]V[0O]',
        r'ASUS?',
        r'ACER?',
        r'S[A4]MSUNG'
    ]
    
    for i, pattern in enumerate(patterns):
        if re.search(pattern, text_upper, re.IGNORECASE):
            return brands[i] if i < len(brands) else brands[0]
    
    return ""

def enhance_image_for_ocr_fast(img):
    """Enhancement cepat untuk OCR"""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    # CLAHE untuk kontras
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Threshold cepat
    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Denoise sederhana
    denoised = cv2.medianBlur(thresh, 3)
    
    return denoised

def extract_serial_fast(image_path, bbox):
    """Ekstraksi serial cepat dengan teknik optimal"""
    try:
        # Baca gambar sekali
        img = cv2.imread(image_path)
        if img is None:
            return {"text": "", "confidence": 0.0}
        
        # Crop ROI
        x1, y1, x2, y2 = map(int, bbox)
        h, w = img.shape[:2]
        
        # Margin kecil
        margin = 10
        x1 = max(0, x1 - margin)
        y1 = max(0, y1 - margin)
        x2 = min(w, x2 + margin)
        y2 = min(h, y2 + margin)
        
        roi = img[y1:y2, x1:x2]
        
        if roi.size == 0:
            return {"text": "", "confidence": 0.0}
        
        # Resize jika terlalu kecil
        if roi.shape[1] < 200:
            roi = cv2.resize(roi, (400, int(400 * roi.shape[0] / roi.shape[1])), 
                           interpolation=cv2.INTER_CUBIC)
        
        # Enhancement cepat
        enhanced = enhance_image_for_ocr_fast(roi)
        
        # OCR dengan easyocr
        from utils.detector import ocr_reader
        
        try:
            # OCR dengan konfigurasi cepat
            results = ocr_reader.readtext(
                enhanced, 
                detail=1,
                paragraph=False,
                width_ths=0.7,
                batch_size=4
            )
            
            # Process results
            best_text = ""
            best_conf = 0.0
            all_text = ""
            
            for result in results:
                if len(result) >= 3:
                    text = result[1]
                    conf = float(result[2])
                    all_text += text + " "
                    
                    # Validasi sederhana
                    cleaned = clean_serial_text_fast(text)
                    if cleaned and len(cleaned) >= 6:
                        if conf > best_conf:
                            best_text = cleaned
                            best_conf = conf
            
            # Jika tidak ada hasil bagus, coba kombinasi
            if not best_text and all_text.strip():
                best_text = clean_serial_text_fast(all_text)
                best_conf = 0.7  # Confidence default
            
            # Extract brand
            extracted_brand = extract_brand_from_text(best_text)
            
            return {
                "text": best_text,
                "confidence": best_conf,
                "method": "fast_ocr",
                "brand": extracted_brand,
                "raw_text": all_text.strip()
            }
            
        except Exception as e:
            print(f"OCR error: {e}")
            return {
                "text": "", 
                "confidence": 0.0, 
                "method": "error",
                "brand": "",
                "raw_text": ""
            }
        
    except Exception as e:
        print(f"Extraction error: {e}")
        return {
            "text": "", 
            "confidence": 0.0, 
            "method": f"error: {str(e)}",
            "brand": "",
            "raw_text": ""
        }

def clean_serial_text_fast(text):
    """Pembersihan teks cepat"""
    if not text:
        return ""
    
    # Hapus spasi dan karakter khusus di awal/akhir
    text = text.strip()
    
    # Pattern matching cepat untuk serial umum
    patterns = [
        r'SN[:\-\s]*([A-Z0-9]{8,20})',
        r'S\/N[:\-\s]*([A-Z0-9]{8,20})',
        r'SERIAL[:\-\s]*([A-Z0-9]{8,20})',
        r'([A-Z]{2,4}[0-9]{8,12})',
        r'([0-9]{12,20})',
        r'([A-Z0-9\-]{10,25})'
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # Ambil yang terpanjang
            longest = max(matches, key=len)
            # Bersihkan karakter non-alfanumerik kecuali hyphen
            cleaned = re.sub(r'[^A-Z0-9\-]', '', longest.upper())
            if len(cleaned) >= 8:
                return cleaned
    
    # Fallback: hapus semua karakter non-alfanumerik
    cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
    
    # Validasi panjang minimum
    if len(cleaned) >= 8:
        return cleaned
    
    return ""

def detect_serial_numbers_fast(image_path, conf_threshold=0.3):
    """Deteksi serial number cepat - FIXED UUID ERROR"""
    try:
        # Inisialisasi model
        model = init_serial_detector()
        
        # Baca dan preprocess gambar
        img = cv2.imread(image_path)
        if img is None:
            return {"success": False, "message": "Failed to read image"}
        
        # Resize untuk kecepatan
        h, w = img.shape[:2]
        if max(h, w) > 1280:
            scale = 1280 / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), 
                           interpolation=cv2.INTER_AREA)
        
        # Save temp - FIX: Convert UUID to string first
        temp_uuid = str(uuid.uuid4())  # FIX DI SINI
        temp_path = f"temp_serial_{temp_uuid[:8]}.jpg"
        cv2.imwrite(temp_path, img)
        
        # Inference cepat
        start_time = datetime.now()
        
        results = model.predict(
            source=temp_path,
            save=False,
            conf=conf_threshold,
            imgsz=640,
            augment=False,
            max_det=5,  # Maksimal 5 deteksi
            verbose=False,
            device='cuda:0' if torch.cuda.is_available() else 'cpu'
        )
        
        # Hapus temp
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        inference_time = (datetime.now() - start_time).total_seconds()
        
        # Parse results
        serial_detections = []
        
        for r in results:
            for box in r.boxes:
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                # Extract serial
                extraction = extract_serial_fast(image_path, bbox)
                
                if extraction["text"] and extraction["confidence"] > 0.3:  # Lower threshold
                    serial_detections.append({
                        "detected_text": extraction["text"],
                        "confidence": round(confidence, 3),
                        "extraction_confidence": extraction["confidence"],
                        "bbox": bbox,
                        "method": extraction["method"],
                        "brand_info": extraction["brand"],
                        "raw_text": extraction.get("raw_text", ""),
                        "is_valid": len(extraction["text"]) >= 6  # Lower min length
                    })
        
        # Sort by confidence
        serial_detections.sort(key=lambda x: x["confidence"], reverse=True)
        
        return {
            "success": True,
            "serial_detections": serial_detections,
            "total_detected": len(serial_detections),
            "valid_serials": len([s for s in serial_detections if s["is_valid"]]),
            "processing_time_ms": round(inference_time * 1000, 2),
            "message": f"Found {len(serial_detections)} potential serials in {inference_time:.2f}s"
        }
        
    except Exception as e:
        print(f"Fast serial detection error: {e}")
        import traceback
        traceback.print_exc()  # Print full traceback untuk debugging
        return {
            "success": False,
            "serial_detections": [],
            "error": str(e),
            "message": "Failed to detect serial numbers"
        }

# Fungsi tambahan untuk debugging
def debug_serial_detection(image_path):
    """Fungsi debugging untuk serial detection"""
    print(f"🔍 Debugging serial detection for: {image_path}")
    
    # Cek file exists
    if not os.path.exists(image_path):
        print(f"❌ File not found: {image_path}")
        return
    
    # Cek bisa dibaca
    img = cv2.imread(image_path)
    if img is None:
        print("❌ Failed to read image")
        return
    
    print(f"✅ Image loaded: {img.shape}")
    
    # Test detection
    result = detect_serial_numbers_fast(image_path)
    print(f"📊 Result: {result}")
    
    return result