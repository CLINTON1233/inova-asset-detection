import os
import cv2
import numpy as np
import re
import uuid
from datetime import datetime
from ultralytics import YOLO
from config import SERIAL_MODEL_PATH, RESULT_FOLDER
import easyocr

# Inisialisasi model dan OCR reader
serial_model = None
serial_reader = easyocr.Reader(["en"], gpu=True)  

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

def enhance_image_for_ocr(image):
    """Enhance image quality untuk OCR dengan multiple techniques"""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # 1. CLAHE untuk meningkatkan kontras lokal
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # 2. Unsharp masking untuk sharpening
    gaussian = cv2.GaussianBlur(enhanced, (0, 0), 3.0)
    sharpened = cv2.addWeighted(enhanced, 1.5, gaussian, -0.5, 0)
    
    # 3. Bilateral filter untuk noise reduction
    denoised = cv2.bilateralFilter(sharpened, 9, 75, 75)
    
    # 4. Adaptive thresholding dengan multiple methods
    # Method 1: Adaptive Gaussian
    th1 = cv2.adaptiveThreshold(denoised, 255, 
                                cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                cv2.THRESH_BINARY, 11, 2)
    
    # Method 2: Otsu's thresholding
    _, th2 = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Combine kedua metode
    combined = cv2.bitwise_and(th1, th2)
    
    # 5. Morphological operations untuk menghaluskan teks
    kernel = np.ones((2, 2), np.uint8)
    morphed = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
    
    return morphed

def preprocess_serial_roi(image):
    """Preprocessing khusus untuk ROI serial number"""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Resize jika terlalu kecil
    height, width = gray.shape
    if width < 200:
        scale_factor = 400 / width
        new_width = int(width * scale_factor)
        new_height = int(height * scale_factor)
        gray = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
    
    # Apply multiple enhancement techniques
    enhanced_images = []
    
    # Technique 1: Standard enhancement
    img1 = enhance_image_for_ocr(gray)
    enhanced_images.append(img1)
    
    # Technique 2: Inverted image
    img2 = cv2.bitwise_not(img1)
    enhanced_images.append(img2)
    
    # Technique 3: Grayscale dengan brightness adjustment
    img3 = cv2.convertScaleAbs(gray, alpha=1.5, beta=50)
    enhanced_images.append(img3)
    
    return enhanced_images

def clean_serial_text(text):
    """Membersihkan dan memvalidasi teks serial number"""
    if not text:
        return ""
    
    # Hapus karakter yang tidak perlu
    cleaned = re.sub(r'[^A-Za-z0-9\-:/. ]', '', text)
    
    # Normalisasi spasi
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    # Pattern matching untuk serial number umum
    patterns = [
      
        r'SN[\s:]*(\d{15,20})',
        # Pattern umum: Serial Number: XXX
        r'Serial[\s_\-]*Number[\s:]*([A-Za-z0-9\-]{8,20})',
        # Pattern untuk angka panjang
        r'(\d{10,20})',
        # Pattern untuk kode campuran
        r'([A-Z]{2,5}[\s\-]*\d{8,15})',
    ]
    
    for pattern in patterns:
        matches = re.search(pattern, cleaned, re.IGNORECASE)
        if matches:
            return matches.group(1).strip()
    
    return cleaned

def extract_serial_with_multiple_techniques(image_path, bbox):
    """Ekstrak serial number menggunakan multiple OCR techniques"""
    try:
        # Baca gambar
        img = cv2.imread(image_path)
        if img is None:
            return {"text": "", "confidence": 0.0, "method": "none"}
        
        # Crop ROI dengan margin
        x1, y1, x2, y2 = map(int, bbox)
        h, w = img.shape[:2]
        
        # Tambah margin 20% di sekitar bounding box
        margin_x = int((x2 - x1) * 0.2)
        margin_y = int((y2 - y1) * 0.2)
        
        x1 = max(0, x1 - margin_x)
        y1 = max(0, y1 - margin_y)
        x2 = min(w, x2 + margin_x)
        y2 = min(h, y2 + margin_y)
        
        roi = img[y1:y2, x1:x2]
        
        if roi.size == 0:
            return {"text": "", "confidence": 0.0, "method": "empty_roi"}
        
        # Generate multiple enhanced versions
        enhanced_images = preprocess_serial_roi(roi)
        
        results = []
        
        # OCR dengan konfigurasi berbeda untuk setiap versi
        ocr_configs = [
            {"detail": 1, "paragraph": False, "width_ths": 0.7, "height_ths": 0.7},
            {"detail": 1, "paragraph": True, "width_ths": 1.0, "height_ths": 0.5},
            {"detail": 1, "paragraph": False, "width_ths": 0.5, "height_ths": 1.0},
        ]
        
        for idx, enhanced_img in enumerate(enhanced_images):
            for config in ocr_configs:
                try:
                    # OCR dengan easyocr
                    ocr_result = serial_reader.readtext(enhanced_img, **config)
                    
                    for detection in ocr_result:
                        if len(detection) >= 3:
                            text, confidence = detection[1], detection[2]
                            cleaned_text = clean_serial_text(text)
                            
                            if cleaned_text and len(cleaned_text) >= 6:
                                results.append({
                                    "text": cleaned_text,
                                    "raw_text": text,
                                    "confidence": float(confidence),
                                    "method": f"enhanced_{idx}_config_{ocr_configs.index(config)}",
                                    "length": len(cleaned_text)
                                })
                except Exception as e:
                    print(f"OCR error: {e}")
                    continue
        
        if not results:
            return {"text": "", "confidence": 0.0, "method": "no_results"}
        
        # Filter hasil berdasarkan confidence dan pattern
        valid_results = []
        for result in results:
            text = result["text"]
            
            # Validasi pattern
            is_valid = False
            
            # Cek jika mengandung "SN" atau "Serial"
            if "SN" in text.upper() or "SERIAL" in text.upper():
                is_valid = True
            
            # Cek jika merupakan angka panjang (serial number biasanya panjang)
            if re.match(r'^\d{10,20}$', text):
                is_valid = True
            
            # Cek jika mengandung pola campuran huruf dan angka
            if re.match(r'^[A-Z0-9\-]{8,20}$', text.upper()):
                is_valid = True
            
            if is_valid and result["confidence"] > 0.3:
                valid_results.append(result)
        
        if not valid_results:
            # Ambil hasil dengan confidence tertinggi
            best_result = max(results, key=lambda x: x["confidence"])
            return {
                "text": best_result["text"],
                "confidence": best_result["confidence"],
                "method": best_result["method"]
            }
        
        # Ambil hasil terbaik dari valid results
        best_valid = max(valid_results, key=lambda x: (x["confidence"], x["length"]))
        
        return {
            "text": best_valid["text"],
            "confidence": best_valid["confidence"],
            "method": best_valid["method"]
        }
        
    except Exception as e:
        print(f"Extraction error: {e}")
        return {"text": "", "confidence": 0.0, "method": f"error: {str(e)}"}

def extract_brand_model_info(image_path, bbox):
    """Ekstrak informasi brand dan model dari ROI"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return {"brand": "", "model": "", "info": ""}
        
        x1, y1, x2, y2 = map(int, bbox)
        h, w = img.shape[:2]

        x1 = max(0, x1 - 50)
        y1 = max(0, y1 - 30)
        x2 = min(w, x2 + 50)
        y2 = min(h, y2 + 30)
        
        roi = img[y1:y2, x1:x2]
        
        # Convert ke grayscale
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        
        # Enhance untuk OCR
        enhanced = enhance_image_for_ocr(gray)
        
        # OCR untuk brand/model
        ocr_result = serial_reader.readtext(enhanced, detail=0, paragraph=True)
        full_text = " ".join(ocr_result)
        
        # Deteksi brand
        brands = ["ANVIZ", "DELL", "HP", "LENOVO", "ASUS", "ACER", "SAMSUNG"]
        detected_brand = ""
        
        for brand in brands:
            if brand in full_text.upper():
                detected_brand = brand
                break
        
        # Deteksi model
        model_patterns = [
            r'Model[\s:]*([A-Za-z0-9\s\-]+)',
            r'Firmware[\s:]*([A-Za-z0-9\s\-\.]+)',
            r'FaceDeep[\s]*(\d+)',
        ]
        
        detected_model = ""
        for pattern in model_patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                detected_model = match.group(1).strip()
                break
        
        return {
            "brand": detected_brand,
            "model": detected_model,
            "info": full_text[:200]  # Potong jika terlalu panjang
        }
        
    except Exception as e:
        print(f"Brand extraction error: {e}")
        return {"brand": "", "model": "", "info": ""}

def detect_serial_numbers_from_image(image_path, device_bboxes=None):
    """Deteksi serial numbers dengan akurasi tinggi"""
    try:
        # Inisialisasi model
        model = init_serial_detector()
        
        # Generate unique name untuk hasil
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        result_name = f"serial_{timestamp}_{unique_id}"
        
        # Lakukan prediksi dengan confidence lebih rendah untuk menangkap lebih banyak
        results = model.predict(
            source=image_path,
            save=True,
            project=RESULT_FOLDER,
            name=result_name,
            exist_ok=True,
            conf=0.2,  
            imgsz=1280,  
            augment=True, 
        )
        
        # Path hasil gambar
        result_dir = os.path.join(RESULT_FOLDER, result_name)
        result_image_path = None
        
        if os.path.exists(result_dir):
            files = [f for f in os.listdir(result_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
            if files:
                result_image_path = os.path.join(result_dir, files[0])
        
        # Parse hasil deteksi
        serial_detections = []
        
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                # Ekstrak serial number dengan teknik multiple
                extraction_result = extract_serial_with_multiple_techniques(image_path, bbox)
                
                # Ekstrak brand/model info
                brand_info = extract_brand_model_info(image_path, bbox)
                
                # Validasi serial number
                extracted_text = extraction_result["text"]
                is_valid = False
                
                # Kriteria validasi
                if extracted_text:
                    # Cek panjang
                    if len(extracted_text) >= 6:
                        # Cek pattern
                        if (re.search(r'SN', extracted_text, re.IGNORECASE) or
                            re.search(r'\d{10,}', extracted_text) or
                            re.search(r'[A-Z]{2,}\d{6,}', extracted_text)):
                            is_valid = True
                
                serial_detections.append({
                    "type": cls_name,
                    "confidence": round(confidence, 3),
                    "bbox": bbox,
                    "detected_text": extracted_text,
                    "raw_extraction": extraction_result,
                    "brand_info": brand_info,
                    "is_valid": is_valid,
                    "extraction_method": extraction_result["method"],
                    "extraction_confidence": extraction_result["confidence"]
                })
        
        # Sort berdasarkan confidence
        serial_detections.sort(key=lambda x: x["extraction_confidence"], reverse=True)
        
        return {
            "success": True,
            "serial_detections": serial_detections,
            "result_image_path": result_image_path,
            "total_detected": len(serial_detections),
            "valid_serials": len([s for s in serial_detections if s["is_valid"]]),
            "best_serial": serial_detections[0] if serial_detections else None,
            "message": f"Found {len([s for s in serial_detections if s['is_valid']])} valid serial numbers"
        }
        
    except Exception as e:
        print(f"Serial detection error: {e}")
        return {
            "success": False,
            "serial_detections": [],
            "error": str(e),
            "message": "Failed to detect serial numbers"
        }