# routes/detection.py - FIXED VERSION
from flask import Blueprint, request, jsonify
import os
import uuid
import base64
import time
from datetime import datetime
import cv2
import numpy as np
from utils.detector import detect_devices_fast
from utils.serial_detector import detect_serial_numbers_fast

detection_bp = Blueprint('detection', __name__, url_prefix='/api')

# Cache untuk request yang sama 
request_cache = {}
CACHE_TIMEOUT = 5  # detik

def cleanup_old_cache():
    """Bersihkan cache yang sudah expired"""
    global request_cache
    current_time = time.time()
    expired_keys = []
    
    for key, value in request_cache.items():
        cache_time, _ = value
        if current_time - cache_time > CACHE_TIMEOUT:
            expired_keys.append(key)
    
    for key in expired_keys:
        del request_cache[key]
        
# routes/detection.py - TAMBAHKAN FALLBACK
@detection_bp.route('/detect/camera/simple', methods=['POST'])
def detect_from_camera_simple():
    """Endpoint sederhana untuk testing"""
    try:
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({
                "success": False,
                "message": "No image data provided"
            }), 400
        
        # Decode base64
        image_data = data['image_data']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({
                "success": False,
                "message": "Failed to decode image"
            }), 400
        
        # Save temporary
        temp_path = f"temp_simple_{int(time.time())}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        # Coba deteksi normal dulu
        try:
            result = detect_devices_fast(temp_path)
        except Exception as e:
            print(f"Fast detection failed, using simple mode: {e}")
            # Fallback ke simple mode
            from utils.detector import detect_devices_simple
            result = detect_devices_simple(temp_path)
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Simple camera detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Error processing image: {str(e)}"
        }), 500

@detection_bp.route('/detect/camera', methods=['POST'])
def detect_from_camera_fast():
    """Endpoint cepat untuk deteksi dari kamera"""
    try:
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({
                "success": False,
                "message": "No image data provided"
            }), 400
        
        # Generate cache key
        cache_key = hash(data['image_data'][:100])  # Hash dari sebagian image
        
        # Cek cache
        if cache_key in request_cache:
            cache_time, cached_result = request_cache[cache_key]
            if time.time() - cache_time < CACHE_TIMEOUT:
                return jsonify(cached_result)
        
        # Decode base64
        image_data = data['image_data']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({
                "success": False,
                "message": "Failed to decode image"
            }), 400
        
        # Resize untuk kecepatan (max 720p)
        h, w = img.shape[:2]
        if h > 720 or w > 1280:
            scale = min(720/h, 1280/w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), 
                           interpolation=cv2.INTER_AREA)
        
        # Save temporary dengan kualitas lebih rendah
        temp_path = f"temp_camera_{int(time.time())}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        # Deteksi cepat
        result = detect_devices_fast(temp_path)
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
        
        # Cache hasil
        request_cache[cache_key] = (time.time(), result)
        
        # Clean old cache entries
        cleanup_old_cache()
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Fast camera detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Error processing image: {str(e)}"
        }), 500

@detection_bp.route('/detect', methods=['POST'])
def detect_devices():
    """Endpoint untuk deteksi perangkat dari gambar (file upload) - Legacy"""
    try:
        # Cek apakah ada file yang diupload
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "message": "No image file provided"
            }), 400
        
        file = request.files['image']
        
        # Cek jika file kosong
        if file.filename == '':
            return jsonify({
                "success": False,
                "message": "No selected file"
            }), 400
        
        # Simpan file temporary
        temp_dir = 'temp'
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f'detect_{int(time.time())}.jpg')
        file.save(temp_path)
        
        # Deteksi cepat
        result = detect_devices_fast(temp_path)
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Error processing image: {str(e)}"
        }), 500

@detection_bp.route('/serial/detect/camera', methods=['POST'])
def detect_serials_from_camera_fast():
    """Endpoint cepat untuk deteksi serial dari kamera"""
    try:
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({
                "success": False,
                "message": "No image data provided"
            }), 400
        
        # Decode base64
        image_data = data['image_data']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({
                "success": False,
                "message": "Failed to decode image"
            }), 400
        
        # Crop jika ada crop parameters
        if 'crop' in data:
            crop = data['crop']
            x, y, w, h = crop['x'], crop['y'], crop['width'], crop['height']
            img = img[y:y+h, x:x+w]
        
        # Resize untuk kecepatan
        h, w = img.shape[:2]
        if max(h, w) > 800:
            scale = 800 / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), 
                           interpolation=cv2.INTER_AREA)
        
        # Save temporary
        temp_path = f"temp_serial_{int(time.time())}.jpg"
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        # Deteksi serial cepat
        result = detect_serial_numbers_fast(temp_path)
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Fast serial detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Error processing serial image: {str(e)}"
        }), 500

@detection_bp.route('/detect/test', methods=['GET'])
def test_detection():
    """Endpoint untuk test deteksi"""
    return jsonify({
        "success": True,
        "message": "Detection API is working",
        "endpoints": {
            "POST /api/detect": "Upload image file for detection",
            "POST /api/detect/camera": "Send base64 image data for detection",
            "POST /api/serial/detect/camera": "Send base64 image for serial detection",
            "GET /api/detect/test": "Test endpoint"
        },
        "cache_status": f"{len(request_cache)} cached entries"
    })