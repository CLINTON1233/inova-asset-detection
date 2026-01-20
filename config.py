import os
from dotenv import load_dotenv

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

# Konfigurasi YOLO Models
DEVICE_MODEL_PATH = os.getenv('DEVICE_MODEL_PATH', 'models/devices/best.pt')
SERIAL_MODEL_PATH = os.getenv('SERIAL_MODEL_PATH', 'models/serial-number/best.pt')

UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
RESULT_FOLDER = os.getenv('RESULT_FOLDER', 'static/results')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Device categories mapping
DEVICE_CATEGORIES = {
    'monitor': 'Perangkat',
    'laptop': 'Perangkat', 
    'pc': 'Perangkat',
    'keyboard': 'Perangkat',
    'mouse': 'Perangkat',
    'printer': 'Perangkat',
    'router': 'Perangkat',
    'switch': 'Perangkat',
    'server': 'Perangkat',
    'cctv': 'Perangkat',
    'ups': 'Perangkat',
    'projector': 'Perangkat',
    'cable': 'Material',
    'connector': 'Material',
    'adapter': 'Material',
    'rack': 'Material',
    'trunking': 'Material'
}