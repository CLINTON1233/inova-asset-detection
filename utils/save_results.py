import os
import cv2
import json
from datetime import datetime
from config import RESULTS_FOLDER

def ensure_results_folder():
    """Pastikan folder results ada"""
    os.makedirs(RESULTS_FOLDER, exist_ok=True)

def save_device_result(image, result_data, filename_prefix="device"):
    """Simpan hasil deteksi device ke folder results dengan bounding box"""
    try:
        ensure_results_folder()
        
        if not result_data.get("success"):
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}"
        
        # Gambar asli untuk disimpan
        img_to_save = image.copy()
        
        # Draw bounding boxes pada gambar
        if result_data.get("detected_items"):
            for item in result_data.get("detected_items", []):
                bbox = item.get("bbox", [])
                if bbox and len(bbox) >= 4:
                    x1, y1, x2, y2 = map(int, bbox[:4])
                    
                    # Draw rectangle
                    cv2.rectangle(img_to_save, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    
                    # Prepare label
                    asset_type = item.get("asset_type", "Unknown")
                    confidence = item.get("confidence_percent", 0)
                    label = f"{asset_type} {confidence}%"
                    
                    # Calculate text size
                    font = cv2.FONT_HERSHEY_SIMPLEX
                    font_scale = 0.5
                    thickness = 1
                    (text_width, text_height), baseline = cv2.getTextSize(
                        label, font, font_scale, thickness
                    )
                    
                    # Draw background for text
                    cv2.rectangle(
                        img_to_save, 
                        (x1, y1 - text_height - 10), 
                        (x1 + text_width, y1), 
                        (0, 255, 0), 
                        -1
                    )
                    
                    # Put text
                    cv2.putText(
                        img_to_save, 
                        label, 
                        (x1, y1 - 5), 
                        font, 
                        font_scale, 
                        (0, 0, 0), 
                        thickness
                    )
        
        # Simpan gambar dengan bounding box
        img_path = os.path.join(RESULTS_FOLDER, f"{filename}.jpg")
        cv2.imwrite(img_path, img_to_save, [cv2.IMWRITE_JPEG_QUALITY, 90])

        return {
            "image_path": img_path,
            "filename": filename + ".jpg",
            "has_bbox": True,
            "total_items": len(result_data.get("detected_items", []))
        }
        
    except Exception as e:
        print(f"Error saving device result: {e}")
        return None

def save_serial_result(image, result_data, filename_prefix="serial"):
    """Simpan hasil deteksi serial ke folder results dengan bounding box"""
    try:
        ensure_results_folder()
        
        if not result_data.get("success"):
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}"
        
        # Gambar asli untuk disimpan
        img_to_save = image.copy()
        
        # Draw bounding boxes jika ada detections
        detections_added = False
        
        if result_data.get("detections"):
            for detection in result_data.get("detections", []):
                bbox = detection.get("bbox", [])
                if bbox and len(bbox) >= 4:
                    x1, y1, x2, y2 = map(int, bbox[:4])
                    
                    # Draw rectangle
                    cv2.rectangle(img_to_save, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    
                    # Prepare label
                    text = detection.get("text", "")[:15]
                    confidence = detection.get("confidence", 0) * 100
                    label = f"SN: {text} ({confidence:.1f}%)"
                    
                    # Calculate text size
                    font = cv2.FONT_HERSHEY_SIMPLEX
                    font_scale = 0.5
                    thickness = 1
                    (text_width, text_height), baseline = cv2.getTextSize(
                        label, font, font_scale, thickness
                    )
                    
                    # Draw background for text
                    cv2.rectangle(
                        img_to_save, 
                        (x1, y1 - text_height - 10), 
                        (x1 + text_width, y1), 
                        (0, 255, 0), 
                        -1
                    )
                    
                    # Put text
                    cv2.putText(
                        img_to_save, 
                        label, 
                        (x1, y1 - 5), 
                        font, 
                        font_scale, 
                        (0, 0, 0), 
                        thickness
                    )
                    detections_added = True

        img_path = os.path.join(RESULTS_FOLDER, f"{filename}.jpg")
        cv2.imwrite(img_path, img_to_save, [cv2.IMWRITE_JPEG_QUALITY, 90])

        return {
            "image_path": img_path,
            "filename": filename + ".jpg",
            "has_bbox": detections_added,
            "total_serials": len(result_data.get("detections", []))
        }
        
    except Exception as e:
        print(f"Error saving serial result: {e}")
        return None