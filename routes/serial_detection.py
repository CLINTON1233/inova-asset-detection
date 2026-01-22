from flask import Blueprint, request, jsonify
import os
import base64
import time
import cv2
import numpy as np
from utils.serial_detector import detect_serial_numbers_fast

serial_bp = Blueprint('serial', __name__, url_prefix='/api/serial')

@serial_bp.route('/detect', methods=['POST'])
def detect_serials():
    """Endpoint untuk deteksi serial number dari gambar (file upload)"""
    try:
        print("🔍 Serial detection endpoint called (file upload)")
        
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "message": "No image file provided"
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                "success": False,
                "message": "No selected file"
            }), 400
        
        # Simpan file temporary
        temp_dir = 'temp'
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f'serial_{int(time.time())}.jpg')
        file.save(temp_path)
        
        print(f"📁 Image saved to: {temp_path}")
        
        # Lakukan deteksi serial
        result = detect_serial_numbers_fast(temp_path)
        
        print(f"📊 Detection result: {result.get('success', False)} - {result.get('total_detected', 0)} detected")
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Serial detection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Error processing serial image: {str(e)}"
        }), 500

@serial_bp.route('/detect/camera', methods=['POST'])
def detect_serials_from_camera():
    """Endpoint untuk deteksi serial number dari data kamera (base64)"""
    try:
        print("🔍 Serial camera detection endpoint called")
        
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({
                "success": False,
                "message": "No image data provided"
            }), 400
        
        print("✅ Received image data")
        
        # Decode base64 image
        image_data = data['image_data']
        
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({
                "success": False,
                "message": "Failed to decode image"
            }), 400
        
        # Resize jika terlalu besar untuk kecepatan
        h, w = img.shape[:2]
        if max(h, w) > 800:
            scale = 800 / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
        # Simpan ke file temporary
        temp_dir = 'temp'
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f'serial_camera_{int(time.time())}.jpg')
        cv2.imwrite(temp_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        print(f"📁 Image processed and saved to: {temp_path} ({img.shape})")
        
        # Lakukan deteksi serial
        result = detect_serial_numbers_fast(temp_path)
        
        print(f"📊 Detection complete: {result.get('success', False)} - {result.get('total_detected', 0)} detected")
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Camera serial detection error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Error processing camera serial image: {str(e)}"
        }), 500
        
@serial_bp.route('/assign/<device_id>', methods=['POST'])
def assign_serial_to_device():
    """Assign serial number ke device tertentu"""
    try:
        data = request.get_json()
        
        if not data or 'device_id' not in data or 'serial_number' not in data:
            return jsonify({
                "success": False,
                "message": "device_id and serial_number are required"
            }), 400
        
        # Di sini Anda bisa menyimpan ke database
        # Contoh: update device dengan serial number
        
        return jsonify({
            "success": True,
            "message": f"Serial number assigned to device {data['device_id']}",
            "device_id": data['device_id'],
            "serial_number": data['serial_number']
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@serial_bp.route('/test', methods=['GET'])
def test_serial_detection():
    """Test endpoint untuk serial detection"""
    return jsonify({
        "success": True,
        "message": "Serial detection API is working",
        "endpoints": {
            "POST /api/serial/detect": "Upload image file for serial detection",
            "POST /api/serial/detect/camera": "Send base64 image for serial detection",
            "POST /api/serial/assign/{device_id}": "Assign serial to device",
            "GET /api/serial/test": "Test endpoint"
        }
    })