import os
import cv2
import json
from datetime import datetime
from config import RESULTS_FOLDER

def ensure_results_folder():
    """Pastikan folder results ada"""
    os.makedirs(RESULTS_FOLDER, exist_ok=True)

def save_device_result(image, result_data, filename_prefix="device"):
    """Simpan hasil deteksi device ke folder results"""
    try:
        ensure_results_folder()
        
        if not result_data.get("success"):
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}"
        
        # Simpan gambar
        img_path = os.path.join(RESULTS_FOLDER, f"{filename}.jpg")
        cv2.imwrite(img_path, image)
        
        # Simpan metadata
        metadata = {
            "filename": f"{filename}.jpg",
            "timestamp": timestamp,
            "type": "device_detection",
            "success": result_data.get("success", False),
            "total_detected": result_data.get("total_detected", 0),
            "detected_items": result_data.get("detected_items", []),
            "processing_time_ms": result_data.get("processing_time_ms", 0),
            "message": result_data.get("message", "")
        }
        
        meta_path = os.path.join(RESULTS_FOLDER, f"{filename}.json")
        with open(meta_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return {
            "image_path": img_path,
            "meta_path": meta_path,
            "filename": filename
        }
        
    except Exception as e:
        print(f"Error saving device result: {e}")
        return None

def save_serial_result(image, result_data, filename_prefix="serial"):
    """Simpan hasil deteksi serial ke folder results"""
    try:
        ensure_results_folder()
        
        if not result_data.get("success") or not result_data.get("detections"):
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}"
        
        # Simpan gambar
        img_path = os.path.join(RESULTS_FOLDER, f"{filename}.jpg")
        
        # Draw bounding boxes jika ada detections
        if result_data.get("detections"):
            for detection in result_data.get("detections", []):
                bbox = detection.get("bbox", [])
                if bbox and len(bbox) >= 4:
                    x1, y1, x2, y2 = map(int, bbox[:4])
                    cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    text = detection.get("text", "")[:15]
                    cv2.putText(image, f"SN: {text}", 
                              (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        cv2.imwrite(img_path, image, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        # Simpan metadata
        metadata = {
            "filename": f"{filename}.jpg",
            "timestamp": timestamp,
            "type": "serial_detection",
            "success": result_data.get("success", False),
            "best_serial": result_data.get("best_serial", ""),
            "total_found": result_data.get("total_found", 0),
            "detections": result_data.get("detections", []),
            "processing_time_ms": result_data.get("processing_time_ms", 0),
            "message": result_data.get("message", ""),
            "strategy": result_data.get("strategy", "")
        }
        
        meta_path = os.path.join(RESULTS_FOLDER, f"{filename}.json")
        with open(meta_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return {
            "image_path": img_path,
            "meta_path": meta_path,
            "filename": filename
        }
        
    except Exception as e:
        print(f"Error saving serial result: {e}")
        return None