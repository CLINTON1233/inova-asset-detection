# utils/detector.py
import os
import cv2
import numpy as np
import uuid
from datetime import datetime
from ultralytics import YOLO
from config import YOLO_MODEL_PATH, UPLOAD_FOLDER, RESULT_FOLDER, DEVICE_CATEGORIES
import easyocr

# Inisialisasi model YOLO
model = None
reader = easyocr.Reader(["en"], gpu=False)

# Device brands untuk OCR (diperbarui)
BRANDS = [
    "hp", "dell", "lenovo", "asus", "acer", "samsung", "lg", 
    "philips", "viewsonic", "sony", "benq", "huawei", "msi",
    "logitech", "microsoft", "apple", "cisco", "tp-link",
    "d-link", "canon", "epson", "brother", "toshiba", "fujitsu",
    "ibm", "hitachi", "panasonic", "sharp", "nec", "compaq"
]

def init_detector():
    """Inisialisasi model YOLO"""
    global model
    if model is None:
        try:
            print(f"🔧 Loading YOLO model from: {YOLO_MODEL_PATH}")
            model = YOLO(YOLO_MODEL_PATH)
            print("✅ YOLO model loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load YOLO model: {e}")
            raise
    return model

# ==== OCR Preprocessing ====
def preprocess_for_ocr(img):
    """Preprocess image untuk OCR"""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    # tingkatkan kontras
    gray = cv2.equalizeHist(gray)
    
    # sharpen biar teks jelas
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]])
    sharp = cv2.filter2D(gray, -1, kernel)
    
    # threshold adaptive
    th = cv2.adaptiveThreshold(sharp, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                cv2.THRESH_BINARY, 11, 2)
    
    # noise reduction
    th = cv2.medianBlur(th, 3)
    
    return th

# ==== Deteksi brand dari logo HP ====
def detect_hp_circle(crop):
    """Deteksi logo HP (lingkaran)"""
    if crop is None or crop.size == 0:
        return False
    
    try:
        if len(crop.shape) == 3:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        else:
            gray = crop
        
        blur = cv2.GaussianBlur(gray, (5, 5), 0)

        # deteksi lingkaran via Hough
        circles = cv2.HoughCircles(
            blur,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=30,
            param1=50,
            param2=22,
            minRadius=10,
            maxRadius=40
        )

        return circles is not None
    except:
        return False

# ==== Deteksi brand dari teks ====
def detect_brand_from_image(image_path, bbox, cls_name=""):
    """Deteksi brand dari gambar"""
    try:
        x1, y1, x2, y2 = map(int, bbox)
        img = cv2.imread(image_path)

        if img is None:
            return "Unknown"

        # Pastikan koordinat valid
        height, width = img.shape[:2]
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(width, x2)
        y2 = min(height, y2)
        
        if x2 <= x1 or y2 <= y1:
            return "Unknown"

        crop = img[y1:y2, x1:x2]
        
        if crop.size == 0:
            return "Unknown"

        # ==== SPECIAL HANDLING UNTUK MONITOR ====
        if cls_name.lower() == "monitor":
            h, w = crop.shape[:2]
            if h > 0 and w > 0:
                # ambil 50% area bawah (bezelnya)
                crop = crop[int(h * 0.50):h, :]
                # tambahkan padding agar logo tidak terpotong
                crop = cv2.copyMakeBorder(
                    crop,
                    10, 10, 20, 20,
                    cv2.BORDER_CONSTANT,
                    value=[0, 0, 0]
                )

        # ==== Preprocess sebelum OCR ====
        processed = preprocess_for_ocr(crop)

        # ==== OCR ====
        result = reader.readtext(processed, detail=0)

        text = " ".join(result).lower()
        text = text.replace(" ", "")
        
        if not text:
            # Jika OCR tidak mendapatkan teks, coba deteksi logo HP
            if detect_hp_circle(crop):
                return "HP"
            return "Unknown"

        # ==== cek brand berdasarkan teks ====
        for b in BRANDS:
            if b in text:
                return b.capitalize()

        # ==== fallback khusus HP (logo bulat) ====
        if detect_hp_circle(crop):
            return "HP"

        # Coba cari substring dari brand
        for b in BRANDS:
            if any(b.startswith(t[:3]) for t in text.split() if len(t) >= 3):
                return b.capitalize()

        return "Unknown"
    except Exception as e:
        print(f"Error in brand detection: {e}")
        return "Unknown"

# ==== Fungsi utama deteksi ====
def detect_devices_from_image(image_path):
    """Deteksi perangkat dari gambar menggunakan YOLO"""
    try:
        # Pastikan model sudah diinisialisasi
        model = init_detector()
        
        # Buat folder untuk hasil
        os.makedirs(RESULT_FOLDER, exist_ok=True)
        
        # Generate unique name untuk hasil
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        result_name = f"detection_{timestamp}_{unique_id}"
        
        # Lakukan prediksi
        results = model.predict(
            source=image_path,
            save=True,
            project=RESULT_FOLDER,
            name=result_name,
            exist_ok=True,
            conf=0.25,  # Confidence threshold
            imgsz=640
        )
        
        # Path hasil gambar
        result_dir = os.path.join(RESULT_FOLDER, result_name)
        result_image_path = None
        
        if os.path.exists(result_dir):
            files = [f for f in os.listdir(result_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
            if files:
                result_image_path = os.path.join(result_dir, files[0])
        
        # Parse hasil deteksi
        detected_items = []
        
        for r in results:
            # Get image path from result
            image_path_for_brand = r.path
            
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                # Tentukan kategori berdasarkan mapping
                category = DEVICE_CATEGORIES.get(cls_name.lower(), "Other")
                
                # Deteksi brand untuk semua device
                brand = "N/A"
                # Deteksi brand untuk semua jenis perangkat
                brand = detect_brand_from_image(image_path_for_brand, bbox, cls_name)
                
                # Generate unique ID untuk device
                device_id = f"{cls_name.upper()[:3]}-{unique_id}-{len(detected_items)+1:03d}"
                
                # Format nomor seri berdasarkan brand dan timestamp
                brand_prefix = brand.upper()[:3] if brand != "Unknown" and brand != "N/A" else "UNK"
                serial_number = f"SN-{brand_prefix}-{timestamp}_{unique_id}_{len(detected_items)+1}"
                
                detected_items.append({
                    "id": device_id,
                    "asset_type": cls_name.capitalize(),
                    "category": category,
                    "brand": brand if brand != "Unknown" else "N/A",
                    "confidence": round(confidence, 3),
                    "serial_number": serial_number,
                    "bbox": bbox,
                    "location": "",  # Akan diisi oleh frontend
                    "timestamp": timestamp,
                    "status": "detected"
                })
        
        return {
            "success": True,
            "detected_items": detected_items,
            "result_image_path": result_image_path,
            "original_image_path": image_path,
            "total_detected": len(detected_items),
            "message": f"Berhasil mendeteksi {len(detected_items)} perangkat/material"
        }
        
    except Exception as e:
        print(f"Detection error: {e}")
        return {
            "success": False,
            "detected_items": [],
            "error": str(e),
            "message": "Gagal melakukan deteksi"
        }