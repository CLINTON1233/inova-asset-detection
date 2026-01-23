import os
from dotenv import load_dotenv
import torch

load_dotenv()

# Konfigurasi database
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'inova'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'Sukses12345'),
    'port': os.getenv('DB_PORT', '5432')
}

SECRET_KEY = os.getenv('SECRET_KEY', '27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')
API_PORT = int(os.getenv('API_PORT', '5001'))

if torch.cuda.is_available():
    torch.backends.cudnn.benchmark = True
    torch.backends.cudnn.enabled = True
    print(f"CUDA available: {torch.cuda.get_device_name(0)}")
else:
    print("CUDA not available, using CPU")

# Konfigurasi YOLO Models
DEVICE_MODEL_PATH = os.getenv('DEVICE_MODEL_PATH', 'models/devices/best.pt')
SERIAL_MODEL_PATH = os.getenv('SERIAL_MODEL_PATH', 'models/serial-number/best.pt')

#konfigurasi model onnx
DEVICE_ONNX_PATH = os.getenv('DEVICE_ONNX_PATH', 'models/devices/best.onnx')
SERIAL_ONNX_PATH = os.getenv('SERIAL_ONNX_PATH', 'models/serial-number/best.onnx')

UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
RESULTS_FOLDER = os.getenv('RESULTS_FOLDER', 'static/results')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Device categories mapping
DEVICE_CATEGORIES = {
    'laptop': 'Perangkat',
    'monitor': 'Perangkat', 
    'keyboard': 'Perangkat',
    'mouse': 'Perangkat',
    'printer': 'Perangkat',
    'router': 'Perangkat',
    'switch': 'Perangkat',
    'access point': 'Perangkat',
    'server': 'Perangkat',
    'cable': 'Material',
    'adapter': 'Material',
    'docking station': 'Perangkat'
}

MAX_IMAGE_SIZE = (1280, 720)  
JPEG_QUALITY = 85  
CACHE_SIZE = 100 