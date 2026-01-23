from flask import Blueprint, jsonify, send_file
import os
from config import RESULTS_FOLDER

results_bp = Blueprint('results', __name__, url_prefix='/api/results')

@results_bp.route('/list', methods=['GET'])
def list_results():
    """List semua hasil scanning"""
    try:
        if not os.path.exists(RESULTS_FOLDER):
            return jsonify({"success": True, "results": [], "count": 0})
        
        files = []
        for filename in os.listdir(RESULTS_FOLDER):
            if filename.endswith('.jpg'):
                filepath = os.path.join(RESULTS_FOLDER, filename)
                json_file = filename.replace('.jpg', '.json')
                json_path = os.path.join(RESULTS_FOLDER, json_file)
                
                metadata = {}
                if os.path.exists(json_path):
                    import json
                    with open(json_path, 'r') as f:
                        metadata = json.load(f)
                
                files.append({
                    "filename": filename,
                    "type": metadata.get("type", "unknown"),
                    "timestamp": metadata.get("timestamp", ""),
                    "success": metadata.get("success", False),
                    "total_detected": metadata.get("total_detected", metadata.get("total_found", 0))
                })
        
        # Urutkan berdasarkan timestamp (terbaru dulu)
        files.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return jsonify({
            "success": True,
            "results": files,
            "count": len(files),
            "folder": RESULTS_FOLDER
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@results_bp.route('/view/<filename>', methods=['GET'])
def view_result(filename):
    """Lihat gambar hasil scanning"""
    try:
        filepath = os.path.join(RESULTS_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({"success": False, "message": "File not found"}), 404
        
        return send_file(filepath, mimetype='image/jpeg')
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500