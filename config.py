# config.py
import os
from dotenv import load_dotenv

load_dotenv()

# Konfigurasi database
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'inova'),
    'user': os.getenv('DB_USER', 'postgres'),
<<<<<<< HEAD
    'password': os.getenv('DB_PASSWORD', '123'),
=======
    'password': os.getenv('DB_PASSWORD', 'Sukses12345'),
>>>>>>> d603377c3649efff82476a492b191763134f19f8
    'port': os.getenv('DB_PORT', '5432')
}

SECRET_KEY = os.getenv('27cdc60e29397b35b746d68e8c55b703267367cf2d084aa9')