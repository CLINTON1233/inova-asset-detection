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
API_PORT = int(os.getenv('API_PORT', '5000'))