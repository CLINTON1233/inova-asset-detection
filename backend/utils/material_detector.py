import os
import cv2
import numpy as np
import uuid
from datetime import datetime
from ultralytics import YOLO
from config import MATERIAL_MODEL_PATH, RESULT_FOLDER
import easyocr

material_model = None
material_reader = easyocr.Reader(["en"], gpu=False)

def init_material_detector():
    global material_model
    if material_model is None:
        print(f"Loading Material YOLO model from: {MATERIAL_MODEL_PATH}")
        material_model = YOLO(MATERIAL_MODEL_PATH)
        print("Material YOLO model loaded successfully")
    return material_model

def detect_materials_from_image(image_path):
    try:
        model = init_material_detector()
        
        os.makedirs(RESULT_FOLDER, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        result_name = f"material_{timestamp}_{unique_id}"
        
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
        
        detected_items = []
        
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                material_id = f"MAT-{unique_id}-{len(detected_items)+1:03d}"
                
                detected_items.append({
                    "id": material_id,
                    "asset_type": cls_name.capitalize(),
                    "category": "Material",
                    "confidence": round(confidence, 3),
                    "scan_code": "",
                    "bbox": bbox,
                    "location": "",
                    "timestamp": timestamp,
                    "status": "material_detected",
                    "needs_scan_code": True
                })
        
        return {
            "success": True,
            "detected_items": detected_items,
            "result_image_path": result_image_path,
            "original_image_path": image_path,
            "total_detected": len(detected_items),
            "message": f"Berhasil mendeteksi {len(detected_items)} material"
        }
        
    except Exception as e:
        print(f"Material detection error: {e}")
        return {
            "success": False,
            "detected_items": [],
            "error": str(e),
            "message": "Gagal melakukan deteksi material"
        }