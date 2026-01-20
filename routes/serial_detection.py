# routes/serial_detection.py
from flask import Blueprint, request, jsonify
import os
import base64
import time
from utils.serial_detector import detect_serial_numbers_from_image

serial_bp = Blueprint('serial', __name__, url_prefix='/api/serial')

@serial_bp.route('/detect', methods=['POST'])
def detect_serials():
    """Endpoint untuk deteksi serial number dari gambar (file upload)"""
    try:
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
        
        # Lakukan deteksi serial
        result = detect_serial_numbers_from_image(temp_path)
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Serial detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Error processing serial image: {str(e)}"
        }), 500

@serial_bp.route('/detect/camera', methods=['POST'])
def detect_serials_from_camera():
    """Endpoint untuk deteksi serial number dari data kamera (base64)"""
    try:
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({
                "success": False,
                "message": "No image data provided"
            }), 400
        
        # Decode base64 image
        image_data = data['image_data']
        
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Simpan ke file temporary
        temp_dir = 'temp'
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f'serial_camera_{int(time.time())}.jpg')
        
        with open(temp_path, 'wb') as f:
            f.write(image_bytes)
        
        # Lakukan deteksi serial
        result = detect_serial_numbers_from_image(temp_path)
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Camera serial detection error: {e}")
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