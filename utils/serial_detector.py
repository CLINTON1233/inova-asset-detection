import os
import cv2
import re
import uuid
from datetime import datetime
from ultralytics import YOLO
from config import SERIAL_MODEL_PATH
import torch

# Global cache
serial_model = None
BRANDS = ["DELL", "HP", "LENOVO", "ASUS", "ACER", "SAMSUNG", "ANVIZ", 
          "LOGITECH", "RAZER", "MICROSOFT", "APPLE"]

def init_model():
    """Inisialisasi model YOLO"""
    global serial_model
    if serial_model is None:
        try:
            print(f" Loading model: {SERIAL_MODEL_PATH}")
            serial_model = YOLO(SERIAL_MODEL_PATH)
            serial_model.fuse()
            print(" Model loaded")
        except Exception as e:
            print(f" Failed to load model: {e}")
            raise
    return serial_model

def enhance_image(img):
    """Enhancement cepat untuk OCR"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return cv2.medianBlur(thresh, 3)

def clean_text(text):
    """Pembersihan teks serial"""
    if not text: return ""
    
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
            longest = max(matches, key=len)
            cleaned = re.sub(r'[^A-Z0-9\-]', '', longest.upper())
            if len(cleaned) >= 8: return cleaned
    
    cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
    return cleaned if len(cleaned) >= 8 else ""
def detect_serial_fast(image_path, conf_threshold=0.15):
    """Deteksi serial number dengan fokus ke text detection"""
    try:
        model = init_model()
        img = cv2.imread(image_path)
        if img is None: 
            return {"success": False, "message": "Failed to read image"}

        h, w = img.shape[:2]
    
        if max(h, w) > 1000:
            # Crop area tengah
            center_h, center_w = h//2, w//2
            crop_h, crop_w = int(h * 0.7), int(w * 0.7)
            y1, y2 = max(0, center_h - crop_h//2), min(h, center_h + crop_h//2)
            x1, x2 = max(0, center_w - crop_w//2), min(w, center_w + crop_w//2)
            img = img[y1:y2, x1:x2]
        
        # 2. Enhance untuk text
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # 3. Save temporary dengan kualitas tinggi
        temp_path = f"temp_serial_{str(uuid.uuid4())[:8]}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        # 4. Inference dengan confidence rendah untuk text detection
        start = datetime.now()
        results = model.predict(
            source=temp_path,
            save=False,
            conf=conf_threshold,  # Rendah untuk text detection
            imgsz=640,
            augment=True,  # Aktifkan augmentasi untuk text
            max_det=10,    # Cari lebih banyak deteksi
            verbose=False,
            device='cuda:0' if torch.cuda.is_available() else 'cpu'
        )
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        # 5. Parse results dengan fokus text
        detections = []
        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                # Extract serial dari bbox
                extraction = extract_serial(image_path, bbox)
                
                # Filter berdasarkan text length dan pattern
                text = extraction.get("text", "")
                if text and len(text) >= 6:
                    # Cek jika text terlihat seperti serial
                    # (kombinasi huruf dan angka)
                    has_digit = any(c.isdigit() for c in text)
                    has_letter = any(c.isalpha() for c in text)
                    
                    if has_digit and (has_letter or len(text) >= 8):
                        detections.append({
                            "text": text,
                            "confidence": round(conf, 3),
                            "extraction_confidence": extraction.get("confidence", 0.0),
                            "bbox": bbox,
                            "method": "text_detection",
                            "is_valid": True,
                            "preview_position": "center" if max(h, w) > 1000 else "full"
                        })
        
        # 6. Jika tidak ada deteksi, coba OCR langsung
        if not detections:
            # Try OCR langsung ke area yang diperkirakan
            h, w = img.shape[:2]
            areas_to_check = [
                [int(w*0.2), int(h*0.2), int(w*0.8), int(h*0.4)],  # Atas
                [int(w*0.2), int(h*0.6), int(w*0.8), int(h*0.8)],  # Bawah
                [int(w*0.1), int(h*0.3), int(w*0.9), int(h*0.7)],  # Tengah
            ]
            
            for area in areas_to_check:
                extraction = extract_serial(image_path, area)
                text = extraction.get("text", "")
                if text and len(text) >= 8:
                    detections.append({
                        "text": text,
                        "confidence": 0.5,
                        "extraction_confidence": extraction.get("confidence", 0.0),
                        "bbox": area,
                        "method": "area_ocr",
                        "is_valid": True,
                        "preview_position": "auto_detected"
                    })
                    break
        
        # 7. Sort dan return
        detections.sort(key=lambda x: (x["confidence"], x["extraction_confidence"]), reverse=True)
        
        best_serial = detections[0]["text"] if detections else ""
        
        return {
            "success": True if detections else False,
            "detections": detections,
            "best_serial": best_serial,
            "total_found": len(detections),
            "processing_time_ms": round((datetime.now()-start).total_seconds()*1000, 2),
            "message": f"Found {len(detections)} serial candidates" if detections else "No serial detected",
            "strategy": "text_focused" if max(h, w) > 1000 else "full_image"
        }
        
    except Exception as e:
        print(f"Fast serial detection error: {e}")
        return {
            "success": False,
            "detections": [],
            "error": str(e),
            "message": "Serial detection failed"
        }

def extract_brand(text):
    """Extract brand dari teks"""
    if not text: return ""
    
    text_upper = text.upper()
    for brand in BRANDS:
        if brand in text_upper:
            return brand
    
    patterns = [r'D[E3][L1][L1]?', r'HP', r'LEN[0O]V[0O]', r'ASUS?', r'ACER?', r'S[A4]MSUNG']
    for i, pattern in enumerate(patterns):
        if re.search(pattern, text_upper, re.IGNORECASE):
            return BRANDS[i] if i < len(BRANDS) else BRANDS[0]
    return ""

def extract_serial(image_path, bbox):
    """Ekstraksi serial cepat"""
    try:
        img = cv2.imread(image_path)
        if img is None: return {"text": "", "confidence": 0.0}
        
        x1, y1, x2, y2 = map(int, bbox)
        h, w = img.shape[:2]
        
        # Crop dengan margin
        margin = 10
        x1, y1 = max(0, x1-margin), max(0, y1-margin)
        x2, y2 = min(w, x2+margin), min(h, y2+margin)
        roi = img[y1:y2, x1:x2]
        
        if roi.size == 0: return {"text": "", "confidence": 0.0}
        
        # Resize jika kecil
        if roi.shape[1] < 200:
            roi = cv2.resize(roi, (400, int(400*roi.shape[0]/roi.shape[1])), 
                           interpolation=cv2.INTER_CUBIC)
        
        # OCR
        from utils.detector import ocr_reader
        enhanced = enhance_image(roi)
        
        try:
            results = ocr_reader.readtext(enhanced, detail=1, paragraph=False, width_ths=0.7, batch_size=4)
            
            best_text, best_conf, all_text = "", 0.0, ""
            for r in results:
                if len(r) >= 3:
                    text, conf = r[1], float(r[2])
                    all_text += text + " "
                    cleaned = clean_text(text)
                    if cleaned and len(cleaned) >= 6 and conf > best_conf:
                        best_text, best_conf = cleaned, conf
            
            if not best_text and all_text.strip():
                best_text, best_conf = clean_text(all_text), 0.7
            
            return {
                "text": best_text,
                "confidence": best_conf,
                "method": "fast_ocr",
                "brand": extract_brand(best_text),
                "raw_text": all_text.strip()
            }
            
        except Exception as e:
            print(f"OCR error: {e}")
            return {"text": "", "confidence": 0.0, "method": "error", "brand": "", "raw_text": ""}
            
    except Exception as e:
        print(f"Extraction error: {e}")
        return {"text": "", "confidence": 0.0, "method": f"error", "brand": "", "raw_text": ""}

def detect_serial_numbers(image_path, conf_threshold=0.3):
    """Deteksi serial number utama"""
    try:
        model = init_model()
        img = cv2.imread(image_path)
        if img is None: return {"success": False, "message": "Failed to read image"}
        
        # Resize untuk kecepatan
        h, w = img.shape[:2]
        if max(h, w) > 1280:
            scale = 1280 / max(h, w)
            img = cv2.resize(img, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_AREA)
        
        # Save temp
        temp_path = f"temp_serial_{str(uuid.uuid4())[:8]}.jpg"
        cv2.imwrite(temp_path, img)
        
        # Inference
        start = datetime.now()
        results = model.predict(
            source=temp_path,
            save=False,
            conf=conf_threshold,
            imgsz=640,
            augment=False,
            max_det=5,
            verbose=False,
            device='cuda:0' if torch.cuda.is_available() else 'cpu'
        )
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        # Parse results
        detections = []
        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                extraction = extract_serial(image_path, bbox)
                
                if extraction["text"] and extraction["confidence"] > 0.3:
                    detections.append({
                        "detected_text": extraction["text"],
                        "confidence": round(conf, 3),
                        "extraction_confidence": extraction["confidence"],
                        "bbox": bbox,
                        "method": extraction["method"],
                        "brand_info": extraction["brand"],
                        "raw_text": extraction.get("raw_text", ""),
                        "is_valid": len(extraction["text"]) >= 6
                    })
        
        detections.sort(key=lambda x: x["confidence"], reverse=True)
        valid_count = len([d for d in detections if d["is_valid"]])
        
        return {
            "success": True,
            "serial_detections": detections,
            "total_detected": len(detections),
            "valid_serials": valid_count,
            "processing_time_ms": round((datetime.now()-start).total_seconds()*1000, 2),
            "message": f"Found {len(detections)} potential serials"
        }
        
    except Exception as e:
        print(f"Detection error: {e}")
        return {
            "success": False,
            "serial_detections": [],
            "error": str(e),
            "message": "Failed to detect serial numbers"
        }

# Legacy functions untuk kompatibilitas
def detect_serial_numbers_from_image(image_path, device_bboxes=None):
    return detect_serial_numbers(image_path, conf_threshold=0.25)

def enhance_image_for_ocr(image):
    return enhance_image(image)

def clean_serial_text(text):
    return clean_text(text)

def extract_serial_with_multiple_techniques(image_path, bbox):
    return extract_serial(image_path, bbox)

# Debug function
def debug_serial_detection(image_path):
    print(f"🔍 Debugging: {image_path}")
    if not os.path.exists(image_path):
        print(f"❌ File not found")
        return
    
    img = cv2.imread(image_path)
    if img is None:
        print("❌ Failed to read image")
        return
    
    print(f"✅ Image: {img.shape}")
    result = detect_serial_numbers(image_path)
    print(f"📊 Result: {result}")
    return result