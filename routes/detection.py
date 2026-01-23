from flask import Blueprint, request, jsonify
import os
import uuid
import base64
import time
import cv2
import numpy as np
from utils.detector import detect_devices_fast
from utils.serial_detector import detect_serial_numbers as detect_serial_numbers_fast
from utils.serial_detector import detect_serial_fast
from utils.save_results import save_device_result, save_serial_result

detection_bp = Blueprint('detection', __name__, url_prefix='/api')
request_cache = {}
CACHE_TIMEOUT = 5

def cleanup_old_cache():
    current_time = time.time()
    expired = [k for k, (t, _) in request_cache.items() if current_time - t > CACHE_TIMEOUT]
    for k in expired:
        del request_cache[k]

@detection_bp.route('/detect/camera/simple', methods=['POST'])
def detect_from_camera_simple():
    try:
        data = request.get_json()
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data"}), 400
        
        img_data = data['image_data'].split(',')[1] if ',' in data['image_data'] else data['image_data']
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"success": False, "message": "Failed to decode image"}), 400
        
        temp_path = f"temp_simple_{int(time.time())}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        result = detect_devices_fast(temp_path)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@detection_bp.route('/detect/camera', methods=['POST'])
def detect_from_camera_fast():
    try:
        data = request.get_json()
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data"}), 400
        
        cache_key = hash(data['image_data'][:100])
        if cache_key in request_cache:
            cache_time, cached_result = request_cache[cache_key]
            if time.time() - cache_time < CACHE_TIMEOUT:
                return jsonify(cached_result)
        
        img_data = data['image_data'].split(',')[1] if ',' in data['image_data'] else data['image_data']
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"success": False, "message": "Failed to decode image"}), 400
        
        h, w = img.shape[:2]
        if h > 720 or w > 1280:
            scale = min(720/h, 1280/w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), cv2.INTER_AREA)
        
        # Simpan original image untuk results
        img_original = img.copy()
        
        temp_path = f"temp_camera_{int(time.time())}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        result = detect_devices_fast(temp_path)
        
        # Simpan hasil jika berhasil dan ada deteksi
        if result.get("success"):
            # Selalu simpan gambar dengan bounding box
            save_result = save_device_result(img_original, result, "device")
            if save_result:
                result["saved_image"] = save_result["filename"]
                result["has_bbox"] = save_result["has_bbox"]
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        request_cache[cache_key] = (time.time(), result)
        cleanup_old_cache()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@detection_bp.route('/serial/scan/smart', methods=['POST'])
def scan_serial_smart():
    """Smart serial scanning endpoint"""
    try:
        data = request.get_json()
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data"}), 400
        
        img_data = data['image_data'].split(',')[1] if ',' in data['image_data'] else data['image_data']
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"success": False, "message": "Failed to decode image"}), 400
        
        # Simpan original image untuk results
        img_original = img.copy()
        
        temp_path = f"temp_smart_serial_{int(time.time())}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        # Gunakan smart detection
        result = detect_serial_fast(temp_path)
        
        # Selalu simpan gambar (dengan atau tanpa bounding box)
        save_result = save_serial_result(img_original, result, "serial")
        if save_result:
            result["saved_image"] = save_result["filename"]
            result["has_bbox"] = save_result["has_bbox"]
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@detection_bp.route('/detect', methods=['POST'])
def detect_devices():
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image file"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"success": False, "message": "No selected file"}), 400
        
        os.makedirs('temp', exist_ok=True)
        temp_path = f"temp/detect_{int(time.time())}.jpg"
        file.save(temp_path)
        
        result = detect_devices_fast(temp_path)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@detection_bp.route('/serial/detect/camera', methods=['POST'])
def detect_serials_from_camera_fast():
    try:
        data = request.get_json()
        if not data or 'image_data' not in data:
            return jsonify({"success": False, "message": "No image data"}), 400
        
        img_data = data['image_data'].split(',')[1] if ',' in data['image_data'] else data['image_data']
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"success": False, "message": "Failed to decode image"}), 400
        
        if 'crop' in data:
            crop = data['crop']
            img = img[crop['y']:crop['y']+crop['height'], crop['x']:crop['x']+crop['width']]
        
        h, w = img.shape[:2]
        if max(h, w) > 800:
            scale = 800 / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), cv2.INTER_AREA)
        
        temp_path = f"temp_serial_{int(time.time())}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        result = detect_serial_numbers_fast(temp_path)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@detection_bp.route('/detect/test', methods=['GET'])
def test_detection():
    return jsonify({
        "success": True,
        "message": "Detection API is working",
        "endpoints": {
            "POST /api/detect": "Upload image file",
            "POST /api/detect/camera": "Send base64 image",
            "POST /api/serial/detect/camera": "Send base64 for serial",
            "GET /api/detect/test": "Test endpoint"
        },
        "cache_status": f"{len(request_cache)} cached entries"
    })