import os
import cv2
import uuid
from datetime import datetime
from ultralytics import YOLO
from config import DEVICE_MODEL_PATH, DEVICE_CATEGORIES
import easyocr
import torch

# Cache global
device_model = None
ocr_reader = None
device_brands_cache = {}

# Inisialisasi model
def init_models():
    global device_model, ocr_reader
    
    # Device model
    if device_model is None:
        try:
            device_model = YOLO(DEVICE_MODEL_PATH) if os.path.exists(DEVICE_MODEL_PATH) else YOLO('yolov8n.pt')
            device_model.fuse()
        except:
            device_model = YOLO('yolov8n.pt')
    
    # OCR Reader
    if ocr_reader is None:
        try:
            ocr_reader = easyocr.Reader(["en"], gpu=False)
        except:
            ocr_reader = None
    
    return device_model, ocr_reader

# Preprocessing
def preprocess_image_fast(img, target_size=640):
    h, w = img.shape[:2]
    scale = target_size / max(h, w)
    
    if scale < 1:
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h), cv2.INTER_AREA)
    
    return img

def preprocess_for_ocr_fast(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    enhanced = clahe.apply(gray)
    return cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)

# Deteksi utama
def detect_devices_fast(image_path, conf_threshold=0.25):
    try:
        model, _ = init_models()
        img = cv2.imread(image_path)
        if img is None: return {"success": False, "message": "Failed to read image"}
        
        img_processed = preprocess_image_fast(img)
        temp_path = f"temp_detect_{str(uuid.uuid4())[:8]}.jpg"
        cv2.imwrite(temp_path, img_processed)
        
        start_time = datetime.now()
        device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
        
        results = model.predict(
            source=temp_path, save=False, conf=conf_threshold,
            imgsz=640, augment=False, max_det=10, verbose=False, device=device
        )
        
        if os.path.exists(temp_path): os.remove(temp_path)
        
        inference_time = (datetime.now() - start_time).total_seconds()
        detected_items = []
        
        for r in results:
            for box in r.boxes:
                if float(box.conf[0]) < conf_threshold: continue
                
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                bbox = box.xyxy[0].tolist()
                
                detected_items.append({
                    "id": f"{cls_name.upper()[:3]}-{str(uuid.uuid4())[:6]}",
                    "asset_type": cls_name.capitalize(),
                    "category": DEVICE_CATEGORIES.get(cls_name.lower(), "Other"),
                    "brand": detect_brand_fast(img, bbox, cls_name),
                    "confidence": round(float(box.conf[0]), 3),
                    "confidence_percent": round(float(box.conf[0]) * 100, 1),
                    "serial_number": "",
                    "bbox": bbox,
                    "status": "device_detected",
                    "needs_serial_scan": True,
                    "inference_time_ms": round(inference_time * 1000, 2)
                })
        
        detected_items.sort(key=lambda x: x["confidence"], reverse=True)
        
        return {
            "success": True,
            "detected_items": detected_items,
            "total_detected": len(detected_items),
            "processing_time_ms": round(inference_time * 1000, 2),
            "message": f"Detected {len(detected_items)} devices in {inference_time:.2f}s"
        }
        
    except Exception as e:
        return {"success": False, "detected_items": [], "error": str(e), "message": "Failed to detect devices"}

def detect_brand_fast(img, bbox, cls_name=""):
    try:
        x1, y1, x2, y2 = map(int, bbox)
        h, w = img.shape[:2]
        
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        if x2 <= x1 or y2 <= y1: return "N/A"
        
        cache_key = f"{cls_name}_{x1}_{y1}_{x2}_{y2}"
        if cache_key in device_brands_cache: return device_brands_cache[cache_key]
        
        crop = img[y1:y2, x1:x2]
        if crop.size == 0: return "N/A"
        
        processed = preprocess_for_ocr_fast(crop)
        result_text = " ".join(ocr_reader.readtext(processed, detail=0, width_ths=1.0)).lower()[:50]
        
        brands = ["dell", "hp", "lenovo", "asus", "acer", "samsung", "anviz"]
        detected = next((b.upper() for b in brands if b in result_text), "N/A")
        
        device_brands_cache[cache_key] = detected
        return detected
        
    except:
        return "N/A"
