# utils/database.py
import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG

def get_db_connection():
    """Membuat koneksi ke database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("Database connected successfully")
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None