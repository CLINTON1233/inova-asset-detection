from flask import Blueprint, jsonify, send_file
import os
from config import RESULTS_FOLDER

results_bp = Blueprint('results', __name__, url_prefix='/api/results')

@results_bp.route('/list', methods=['GET'])
def list_results():
    """List semua hasil scanning (hanya gambar)"""
    try:
        if not os.path.exists(RESULTS_FOLDER):
            return jsonify({"success": True, "results": [], "count": 0})
        
        files = []
        for filename in os.listdir(RESULTS_FOLDER):
            if filename.endswith('.jpg'):
                filepath = os.path.join(RESULTS_FOLDER, filename)

                parts = filename.replace('.jpg', '').split('_')
                file_type = parts[0] if len(parts) > 0 else "unknown"
                timestamp = parts[1] if len(parts) > 1 else ""
                
                files.append({
                    "filename": filename,
                    "type": file_type, 
                    "timestamp": timestamp,
                    "full_path": f"/api/results/view/{filename}"
                })
        
        files.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return jsonify({
            "success": True,
            "results": files,
            "count": len(files),
            "folder": RESULTS_FOLDER,
            "note": "JSON files are no longer saved, only images with bounding boxes"
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@results_bp.route('/view/<filename>', methods=['GET'])
def view_result(filename):
    """Lihat gambar hasil scanning dengan bounding box"""
    try:
        filepath = os.path.join(RESULTS_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({"success": False, "message": "File not found"}), 404
        
        return send_file(filepath, mimetype='image/jpeg')
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@results_bp.route('/cleanup', methods=['POST'])
def cleanup_results():
    """Hapus file JSON yang lama (opsional)"""
    try:
        if not os.path.exists(RESULTS_FOLDER):
            return jsonify({"success": True, "message": "No results folder"})
        
        deleted_files = []
        for filename in os.listdir(RESULTS_FOLDER):
            if filename.endswith('.json'):
                filepath = os.path.join(RESULTS_FOLDER, filename)
                os.remove(filepath)
                deleted_files.append(filename)
        
        return jsonify({
            "success": True,
            "message": f"Deleted {len(deleted_files)} JSON files",
            "deleted_files": deleted_files
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500