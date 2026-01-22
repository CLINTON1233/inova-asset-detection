# utils/detector.py - VERSION OPTIMIZED
import os
import cv2
import numpy as np
import uuid
from datetime import datetime
from ultralytics import YOLO
from config import DEVICE_MODEL_PATH, UPLOAD_FOLDER, RESULT_FOLDER, DEVICE_CATEGORIES
import easyocr
import torch

# ==== GLOBAL VARIABLES DENGAN CACHING ====
device_model = None
serial_model = None
ocr_reader = None
device_brands_cache = {}

# ==== INISIALISASI SEKALI SAJA ====
# utils/detector.py - UPDATE init_models
def init_models():
    """Inisialisasi semua model sekali saja saat startup"""
    global device_model, serial_model, ocr_reader
    
    # Device model
    if device_model is None:
        try:
            print(f"🔧 Loading Device YOLO model from: {DEVICE_MODEL_PATH}")
            if not os.path.exists(DEVICE_MODEL_PATH):
                print(f" Model file not found at: {DEVICE_MODEL_PATH}")
                # Fallback ke model YOLO bawaan untuk testing
                device_model = YOLO('yolov8n.pt')  # Model kecil untuk testing
                print("  Using fallback YOLOv8n model")
            else:
                device_model = YOLO(DEVICE_MODEL_PATH)
                device_model.fuse()  # Optimasi model
                print("✅ Device YOLO model loaded and optimized")
        except Exception as e:
            print(f" Failed to load Device YOLO model: {e}")
            # Fallback untuk testing
            try:
                device_model = YOLO('yolov8n.pt')
                print("  Using fallback YOLOv8n model for testing")
            except:
                print(" Cannot load any YOLO model")
    
    # OCR Reader
    if ocr_reader is None:
        try:
            ocr_reader = easyocr.Reader(
                ["en"], 
                gpu=False,  # Nonaktifkan GPU dulu untuk troubleshooting
                model_storage_directory='./easyocr_models',
                download_enabled=True  # Izinkan download otomatis
            )
            print("✅ EasyOCR reader initialized")
        except Exception as e:
            print(f"  EasyOCR initialization error: {e}")
            # Coba tanpa GPU
            try:
                ocr_reader = easyocr.Reader(["en"], gpu=False)
                print("✅ EasyOCR reader initialized without GPU")
            except:
                print(" Cannot initialize EasyOCR")
                ocr_reader = None
    
    return device_model, ocr_reader

# ==== PREPROCESSING OPTIMIZED ====
def preprocess_image_fast(img, target_size=640):
    """Preprocessing cepat untuk inference"""
    # Resize ke ukuran optimal untuk YOLO
    h, w = img.shape[:2]
    scale = target_size / max(h, w)
    
    if scale < 1:
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    return img

def preprocess_for_ocr_fast(img):
    """Preprocessing OCR yang lebih cepat"""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    # CLAHE cepat untuk kontras
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    enhanced = clahe.apply(gray)
    
    # Adaptive threshold cepat
    thresh = cv2.adaptiveThreshold(enhanced, 255, 
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 11, 2)
    
    return thresh

# ==== DETECTION OPTIMIZED ====
# utils/detector.py - PERBAIKI BAGIAN DETECT_DEVICES_FAST
def detect_devices_fast(image_path, conf_threshold=0.25):
    """Deteksi perangkat dengan optimasi kecepatan"""
    try:
        # Inisialisasi model (sekali saja)
        model, _ = init_models()
        
        # Baca gambar
        img = cv2.imread(image_path)
        if img is None:
            return {"success": False, "message": "Failed to read image"}
        
        # Preprocess cepat
        img_processed = preprocess_image_fast(img)
        
        # Simpan temporary untuk inference - PERBAIKI DI SINI
        uuid_str = str(uuid.uuid4())
        temp_path = f"temp_detect_{uuid_str[:8]}.jpg"
        cv2.imwrite(temp_path, img_processed)
        
        # Inference dengan optimasi
        start_time = datetime.now()
        
        # Gunakan device yang tersedia
        device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
        
        results = model.predict(
            source=temp_path,
            save=False,
            conf=conf_threshold,
            imgsz=640,
            augment=False,
            max_det=10,
            verbose=False,
            device=device  
        )
        
        # Hapus file temp
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        inference_time = (datetime.now() - start_time).total_seconds()
        print(f"⚡ Inference time: {inference_time:.3f}s")
        
        # Parse results
        detected_items = []
        
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                confidence = float(box.conf[0])
                
                # Skip jika confidence rendah
                if confidence < conf_threshold:
                    continue
                
                bbox = box.xyxy[0].tolist()
                
                # Tentukan kategori
                category = DEVICE_CATEGORIES.get(cls_name.lower(), "Other")
                
                # Deteksi brand (simplified untuk kecepatan)
                brand = detect_brand_fast(img, bbox, cls_name)
                
                # Generate ID - PERBAIKI DI SINI JUGA
                unique_str = str(uuid.uuid4())
                device_id = f"{cls_name.upper()[:3]}-{unique_str[:6]}"
                
                detected_items.append({
                    "id": device_id,
                    "asset_type": cls_name.capitalize(),
                    "category": category,
                    "brand": brand,
                    "confidence": round(confidence, 3),
                    "confidence_percent": round(confidence * 100, 1),
                    "serial_number": "",
                    "bbox": bbox,
                    "status": "device_detected",
                    "needs_serial_scan": True,
                    "inference_time_ms": round(inference_time * 1000, 2)
                })
        
        # Urutkan berdasarkan confidence
        detected_items.sort(key=lambda x: x["confidence"], reverse=True)
        
        return {
            "success": True,
            "detected_items": detected_items,
            "total_detected": len(detected_items),
            "processing_time_ms": round(inference_time * 1000, 2),
            "message": f"Detected {len(detected_items)} devices in {inference_time:.2f}s"
        }
        
    except Exception as e:
        print(f"Detection error: {e}")
        import traceback
        traceback.print_exc()  # Tambahkan ini untuk debugging detail
        return {
            "success": False,
            "detected_items": [],
            "error": str(e),
            "message": "Failed to detect devices"
        }

def detect_brand_fast(img, bbox, cls_name=""):
    """Deteksi brand yang lebih cepat"""
    try:
        x1, y1, x2, y2 = map(int, bbox)
        h, w = img.shape[:2]
        
        # Validasi bbox
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        if x2 <= x1 or y2 <= y1:
            return "N/A"
        
        # Crop area kecil untuk brand
        crop = img[y1:y2, x1:x2]
        
        if crop.size == 0:
            return "N/A"
        
        # Gunakan cache untuk brand detection
        cache_key = f"{cls_name}_{x1}_{y1}_{x2}_{y2}"
        if cache_key in device_brands_cache:
            return device_brands_cache[cache_key]
        
        # OCR hanya untuk area terbatas
        processed = preprocess_for_ocr_fast(crop)
        
        # OCR dengan timeout
        import threading
        result_text = ""
        
        def ocr_thread():
            nonlocal result_text
            try:
                results = ocr_reader.readtext(processed, detail=0, width_ths=1.0)
                result_text = " ".join(results).lower()[:50]  # Batasi teks
            except:
                pass
        
        thread = threading.Thread(target=ocr_thread)
        thread.start()
        thread.join(timeout=1.0)  # Timeout 1 detik
        
        # Cek brand sederhana
        brands = ["dell", "hp", "lenovo", "asus", "acer", "samsung", "anviz"]
        detected = "N/A"
        
        for b in brands:
            if b in result_text:
                detected = b.upper()
                break
        
        # Cache hasil
        device_brands_cache[cache_key] = detected
        
        return detected
        
    except:
        return "N/A"
    